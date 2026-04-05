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
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const USER_TABLE_NAME = process.env.USER_TABLE_NAME || "";
const GIG_TABLE_NAME = process.env.GIG_TABLE_NAME || "";
const MESSAGE_TABLE_NAME = process.env.MESSAGE_TABLE_NAME || "";
const GIG_PARTICIPANT_TABLE_NAME = process.env.GIG_PARTICIPANT_TABLE_NAME || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const GIGLER_NUMBER = process.env.GIGLER_NUMBER || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const GENERAL_THREAD_ID = "_general";

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
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !fromNumber) {
    console.error("[Gigler] Missing Twilio credentials");
    return { success: false, error: "SMS service not configured" };
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
        body: new URLSearchParams({
          From: fromNumber,
          To: to,
          Body: message,
        }).toString(),
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
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: {
            maxOutputTokens: 400,
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

// ── Intent Detection ─────────────────────────────────────────────────────────

type GigType = "coding" | "planning" | "creative" | "professional" | "lifestyle" | "scheduling" | "education" | "business_formation" | "reservations";

interface Intent {
  type: "create_gig" | "list_gigs" | "resume_gig" | "general";
  gigType?: GigType;
  title?: string;
}

async function detectIntent(message: string): Promise<Intent> {
  const lower = message.toLowerCase().trim();

  if (/^(list|my gigs|show gigs|gigs|what.*gigs)/i.test(lower)) {
    return { type: "list_gigs" };
  }

  if (!GEMINI_API_KEY) {
    return isLikelyGigRequest(lower)
      ? { type: "create_gig", gigType: classifyGigType(lower) }
      : { type: "general" };
  }

  try {
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
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        type: parsed.type || "general",
        gigType: parsed.gigType,
        title: parsed.title,
      };
    }
  } catch (err) {
    console.error("[Gigler] Intent detection error:", err);
  }

  return isLikelyGigRequest(lower)
    ? { type: "create_gig", gigType: classifyGigType(lower) }
    : { type: "general" };
}

function isLikelyGigRequest(msg: string): boolean {
  const actionWords = ["plan", "build", "create", "organize", "schedule", "book", "form", "make", "set up", "design", "draft", "prepare", "arrange", "coordinate", "remind", "help me", "deploy", "scaffold", "generate"];
  return actionWords.some((w) => msg.includes(w));
}

function classifyGigType(msg: string): GigType {
  if (/code|website|app|deploy|github|debug|api|database/i.test(msg)) return "coding";
  if (/llc|business|ein|operating agreement|tax id|bank account/i.test(msg)) return "business_formation";
  if (/party|wedding|reunion|trip|event|birthday|graduation/i.test(msg)) return "planning";
  if (/image|photo|video|collage|flyer|design|graphic/i.test(msg)) return "creative";
  if (/legal|contract|resume|consult|mediat/i.test(msg)) return "professional";
  if (/remind|wake|schedule|calendar|habit|meeting/i.test(msg)) return "scheduling";
  if (/meal|move|home|pet|gift|grocery/i.test(msg)) return "lifestyle";
  if (/study|learn|tutor|research|college|exam|language/i.test(msg)) return "education";
  if (/reserv|book|restaurant|hotel|flight|evite|resy|opentable/i.test(msg)) return "reservations";
  return "planning";
}

// ── Gig CRUD ─────────────────────────────────────────────────────────────────

async function createGig(
  user: User,
  title: string,
  gigType: GigType,
  description?: string
): Promise<{ id: string; title: string }> {
  const now = new Date().toISOString();
  const id = `gig_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

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
        metadata: JSON.stringify({}),
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

async function handleCreateGig(user: User, message: string, gigType: GigType): Promise<string> {
  const title = await generateGigTitle(message);
  const gig = await createGig(user, title, gigType, message);

  await logMessage(gig.id, user.id, user.name || user.phone, message, "inbound");

  const systemPrompt = `You are Gigler. A user just created a new gig called "${gig.title}" (type: ${gigType}). Their original request was: "${message}".

Respond with:
1. Confirm the gig was created with the title
2. Ask 2-3 clarifying questions to get started
3. Keep it concise and SMS-friendly

Don't use bullet points with dashes. Use simple numbered lists or line breaks.`;

  const aiResponse = await callGemini(systemPrompt, message);
  await logMessage(gig.id, "gigler", "Gigler", aiResponse, "outbound", "ai");

  return aiResponse;
}

