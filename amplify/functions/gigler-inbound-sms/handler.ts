/**
 * Gigler Inbound SMS Handler (Main Brain)
 *
 * Twilio webhook handler for the Gigler phone number.
 * Handles all inbound SMS/MMS: user identification, onboarding,
 * gig routing, and Gemini AI conversation.
 *
 * Flow:
 * 1. Inbound SMS -> Identify user by phone (GSI lookup)
 * 2. New user? -> Create User record -> Onboarding conversation
 * 3. Existing user, not onboarded? -> Continue onboarding (collect name, first gig)
 * 4. Existing user, onboarded? -> Gemini AI response with conversation history
 */

import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const lambdaClient = new LambdaClient({});

const USER_TABLE_NAME = process.env.USER_TABLE_NAME || "";
const GIG_TABLE_NAME = process.env.GIG_TABLE_NAME || "";
const MESSAGE_TABLE_NAME = process.env.MESSAGE_TABLE_NAME || "";
const GIG_PARTICIPANT_TABLE_NAME = process.env.GIG_PARTICIPANT_TABLE_NAME || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const GIGLER_NUMBER = process.env.GIGLER_NUMBER || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-pro-preview";
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || "";
const GIG_PROCESSOR_FUNCTION_NAME = process.env.GIG_PROCESSOR_FUNCTION_NAME || "";
const MEDIA_PROCESSOR_FUNCTION_NAME = process.env.MEDIA_PROCESSOR_FUNCTION_NAME || "";

const GENERAL_THREAD_ID = "_general";

// ── Structured Tracing ───────────────────────────────────────────────────────

interface TraceContext {
  traceId: string;
  requestId: string;
  source: string;
}

function generateTraceId(): string {
  return `trc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

function maskPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.length > 4 ? `***${phone.slice(-4)}` : phone;
}

function createLogger(ctx: TraceContext & { gigId?: string; userId?: string; phone?: string }) {
  const emit = (level: string, message: string, data?: Record<string, unknown>) => {
    const entry = {
      level, ts: new Date().toISOString(),
      traceId: ctx.traceId, requestId: ctx.requestId, source: ctx.source,
      gigId: ctx.gigId, userId: ctx.userId, phone: maskPhone(ctx.phone),
      message, ...(data && { data }),
    };
    if (level === "ERROR") console.error(JSON.stringify(entry));
    else if (level === "WARN") console.warn(JSON.stringify(entry));
    else console.log(JSON.stringify(entry));
  };
  return {
    info: (msg: string, data?: Record<string, unknown>) => emit("INFO", msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => emit("WARN", msg, data),
    error: (msg: string, data?: Record<string, unknown>) => emit("ERROR", msg, data),
    child: (overrides: Partial<TraceContext & { gigId?: string; userId?: string; phone?: string }>) =>
      createLogger({ ...ctx, ...overrides }),
    tracePayload: (): TraceContext => ({ traceId: ctx.traceId, requestId: ctx.requestId, source: ctx.source }),
  };
}

interface TwilioSmsWebhook {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  FromCity?: string;
  FromState?: string;
  [key: string]: string | undefined;
}

interface User {
  id: string;
  phone: string;
  name?: string;
  plan: string;
  onboardingComplete: boolean;
  timezone?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ── Twilio Webhook Parsing ───────────────────────────────────────────────────

function parseTwilioWebhook(body: string): TwilioSmsWebhook {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries()) as unknown as TwilioSmsWebhook;
}

function extractMediaUrls(webhook: TwilioSmsWebhook): string[] {
  const numMedia = parseInt(webhook.NumMedia || "0", 10);
  const urls: string[] = [];
  for (let i = 0; i < numMedia; i++) {
    const url = webhook[`MediaUrl${i}`];
    if (url) urls.push(url);
  }
  return urls;
}

// ── TwiML Response ───────────────────────────────────────────────────────────

function twimlResponse(message: string): APIGatewayProxyResult {
  const twiml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return {
    statusCode: 200,
    headers: { "Content-Type": "text/xml" },
    body: twiml,
  };
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── SMS Sending ──────────────────────────────────────────────────────────────

async function sendSms(
  to: string,
  message: string,
  from?: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const fromNumber = from || GIGLER_NUMBER;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error("[Gigler] Missing Twilio credentials");
    return { success: false, error: "SMS service not configured" };
  }
  if (!TWILIO_MESSAGING_SERVICE_SID && !fromNumber) {
    console.error("[Gigler] No MessagingServiceSid and no From number");
    return { success: false, error: "SMS service not configured" };
  }

  const params: Record<string, string> = { To: to, Body: message, From: fromNumber };
  if (TWILIO_MESSAGING_SERVICE_SID) {
    params.MessagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params).toString(),
      }
    );

    const data = await response.json();
    if (response.ok) {
      return { success: true, messageSid: data.sid };
    }
    console.error("[Gigler] Twilio error:", data);
    return { success: false, error: data.message || "Failed to send SMS" };
  } catch (error) {
    console.error("[Gigler] SMS send error:", error);
    return { success: false, error: "Network error sending SMS" };
  }
}

const VCARD_URL = "https://gigler.ai/gigler.vcf";

async function sendVcardToNewUser(phone: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return;
  const params: Record<string, string> = {
    To: phone,
    From: GIGLER_NUMBER,
    Body: "Save my contact so you always know it's me! \u2193\ngigler.ai/contact",
    MediaUrl: VCARD_URL,
  };
  if (TWILIO_MESSAGING_SERVICE_SID) {
    params.MessagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
  }
  try {
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params).toString(),
      }
    );
  } catch (error) {
    console.error("[Gigler] Failed to send vCard MMS:", error);
  }
}

// ── DynamoDB Operations ──────────────────────────────────────────────────────

async function lookupUserByPhone(phone: string): Promise<User | null> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: USER_TABLE_NAME,
      IndexName: "byPhone",
      KeyConditionExpression: "phone = :phone",
      ExpressionAttributeValues: { ":phone": phone },
      Limit: 1,
    })
  );
  return (result.Items?.[0] as User) || null;
}

async function createUser(phone: string, fromCity?: string, fromState?: string): Promise<User> {
  const now = new Date().toISOString();
  const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const timezone = guessTimezone(fromState);
  const user: User = {
    id,
    phone,
    plan: "free",
    onboardingComplete: false,
    timezone,
    createdAt: now,
    updatedAt: now,
  };

  await ddb.send(new PutCommand({ TableName: USER_TABLE_NAME, Item: user }));
  console.log(`[Gigler] Created user ${id} for phone ${phone}`);
  return user;
}

async function updateUserName(userId: string, name: string): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: USER_TABLE_NAME,
      Key: { id: userId },
      UpdateExpression: "SET #name = :name, updatedAt = :now",
      ExpressionAttributeNames: { "#name": "name" },
      ExpressionAttributeValues: {
        ":name": name,
        ":now": new Date().toISOString(),
      },
    })
  );
}

async function markOnboardingComplete(userId: string): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: USER_TABLE_NAME,
      Key: { id: userId },
      UpdateExpression: "SET onboardingComplete = :val, updatedAt = :now",
      ExpressionAttributeValues: {
        ":val": true,
        ":now": new Date().toISOString(),
      },
    })
  );
}

async function logMessage(
  gigId: string,
  senderId: string,
  senderName: string,
  body: string,
  direction: "inbound" | "outbound",
  messageType: string = "sms",
  mediaUrls?: string[]
): Promise<void> {
  if (!MESSAGE_TABLE_NAME) return;
  await ddb.send(
    new PutCommand({
      TableName: MESSAGE_TABLE_NAME,
      Item: {
        gigId,
        timestamp: new Date().toISOString(),
        senderId,
        senderName,
        body,
        direction,
        messageType: mediaUrls?.length ? "mms" : messageType,
        mediaUrls: mediaUrls?.length ? mediaUrls : undefined,
      },
    })
  );
}

async function fetchConversationHistory(
  gigId: string,
  limit: number = 20
): Promise<Array<{ role: string; content: string }>> {
  if (!MESSAGE_TABLE_NAME) return [];
  const result = await ddb.send(
    new QueryCommand({
      TableName: MESSAGE_TABLE_NAME,
      KeyConditionExpression: "gigId = :gigId",
      ExpressionAttributeValues: { ":gigId": gigId },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return (result.Items || [])
    .reverse()
    .map((item) => ({
      role: item.direction === "inbound" ? "user" : "ai",
      content: (item.body as string) || "",
    }));
}

async function lookupGigByConversationSid(conversationSid: string): Promise<Record<string, unknown> | null> {
  if (!GIG_TABLE_NAME || !conversationSid) return null;
  const result = await ddb.send(
    new QueryCommand({
      TableName: GIG_TABLE_NAME,
      IndexName: "byConversationSid",
      KeyConditionExpression: "conversationSid = :sid",
      ExpressionAttributeValues: { ":sid": conversationSid },
      Limit: 1,
    })
  );
  return (result.Items?.[0] as Record<string, unknown>) || null;
}

async function lookupGuestParticipation(phone: string): Promise<Array<Record<string, unknown>>> {
  if (!GIG_PARTICIPANT_TABLE_NAME) return [];
  const result = await ddb.send(
    new QueryCommand({
      TableName: GIG_PARTICIPANT_TABLE_NAME,
      IndexName: "byPhone",
      KeyConditionExpression: "phone = :phone",
      ExpressionAttributeValues: { ":phone": phone },
    })
  );
  return (result.Items as Record<string, unknown>[]) || [];
}

async function linkGuestParticipationsToUser(
  participations: Array<Record<string, unknown>>,
  userId: string
): Promise<void> {
  for (const p of participations) {
    if (p.isGuest && !p.userId && p.gigId && p.phone) {
      try {
        await ddb.send(
          new UpdateCommand({
            TableName: GIG_PARTICIPANT_TABLE_NAME,
            Key: { gigId: p.gigId as string, phone: p.phone as string },
            UpdateExpression: "SET userId = :uid, isGuest = :guest",
            ExpressionAttributeValues: {
              ":uid": userId,
              ":guest": false,
            },
          })
        );
        console.log(`[Gigler] Linked guest ${p.phone} -> user ${userId} in gig ${p.gigId}`);
      } catch (err) {
        console.error(`[Gigler] Failed to link guest participation:`, err);
      }
    }
  }
}

// ── Lambda Invocation ────────────────────────────────────────────────────────

async function invokeLambdaAsync(
  functionName: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!functionName) {
    console.warn("[Gigler] Skipping invoke — no function name configured");
    return;
  }
  try {
    await lambdaClient.send(
      new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "Event",
        Payload: new TextEncoder().encode(JSON.stringify(payload)),
      })
    );
    console.log(`[Gigler] Async invoked ${functionName}`);
  } catch (error) {
    console.error(`[Gigler] Failed to invoke ${functionName}:`, error);
  }
}

// ── Active Gig Lookup ────────────────────────────────────────────────────────

interface AnnotatedGig extends Record<string, unknown> {
  userRole: "owner" | "collaborator";
  invitedByName?: string;
}

async function getAllActiveGigsForUser(
  userId: string,
  phone: string
): Promise<AnnotatedGig[]> {
  const ownedResult = await ddb.send(
    new QueryCommand({
      TableName: GIG_TABLE_NAME,
      IndexName: "byOwner",
      KeyConditionExpression: "ownerId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    })
  );
  const ownedGigs: AnnotatedGig[] = (ownedResult.Items || [])
    .filter((g) => g.status === "active")
    .map((g) => ({ ...g, userRole: "owner" as const }));

  const participantResult = await ddb.send(
    new QueryCommand({
      TableName: GIG_PARTICIPANT_TABLE_NAME,
      IndexName: "byPhone",
      KeyConditionExpression: "phone = :ph",
      ExpressionAttributeValues: { ":ph": phone },
    })
  );
  const participations = (participantResult.Items || []).filter(
    (p) => p.role === "collaborator" || p.role === "viewer"
  );

  const ownedGigIds = new Set(ownedGigs.map((g) => g.id as string));

  const participatedGigs: AnnotatedGig[] = [];
  for (const p of participations) {
    const gigId = p.gigId as string;
    if (ownedGigIds.has(gigId)) continue;

    const gigResult = await ddb.send(
      new GetCommand({ TableName: GIG_TABLE_NAME, Key: { id: gigId } })
    );
    const gig = gigResult.Item;
    if (gig && gig.status === "active") {
      let inviterName: string | undefined;
      if (p.invitedBy) {
        const inviterResult = await ddb.send(
          new GetCommand({ TableName: USER_TABLE_NAME, Key: { id: p.invitedBy as string } })
        );
        inviterName = inviterResult.Item?.name as string | undefined;
      }
      participatedGigs.push({
        ...gig,
        userRole: "collaborator" as const,
        invitedByName: inviterName,
      });
    }
  }

  return [...ownedGigs, ...participatedGigs];
}

// ── Timezone Guessing ────────────────────────────────────────────────────────

function guessTimezone(state?: string): string {
  if (!state) return "America/Chicago";
  const eastern = ["NY", "NJ", "PA", "CT", "MA", "MD", "VA", "NC", "SC", "GA", "FL", "OH", "MI", "IN", "ME", "NH", "VT", "RI", "DE", "WV", "KY", "TN", "AL", "DC"];
  const mountain = ["MT", "WY", "CO", "NM", "AZ", "UT", "ID"];
  const pacific = ["WA", "OR", "CA", "NV"];
  const alaska = ["AK"];
  const hawaii = ["HI"];

  const st = state.toUpperCase().trim();
  if (eastern.includes(st)) return "America/New_York";
  if (mountain.includes(st)) return "America/Denver";
  if (pacific.includes(st)) return "America/Los_Angeles";
  if (alaska.includes(st)) return "America/Anchorage";
  if (hawaii.includes(st)) return "Pacific/Honolulu";
  return "America/Chicago";
}

// ── Smart Gig Selection ──────────────────────────────────────────────────────

async function selectGigByContext(
  message: string,
  gigs: AnnotatedGig[]
): Promise<{ gig: AnnotatedGig } | { ambiguous: true; prompt: string }> {
  const gigDescriptions = gigs.map((g, i) => {
    const meta = typeof g.metadata === "string" ? JSON.parse(g.metadata) : (g.metadata || {});
    const lastActive = (meta.lastInteraction as string) || (g.updatedAt as string) || "";
    const role = g.userRole === "owner" ? "owner" : `collaborator${g.invitedByName ? `, invited by ${g.invitedByName}` : ""}`;
    return `${i + 1}. "${g.title}" (${role}) - ${g.type || "general"}, last active: ${lastActive || "unknown"}`;
  }).join("\n");

  const prompt = `Given the user's message and their active gigs, which gig is this message most likely about?
If the message clearly relates to one gig, respond with ONLY the gig number.
If you cannot determine which gig, respond with ONLY the word "ambiguous".

User message: "${message}"

Active gigs:
${gigDescriptions}

Respond with ONLY a single number (1, 2, etc.) or "ambiguous".`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 10, temperature: 0 },
        }),
      }
    );
    const data = await response.json();
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

    const numMatch = text.match(/^(\d+)/);
    if (numMatch) {
      const idx = parseInt(numMatch[1], 10) - 1;
      if (idx >= 0 && idx < gigs.length) {
        return { gig: gigs[idx] };
      }
    }
  } catch (err) {
    console.error("[Gigler] Smart gig selection failed, falling back to disambiguation:", err);
  }

  const disambiguationList = gigs.map((g, i) => {
    const roleLabel = g.userRole === "owner" ? "" : ` (with ${g.invitedByName || "others"})`;
    return `${i + 1}. ${g.title}${roleLabel}`;
  }).join("\n");

  return {
    ambiguous: true,
    prompt: `Which gig is this for?\n\n${disambiguationList}\n\nReply with the number, or tell me something new to create a fresh gig.`,
  };
}

// ── Gemini AI ────────────────────────────────────────────────────────────────

async function callGemini(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return "I'm having trouble connecting right now. Try again in a moment!";
  }

  const contents = [
    ...conversationHistory.map((msg) => ({
      role: msg.role === "ai" ? "model" : "user",
      parts: [{ text: msg.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  try {
    console.log(`[Gigler] Calling Gemini model: ${GEMINI_MODEL} (conversation)`);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.7,
          },
        }),
      }
    );

    const data = await response.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't process that. Try again?";
    return text;
  } catch (error) {
    console.error("[Gigler] Gemini error:", error);
    return "I'm having trouble right now. Try again in a moment!";
  }
}

function repairTruncatedJson(raw: string): Record<string, unknown> | null {
  const partial = raw.match(/\{[\s\S]*/)?.[0];
  if (!partial) return null;
  try {
    const repaired = partial.replace(/,\s*"[^"]*$/, "").replace(/,\s*$/, "");
    const openCount = (repaired.match(/\{/g) || []).length;
    const closeCount = (repaired.match(/\}/g) || []).length;
    const closed = repaired + "}".repeat(Math.max(0, openCount - closeCount));
    return JSON.parse(closed);
  } catch {
    return null;
  }
}

// ── Intent Detection ─────────────────────────────────────────────────────────

type GigType = "coding" | "planning" | "creative" | "professional" | "lifestyle" | "scheduling" | "education" | "business_formation" | "reservations" | "household" | "custom";

interface Intent {
  type: "create_gig" | "list_gigs" | "resume_gig" | "complete_gig" | "pause_gig" | "archive_gig" | "general";
  gigType?: GigType;
  title?: string;
}

async function detectIntent(message: string): Promise<Intent> {
  const lower = message.toLowerCase().trim();

  if (/^(list|my gigs|show gigs|gigs|what.*gigs)/i.test(lower)) {
    return { type: "list_gigs" };
  }

  if (/^(done|finish|complete|close|mark.*done|mark.*complete)\b/i.test(lower)) {
    return { type: "complete_gig" };
  }

  if (/^(pause|hold|freeze|stop)\b/i.test(lower)) {
    return { type: "pause_gig" };
  }

  if (/^(archive|delete|remove|cancel)\b/i.test(lower)) {
    return { type: "archive_gig" };
  }

  if (!GEMINI_API_KEY) {
    return isLikelyGigRequest(lower)
      ? { type: "create_gig", gigType: classifyGigTypeFallback(lower) }
      : { type: "general" };
  }

  try {
    console.log(`[Gigler] Calling Gemini model: ${GEMINI_MODEL} (intent detection)`);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `You classify user messages for Gigler, an SMS-based AI assistant. Respond with ONLY a JSON object, no markdown.

If the user is asking to DO something (plan, build, create, organize, schedule, book, form, etc.), classify as create_gig.
If they're asking about their gigs or listing them, classify as list_gigs.
Otherwise, classify as general.

Gig types: coding, planning, creative, professional, lifestyle, scheduling, education, business_formation, reservations

JSON format: {"type": "create_gig"|"list_gigs"|"general", "gigType": "...", "title": "short title"}`,
            }],
          },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 100, temperature: 0 },
        }),
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (jsonMatch) {
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        console.warn("[Gigler] Intent JSON parse failed, attempting brace repair");
        parsed = repairTruncatedJson(text);
      }
      if (parsed) {
        return {
          type: (parsed.type as Intent["type"]) || "general",
          gigType: parsed.gigType as GigType | undefined,
          title: parsed.title as string | undefined,
        };
      }
    }
  } catch (err) {
    console.error("[Gigler] Intent detection error:", err);
  }

  return isLikelyGigRequest(lower)
    ? { type: "create_gig", gigType: classifyGigTypeFallback(lower) }
    : { type: "general" };
}

function isLikelyGigRequest(msg: string): boolean {
  const actionWords = ["plan", "build", "create", "organize", "schedule", "book", "form", "make", "set up", "design", "draft", "prepare", "arrange", "coordinate", "remind", "help me", "deploy", "scaffold", "generate"];
  return actionWords.some((w) => msg.includes(w));
}

const PRESET_GIG_TYPES: GigType[] = [
  "coding", "planning", "creative", "professional", "lifestyle",
  "scheduling", "education", "business_formation", "reservations", "household",
];

function classifyGigTypeFallback(msg: string): GigType {
  if (/code|website|app|deploy|github|debug|api|database/i.test(msg)) return "coding";
  if (/llc|business|ein|operating agreement|tax id|bank account/i.test(msg)) return "business_formation";
  if (/bill|utilit|rent|electric|water|gas bill|expense|household/i.test(msg)) return "household";
  if (/party|wedding|reunion|trip|event|birthday|graduation/i.test(msg)) return "planning";
  if (/image|photo|video|collage|flyer|design|graphic/i.test(msg)) return "creative";
  if (/legal|contract|resume|consult|mediat/i.test(msg)) return "professional";
  if (/remind|wake|schedule|calendar|habit|meeting/i.test(msg)) return "scheduling";
  if (/meal|move|home|pet|gift|grocery/i.test(msg)) return "lifestyle";
  if (/study|learn|tutor|research|college|exam|language/i.test(msg)) return "education";
  if (/reserv|book|restaurant|hotel|flight|evite|resy|opentable/i.test(msg)) return "reservations";
  return "planning";
}

async function classifyGigWithGemini(msg: string): Promise<{ type: GigType; customPrompt: string | null }> {
  if (!GEMINI_API_KEY) {
    return { type: classifyGigTypeFallback(msg), customPrompt: null };
  }

  const classificationPrompt = `Given this gig request: "${msg}"

Available preset gig types: ${PRESET_GIG_TYPES.join(", ")}

If one of the presets is a strong match, return: {"type": "<preset>", "customPrompt": null}
If none fit well, return: {"type": "custom", "customPrompt": "You are managing a [description] gig. Help the user by:\\n- [specific capability 1]\\n- [specific capability 2]\\n- ...\\n\\nSETUP PHASE: When this gig is first created, collect the following before moving to ongoing management:\\n1. [key info to collect]\\n2. [key info to collect]\\nAsk naturally over 2-3 messages."}

The custom prompt should be tailored to exactly what the user described. Be specific about what actions would be helpful. Include a brief SETUP PHASE section listing 2-4 key things to collect from the user upfront.

Return ONLY valid JSON, no other text.`;

  try {
    const raw = await callGemini(classificationPrompt, msg);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { type: classifyGigTypeFallback(msg), customPrompt: null };

    const parsed = JSON.parse(jsonMatch[0]);
    const gigType = (parsed.type || "planning") as GigType;

    if (gigType === "custom" && parsed.customPrompt) {
      return { type: "custom", customPrompt: parsed.customPrompt };
    }

    if (PRESET_GIG_TYPES.includes(gigType)) {
      return { type: gigType, customPrompt: null };
    }

    return { type: classifyGigTypeFallback(msg), customPrompt: null };
  } catch {
    return { type: classifyGigTypeFallback(msg), customPrompt: null };
  }
}

// ── Gig CRUD ─────────────────────────────────────────────────────────────────

async function createGig(
  user: User,
  title: string,
  gigType: GigType,
  description?: string,
  customPrompt?: string | null
): Promise<{ id: string; title: string }> {
  const now = new Date().toISOString();
  const id = `gig_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const metadata: Record<string, unknown> = {};
  if (customPrompt) metadata.customPrompt = customPrompt;

  await ddb.send(
    new PutCommand({
      TableName: GIG_TABLE_NAME,
      Item: {
        id,
        ownerId: user.id,
        title,
        description: description || title,
        type: gigType,
        status: "active",
        metadata: JSON.stringify(metadata),
        createdAt: now,
        updatedAt: now,
      },
    })
  );

  await ddb.send(
    new PutCommand({
      TableName: GIG_PARTICIPANT_TABLE_NAME,
      Item: {
        gigId: id,
        phone: user.phone,
        userId: user.id,
        role: "owner",
        name: user.name,
        isGuest: false,
        joinedAt: now,
      },
    })
  );

  console.log(`[Gigler] Created gig ${id}: "${title}" (${gigType}) for user ${user.id}`);
  return { id, title };
}