async function generateGigTitle(message: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    return message.substring(0, 50).replace(/[^\w\s]/g, "").trim() || "New Gig";
  }

  try {
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
  const result = await ddb.send(
    new QueryCommand({
      TableName: GIG_TABLE_NAME,
      IndexName: "byOwner",
      KeyConditionExpression: "ownerId = :uid",
      ExpressionAttributeValues: { ":uid": user.id },
    })
  );

  const gigs = (result.Items || []).filter((g) => g.status === "active");

  if (gigs.length === 0) {
    return `You don't have any active gigs yet, ${user.name || "there"}!\n\nJust tell me what you need and I'll create one. Anything goes.`;
  }

  let response = `Your active gigs:\n`;
  gigs.forEach((g, i) => {
    response += `\n${i + 1}. ${g.title}`;
    if (g.type) response += ` (${(g.type as string).replace("_", " ")})`;
  });
  response += `\n\nText a gig number to resume it, or tell me something new to create a fresh gig.`;

  return response;
}

// ── Onboarding Handlers ─────────────────────────────────────────────────────

async function handleBrandNewUser(
  phone: string,
  fromCity?: string,
  fromState?: string
): Promise<string> {
  const user = await createUser(phone, fromCity, fromState);
  await logMessage(GENERAL_THREAD_ID, user.id, "Gigler", "Welcome to Gigler! Let's create your first Gig.\nWhat's your name?", "outbound", "system");
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

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("[Gigler] Inbound SMS event received");

  try {
    const webhook = parseTwilioWebhook(event.body || "");
    const { From: fromPhone, Body: messageBody } = webhook;

    if (!fromPhone) {
      return twimlResponse("");
    }

    const body = (messageBody || "").trim();
    const mediaUrls = extractMediaUrls(webhook);

    console.log(`[Gigler] From: ${fromPhone}, Body: ${body.substring(0, 100)}, Media: ${mediaUrls.length}`);

    // Step 1: Identify user by phone
    const user = await lookupUserByPhone(fromPhone);

    // Step 2: Brand new user -- never seen before
    if (!user) {
      console.log(`[Gigler] New user: ${fromPhone}`);
      const response = await handleBrandNewUser(fromPhone, webhook.FromCity, webhook.FromState);
      return twimlResponse(response);
    }

    // Step 3: User exists but hasn't completed onboarding (waiting for name)
    if (!user.onboardingComplete) {
      console.log(`[Gigler] Onboarding user ${user.id}: collecting name`);
      const response = await handleOnboardingNameCollection(user, body);
      return twimlResponse(response);
    }

    // Step 4: Check for guest participation and handle viral conversion
    const guestParticipations = await lookupGuestParticipation(fromPhone);
    const isKnownGuest = guestParticipations.some((p) => p.isGuest === true);
    if (isKnownGuest) {
      await linkGuestParticipationsToUser(guestParticipations, user.id);
    }

    // Step 5: Intent detection -- classify message before AI response
    const intent = await detectIntent(body);
    console.log(`[Gigler] Intent: ${intent.type}`);

    // Step 6: Route by intent
    if (intent.type === "list_gigs") {
      const response = await handleListGigs(user);
      await sendSms(fromPhone, response);
      return twimlResponse("");
    }

    if (intent.type === "create_gig") {
      const response = await handleCreateGig(user, body, intent.gigType || "planning");
      await sendSms(fromPhone, response);
      return twimlResponse("");
    }

    // Step 7: Default -- general conversation with Gemini
    await logMessage(GENERAL_THREAD_ID, user.id, user.name || fromPhone, body, "inbound", mediaUrls.length > 0 ? "mms" : "sms", mediaUrls);
    const history = await fetchConversationHistory(GENERAL_THREAD_ID, 20);
    const systemPrompt = buildSystemPrompt(user, isKnownGuest);
    const aiResponse = await callGemini(systemPrompt, body, history);

    await logMessage(GENERAL_THREAD_ID, "gigler", "Gigler", aiResponse, "outbound", "ai");
    await sendSms(fromPhone, aiResponse);

    return twimlResponse("");
  } catch (error) {
    console.error("[Gigler] Handler error:", error);
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