async function handleCreateGig(user: User, message: string, gigType: GigType, mediaUrls: string[] = [], customPrompt?: string | null): Promise<string> {
  const title = await generateGigTitle(message);
  const gig = await createGig(user, title, gigType, message, customPrompt);

  await logMessage(gig.id, user.id, user.name || user.phone, message, "inbound");

  const systemPrompt = `You are Gigler. A user just created a new gig called "${gig.title}" (type: ${gigType}). Their original request was: "${message}".

Respond with:
1. Confirm the gig was created with the title
2. Ask 2-3 clarifying questions to get started
3. Keep it concise and SMS-friendly

Don't use bullet points with dashes. Use simple numbered lists or line breaks.`;

  const aiResponse = await callGemini(systemPrompt, message);
  await logMessage(gig.id, "gigler", "Gigler", aiResponse, "outbound", "ai");

  // Invoke gig-processor async so it can do type-specific follow-up
  await invokeLambdaAsync(GIG_PROCESSOR_FUNCTION_NAME, {
    gigId: gig.id,
    userId: user.id,
    message,
    mediaUrls,
    phone: user.phone,
    senderName: user.name,
    _trace: { traceId: generateTraceId(), requestId: "create-gig", source: "gigler-inbound-sms" },
  });

  // If MMS was included, kick off media download
  if (mediaUrls.length > 0) {
    await invokeLambdaAsync(MEDIA_PROCESSOR_FUNCTION_NAME, {
      action: "download_mms",
      gigId: gig.id,
      userId: user.id,
      mediaUrls,
      phone: user.phone,
      _trace: { traceId: generateTraceId(), requestId: "create-gig-mms", source: "gigler-inbound-sms" },
    });
  }

  return aiResponse;
}

async function generateGigTitle(message: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    return message.substring(0, 50).replace(/[^\w\s]/g, "").trim() || "New Gig";
  }

  try {
    console.log(`[Gigler] Calling Gemini model: ${GEMINI_MODEL} (title generation)`);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "Generate a short, clear title (3-6 words max) for this gig request. Return ONLY the title text, nothing else.",
            }],
          },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 30, temperature: 0.3 },
        }),
      }
    );
    const data = await response.json();
    const title = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return title || message.substring(0, 50).trim();
  } catch {
    return message.substring(0, 50).trim();
  }
}

async function handleListGigs(user: User): Promise<string> {
  const gigs = await getAllActiveGigsForUser(user.id, user.phone);

  if (gigs.length === 0) {
    return `You don't have any active gigs yet, ${user.name || "there"}!\n\nJust tell me what you need and I'll create one. Anything goes.`;
  }

  let response = `Your gigs:\n`;
  gigs.forEach((g, i) => {
    const status = g.status as string;
    const badge = status === "paused" ? " [paused]" : status === "completed" ? " [done]" : "";
    const roleLabel = g.userRole === "owner"
      ? ""
      : g.invitedByName ? ` (with ${g.invitedByName})` : " (collaborator)";
    response += `\n${i + 1}. ${g.title}${roleLabel}${badge}`;
  });
  response += `\n\nText a gig number to resume, or "done 1" to complete a gig.`;

  return response;
}

// ── Gig Status Transitions ──────────────────────────────────────────────────

type GigStatus = "active" | "paused" | "completed" | "archived";

async function updateGigStatus(gigId: string, status: GigStatus): Promise<void> {
  const now = new Date().toISOString();
  const updateExpr = status === "completed"
    ? "SET #status = :status, updatedAt = :now, completedAt = :now"
    : "SET #status = :status, updatedAt = :now";
  const values: Record<string, string> = { ":status": status, ":now": now };

  await ddb.send(
    new UpdateCommand({
      TableName: GIG_TABLE_NAME,
      Key: { id: gigId },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: values,
    })
  );
}

async function handleGigStatusChange(
  user: User,
  fromPhone: string,
  targetStatus: GigStatus,
  body: string
): Promise<string> {
  const activeGigs = await getAllActiveGigsForUser(user.id, fromPhone);
  const statusLabel = targetStatus === "completed" ? "done" : targetStatus;

  if (activeGigs.length === 0) {
    return `You don't have any active gigs to mark as ${statusLabel}.`;
  }

  if (activeGigs.length === 1) {
    const gig = activeGigs[0];
    await updateGigStatus(gig.id as string, targetStatus);
    const emoji = targetStatus === "completed" ? " ✓" : targetStatus === "paused" ? " ⏸" : "";
    return `"${gig.title}" marked as ${statusLabel}!${emoji}\n\nText me anytime to start a new gig.`;
  }

  const numMatch = body.match(/\d+/);
  if (numMatch) {
    const idx = parseInt(numMatch[0], 10) - 1;
    if (idx >= 0 && idx < activeGigs.length) {
      const gig = activeGigs[idx];
      await updateGigStatus(gig.id as string, targetStatus);
      return `"${gig.title}" marked as ${statusLabel}!`;
    }
  }

  const gigList = activeGigs.map((g, i) => {
    const roleLabel = g.userRole === "owner" ? "" : " (collaborator)";
    return `${i + 1}. ${g.title}${roleLabel}`;
  }).join("\n");

  return `Which gig do you want to ${statusLabel}?\n\n${gigList}\n\nReply "${statusLabel} 1", "${statusLabel} 2", etc.`;
}

// ── Onboarding Handlers ─────────────────────────────────────────────────────

async function handleBrandNewUser(
  phone: string,
  fromCity?: string,
  fromState?: string
): Promise<string> {
  const user = await createUser(phone, fromCity, fromState);
  await logMessage(GENERAL_THREAD_ID, user.id, "Gigler", "Welcome to Gigler! Let's create your first Gig.\nWhat's your name?", "outbound", "system");

  sendVcardToNewUser(phone).catch(() => {});

  return "Welcome to Gigler! Let's create your first Gig.\nWhat's your name?";
}

async function handleOnboardingNameCollection(
  user: User,
  messageBody: string
): Promise<string> {
  const name = messageBody.trim().split(/\s+/).slice(0, 3).join(" ");
  if (!name || name.length < 1) {
    return "What should I call you?";
  }

  await updateUserName(user.id, name);
  await markOnboardingComplete(user.id);

  await logMessage(GENERAL_THREAD_ID, user.id, name, messageBody, "inbound");

  const response = `Hey ${name}! To start your first Gig, just tell me what you need.\n\nAnything goes:\n- "Plan a birthday party for next Saturday"\n- "Build me a website for my business"\n- "Remind me to call mom every Sunday at 10am"\n\nWhat can I help with?`;

  await logMessage(GENERAL_THREAD_ID, "gigler", "Gigler", response, "outbound", "ai");
  return response;
}

// ── Main Handler ─────────────────────────────────────────────────────────────

export const handler: APIGatewayProxyHandler = async (event, context) => {
  const log = createLogger({
    traceId: generateTraceId(),
    requestId: context.awsRequestId,
    source: "gigler-inbound-sms",
  });
  log.info("Inbound SMS event received");

  try {
    const rawBody = event.body || "";
    const decodedBody = (event as unknown as { isBase64Encoded?: boolean }).isBase64Encoded
      ? Buffer.from(rawBody, "base64").toString("utf8")
      : rawBody;
    const webhook = parseTwilioWebhook(decodedBody);
    const { From: fromPhone, Body: messageBody } = webhook;

    if (!fromPhone) {
      return twimlResponse("");
    }

    const body = (messageBody || "").trim();
    const mediaUrls = extractMediaUrls(webhook);

    log.info("Parsed webhook", {
      phone: maskPhone(fromPhone), bodyPreview: body.substring(0, 100),
      mediaCount: mediaUrls.length, messageSid: webhook.MessageSid,
    });

    // Step 1: Identify user by phone
    const user = await lookupUserByPhone(fromPhone);

    // Step 2: Brand new user -- never seen before
    if (!user) {
      log.info("New user — starting onboarding", { phone: maskPhone(fromPhone) });
      const response = await handleBrandNewUser(fromPhone, webhook.FromCity, webhook.FromState);
      return twimlResponse(response);
    }

    // Enrich logger with user context for all subsequent logs
    const ulog = log.child({ userId: user.id, phone: fromPhone });

    // Step 3: User exists but hasn't completed onboarding (waiting for name)
    if (!user.onboardingComplete) {
      ulog.info("Onboarding — collecting name");
      const response = await handleOnboardingNameCollection(user, body);
      return twimlResponse(response);
    }

    // Step 4: Check for guest participation and handle viral conversion
    const guestParticipations = await lookupGuestParticipation(fromPhone);
    const isKnownGuest = guestParticipations.some((p) => p.isGuest === true);
    if (isKnownGuest) {
      ulog.info("Linking guest participations", { guestCount: guestParticipations.length });
      await linkGuestParticipationsToUser(guestParticipations, user.id);
    }

    // Step 5: Intent detection -- classify message before AI response
    const intent = await detectIntent(body);
    ulog.info("Intent detected", { intent: intent.type, gigType: intent.gigType });

    // Step 6: Route by intent
    if (intent.type === "list_gigs") {
      const response = await handleListGigs(user);
      await sendSms(fromPhone, response);
      return twimlResponse("");
    }

    if (intent.type === "create_gig") {
      const classification = await classifyGigWithGemini(body);
      const response = await handleCreateGig(user, body, classification.type, mediaUrls, classification.customPrompt);
      await sendSms(fromPhone, response);
      return twimlResponse("");
    }

    if (intent.type === "complete_gig") {
      const response = await handleGigStatusChange(user, fromPhone, "completed", body);
      await sendSms(fromPhone, response);
      return twimlResponse("");
    }

    if (intent.type === "pause_gig") {
      const response = await handleGigStatusChange(user, fromPhone, "paused", body);
      await sendSms(fromPhone, response);
      return twimlResponse("");
    }

    if (intent.type === "archive_gig") {
      const response = await handleGigStatusChange(user, fromPhone, "archived", body);
      await sendSms(fromPhone, response);
      return twimlResponse("");
    }

    // Step 6b: Fetch all gigs (owned + participating)
    const activeGigs = await getAllActiveGigsForUser(user.id, fromPhone);

    // If user texts a single number, treat it as gig selection from list
    const gigSelectionMatch = body.match(/^(\d+)$/);
    if (gigSelectionMatch && activeGigs.length > 0) {
      const idx = parseInt(gigSelectionMatch[1], 10) - 1;
      if (idx >= 0 && idx < activeGigs.length) {
        const selectedGig = activeGigs[idx];
        const glog = ulog.child({ gigId: selectedGig.id as string });
        glog.info("User selected gig from list", { gigIndex: idx + 1, gigTitle: selectedGig.title });
        await invokeLambdaAsync(GIG_PROCESSOR_FUNCTION_NAME, {
          gigId: selectedGig.id as string,
          userId: user.id,
          message: `I'd like to continue working on this gig.`,
          phone: fromPhone,
          senderName: user.name,
          _trace: glog.tracePayload(),
        });
        await sendSms(fromPhone, `Resuming "${selectedGig.title}"! What would you like to do?`);
        return twimlResponse("");
      }
    }

    // Smart gig routing for general messages
    if (activeGigs.length >= 1 && intent.type === "general") {
      let targetGig: AnnotatedGig;

      if (activeGigs.length === 1) {
        targetGig = activeGigs[0];
        const glog = ulog.child({ gigId: targetGig.id as string });
        glog.info("Auto-routing to only active gig", {
          gigTitle: targetGig.title, userRole: targetGig.userRole,
        });
      } else {
        ulog.info("Multiple active gigs, using smart selection", { gigCount: activeGigs.length });
        const selection = await selectGigByContext(body, activeGigs);

        if ("ambiguous" in selection) {
          ulog.info("Gig selection ambiguous, asking user to pick");
          await sendSms(fromPhone, selection.prompt);
          return twimlResponse("");
        }
        targetGig = selection.gig;
        ulog.info("Smart selection chose gig", {
          gigId: targetGig.id, gigTitle: targetGig.title, userRole: targetGig.userRole,
        });
      }

      const glog = ulog.child({ gigId: targetGig.id as string });
      await invokeLambdaAsync(GIG_PROCESSOR_FUNCTION_NAME, {
        gigId: targetGig.id as string,
        userId: user.id,
        message: body,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        phone: fromPhone,
        senderName: user.name,
        _trace: glog.tracePayload(),
      });

      if (mediaUrls.length > 0) {
        glog.info("Invoking media-processor for MMS download", { urlCount: mediaUrls.length });
        await invokeLambdaAsync(MEDIA_PROCESSOR_FUNCTION_NAME, {
          action: "download_mms",
          gigId: targetGig.id as string,
          userId: user.id,
          mediaUrls,
          phone: fromPhone,
          _trace: glog.tracePayload(),
        });
      }

      return twimlResponse("");
    }

    // Step 7: Default — general conversation with Gemini (no active gigs)
    await logMessage(GENERAL_THREAD_ID, user.id, user.name || fromPhone, body, "inbound", mediaUrls.length > 0 ? "mms" : "sms", mediaUrls);
    const history = await fetchConversationHistory(GENERAL_THREAD_ID, 20);
    const systemPrompt = buildSystemPrompt(user, isKnownGuest);
    const aiResponse = await callGemini(systemPrompt, body, history);

    await logMessage(GENERAL_THREAD_ID, "gigler", "Gigler", aiResponse, "outbound", "ai");
    await sendSms(fromPhone, aiResponse);

    // Download MMS media even in general conversation
    if (mediaUrls.length > 0) {
      ulog.info("Invoking media-processor for general MMS", { urlCount: mediaUrls.length });
      await invokeLambdaAsync(MEDIA_PROCESSOR_FUNCTION_NAME, {
        action: "download_mms",
        gigId: GENERAL_THREAD_ID,
        userId: user.id,
        mediaUrls,
        phone: fromPhone,
        _trace: ulog.tracePayload(),
      });
    }

    return twimlResponse("");
  } catch (error) {
    log.error("Handler error", { error: String(error) });
    return twimlResponse("Something went wrong. Try again in a moment!");
  }
};

function buildSystemPrompt(user: User, isKnownGuest: boolean): string {
  let prompt = `You are Gigler, an AI assistant that lives in text messages. Your voice is simple, non-pretentious, and action-oriented. You help people get things done by creating and managing Gigs — projects, tasks, anything they need. You're the anti-app: no downloads, no dashboards required. Just text.

The user's name is ${user.name || "there"}. They are on the ${user.plan || "free"} plan.

Keep responses concise and SMS-friendly (under 320 characters when possible). Be helpful, direct, and warm.

You can help with:
- Event planning (parties, weddings, road trips, reunions)
- Coding & tech (build websites, deploy apps, debug code)
- Business formation (LLC, bank accounts, operating agreements)
- Creative work (AI images, videos, photo collages, flyers)
- Professional advisory (legal review, business consulting, resume writing)
- Scheduling (reminders, wake-up calls, habit tracking, calendar)
- Lifestyle (meal planning, moving help, gift shopping)
- Education (study plans, language practice, research)
- Reservations (restaurants, hotels, flights, events)

When the user asks you to do something actionable, suggest creating a Gig for it. Say something like: "Want me to create a Gig for that? I'll track everything and keep you updated."

When they say "list my gigs" or "my gigs", list their active gigs.`;

  if (isKnownGuest) {
    prompt += `\n\nThis user was previously a guest in someone else's gig. They've now texted the main Gigler number directly. Welcome them warmly and offer to set up their own gigs.`;
  }

  return prompt;
}
