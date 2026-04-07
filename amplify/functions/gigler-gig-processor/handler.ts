/**
 * Gigler Gig Processor (AI Execution Engine)
 *
 * Receives a message + gig context from gigler-inbound-sms.
 * Uses Gemini to understand and act based on gig type.
 * Can trigger deliverable generation, media processing,
 * reminders, and third-party actions.
 *
 * Invoked via direct Lambda invocation (not HTTP).
 * Event payload: { gigId, userId, message, mediaUrls?, phone }
 */

import type { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const lambdaClient = new LambdaClient({});

const GIG_TABLE_NAME = process.env.GIG_TABLE_NAME || "";
const MESSAGE_TABLE_NAME = process.env.MESSAGE_TABLE_NAME || "";
const DELIVERABLE_TABLE_NAME = process.env.DELIVERABLE_TABLE_NAME || "";
const REMINDER_TABLE_NAME = process.env.REMINDER_TABLE_NAME || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-pro-preview";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const GIGLER_NUMBER = process.env.GIGLER_NUMBER || "";
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || "";
const MEDIA_PROCESSOR_FUNCTION_NAME = process.env.MEDIA_PROCESSOR_FUNCTION_NAME || "";
const DELIVERABLE_GENERATOR_FUNCTION_NAME = process.env.DELIVERABLE_GENERATOR_FUNCTION_NAME || "";
const THIRD_PARTY_ACTIONS_FUNCTION_NAME = process.env.THIRD_PARTY_ACTIONS_FUNCTION_NAME || "";

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
    tracePayload: (): TraceContext => ({ traceId: ctx.traceId, requestId: ctx.requestId, source: ctx.source }),
  };
}

interface GigProcessorEvent {
  gigId: string;
  userId: string;
  message: string;
  mediaUrls?: string[];
  phone: string;
  senderName?: string;
  _trace?: TraceContext;
}

interface Gig {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  metadata?: string;
  createdAt?: string;
}

interface GigAction {
  type: "generate_image" | "create_deliverable" | "set_reminder" | "book_reservation";
  prompt?: string;
  deliverableType?: string;
  title?: string;
  content?: string;
  scheduledAt?: string;
  reminderMessage?: string;
  channel?: string;
  platform?: string;
  params?: Record<string, unknown>;
}

// ── Lambda Invocation ────────────────────────────────────────────────────────

async function invokeLambdaAsync(
  functionName: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!functionName) {
    console.warn("[GigProcessor] Skipping invoke — no function name configured");
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
    console.log(`[GigProcessor] Async invoked ${functionName}`);
  } catch (error) {
    console.error(`[GigProcessor] Failed to invoke ${functionName}:`, error);
  }
}

// ── AI Response Parsing ──────────────────────────────────────────────────────

function parseAiResponse(raw: string): { userText: string; actions: GigAction[] } {
  const marker = "ACTION_JSON:";
  const markerIdx = raw.indexOf(marker);

  if (markerIdx === -1) {
    return { userText: raw.trim(), actions: [] };
  }

  const userText = raw.substring(0, markerIdx).trim();
  const jsonStr = raw.substring(markerIdx + marker.length).trim();

  try {
    const parsed = JSON.parse(jsonStr);
    const actions: GigAction[] = Array.isArray(parsed) ? parsed : [];
    return { userText, actions };
  } catch {
    console.warn("[GigProcessor] ACTION_JSON parse failed, attempting brace repair");
    const repaired = repairTruncatedJson(jsonStr);
    if (repaired) {
      const actions: GigAction[] = Array.isArray(repaired) ? repaired : [];
      return { userText, actions };
    }
    return { userText: userText || raw.trim(), actions: [] };
  }
}

// ── Action Execution ─────────────────────────────────────────────────────────

async function executeActions(
  actions: GigAction[],
  ctx: { gigId: string; userId: string; phone: string },
  trace: TraceContext
): Promise<void> {
  for (const action of actions) {
    switch (action.type) {
      case "generate_image":
        await invokeLambdaAsync(MEDIA_PROCESSOR_FUNCTION_NAME, {
          action: "generate_image",
          gigId: ctx.gigId, userId: ctx.userId,
          prompt: action.prompt || "", phone: ctx.phone,
          _trace: trace,
        });
        break;

      case "create_deliverable":
        await invokeLambdaAsync(DELIVERABLE_GENERATOR_FUNCTION_NAME, {
          gigId: ctx.gigId, userId: ctx.userId,
          type: action.deliverableType || "website",
          title: action.title || "Untitled",
          content: action.content || "", phone: ctx.phone,
          _trace: trace,
        });
        break;

      case "set_reminder":
        if (action.scheduledAt) {
          await createReminder({
            gigId: ctx.gigId, userId: ctx.userId,
            scheduledAt: action.scheduledAt, type: "reminder",
            message: action.reminderMessage || "Reminder from your gig",
            channel: action.channel || "sms",
            recipients: [ctx.phone],
          });
        }
        break;

      case "book_reservation":
        await invokeLambdaAsync(THIRD_PARTY_ACTIONS_FUNCTION_NAME, {
          gigId: ctx.gigId, userId: ctx.userId,
          platform: action.platform || "opentable",
          actionType: "search", params: action.params || {},
          phone: ctx.phone, _trace: trace,
        });
        break;
    }
  }
}

// ── Type-specific system prompts ─────────────────────────────────────────────

const GIG_TYPE_PROMPTS: Record<string, string> = {
  planning: `You are managing an event planning gig. Help the user plan their event by:
- Managing checklists (venue, catering, decorations, invites, etc.)
- Coordinating with participants in the group thread
- Setting reminders for deadlines
- Suggesting vendors and services
- Collecting and organizing photos
- Creating deliverables (invitations, itineraries, photo collages)
When the user mentions adding someone, offer to add them to the gig thread.`,

  coding: `You are managing a coding/tech gig. Help the user by:
- Understanding their requirements and proposing architecture
- Generating code and project scaffolds
- Helping debug errors (user may paste stack traces)
- Setting up deployments (suggest Vercel, Amplify, etc.)
- Creating GitHub repos with proper structure
When code is ready, offer to deploy it and provide a live URL as a deliverable.`,

  business_formation: `You are managing a business formation gig. Guide the user step-by-step:
- Name availability search
- Articles of organization / Certificate of Formation
- EIN application with the IRS
- Operating agreement drafting
- Business bank account setup
- State tax ID registration
- Business email and domain setup
Track progress as a checklist. Generate legal documents as PDF deliverables.`,

  creative: `You are managing a creative/media gig. Help the user by:
- Understanding what they want to create (images, videos, collages, flyers)
- Generating AI images based on their descriptions
- Creating photo collages from uploaded photos
- Designing PDF flyers and invitations
- Editing and enhancing photos
When generating media, describe what you're creating and offer variations.`,

  professional: `You are managing a professional/advisory gig. Help the user by:
- Reviewing documents they send (contracts, legal docs, etc.)
- Providing business consulting and strategy advice
- Drafting professional documents (resumes, cover letters, proposals)
- Offering negotiation guidance
- Mediating between parties if this is a group thread
Provide clear, actionable advice. Generate documents as PDF deliverables.`,

  scheduling: `You are managing a scheduling/productivity gig. Help the user by:
- Setting up reminders (daily, weekly, one-time)
- Managing wake-up calls with day briefings
- Tracking habits with daily check-ins
- Calendar management
- Meeting preparation briefings
Be proactive about suggesting recurring reminders.`,

  lifestyle: `You are managing a lifestyle/personal gig. Help the user by:
- Creating meal plans and grocery lists
- Managing moving checklists (utilities, address changes, etc.)
- Tracking home renovation projects
- Setting pet care reminders
- Finding and recommending gifts
Be practical and organized. Create checklists and track progress.`,

  education: `You are managing an education/learning gig. Help the user by:
- Creating structured study plans with daily topics
- Sending practice questions and vocabulary drills
- Summarizing research materials
- Tracking progress through a study schedule
- Coordinating with study groups in group threads
Send daily check-ins and practice content proactively.`,

  reservations: `You are managing a reservations/booking gig. Help the user by:
- Searching for availability (restaurants, hotels, flights)
- Presenting options clearly
- Confirming EVERY booking with the user before executing
- Tracking confirmation numbers and details
- Setting reminders for upcoming reservations
ALWAYS confirm before taking any action. Present options as numbered choices.`,
};

// ── Conversation History ─────────────────────────────────────────────────────

async function fetchConversationHistory(
  gigId: string,
  limit: number = 30
): Promise<Array<{ role: string; content: string; timestamp: string }>> {
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
      timestamp: (item.timestamp as string) || "",
    }));
}

async function logMessage(
  gigId: string,
  senderId: string,
  senderName: string,
  body: string,
  direction: "inbound" | "outbound",
  messageType: string = "sms"
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
        messageType,
      },
    })
  );
}

// ── SMS Sending ──────────────────────────────────────────────────────────────

async function sendSms(to: string, message: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return;
  if (!TWILIO_MESSAGING_SERVICE_SID && !GIGLER_NUMBER) return;

  const params: Record<string, string> = { To: to, Body: message };
  if (TWILIO_MESSAGING_SERVICE_SID) {
    params.MessagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
  } else {
    params.From = GIGLER_NUMBER;
  }

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
}

// ── Gemini AI ────────────────────────────────────────────────────────────────

async function callGemini(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> = []
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return "I'm processing your request. Give me a moment!";
  }

  const contents = [
    ...history.map((msg) => ({
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
            maxOutputTokens: 600,
            temperature: 0.7,
          },
        }),
      }
    );

    const data = await response.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm working on that. Give me a moment!"
    );
  } catch (error) {
    console.error("[GigProcessor] Gemini error:", error);
    return "I'm having trouble right now. Try again in a moment!";
  }
}

function repairTruncatedJson(raw: string): unknown | null {
  const partial = raw.match(/\[[\s\S]*/)?.[0] || raw.match(/\{[\s\S]*/)?.[0];
  if (!partial) return null;
  try {
    const repaired = partial.replace(/,\s*"[^"]*$/, "").replace(/,\s*$/, "");
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    const closed = repaired
      + "}".repeat(Math.max(0, openBraces - closeBraces))
      + "]".repeat(Math.max(0, openBrackets - closeBrackets));
    return JSON.parse(closed);
  } catch {
    return null;
  }
}

// ── Gig Metadata Management ─────────────────────────────────────────────────

async function getGig(gigId: string): Promise<Gig | null> {
  const result = await ddb.send(
    new GetCommand({ TableName: GIG_TABLE_NAME, Key: { id: gigId } })
  );
  return (result.Item as Gig) || null;
}

async function updateGigMetadata(
  gigId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: GIG_TABLE_NAME,
      Key: { id: gigId },
      UpdateExpression: "SET metadata = :meta, updatedAt = :now",
      ExpressionAttributeValues: {
        ":meta": JSON.stringify(metadata),
        ":now": new Date().toISOString(),
      },
    })
  );
}

async function createReminder(params: {
  gigId: string;
  userId: string;
  scheduledAt: string;
  type: string;
  message: string;
  channel: string;
  recipients: string[];
}): Promise<void> {
  const id = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  await ddb.send(
    new PutCommand({
      TableName: REMINDER_TABLE_NAME,
      Item: {
        id,
        ...params,
        sent: false,
        createdAt: new Date().toISOString(),
      },
    })
  );
  console.log(`[GigProcessor] Created reminder ${id} for gig ${params.gigId}`);
}

// ── Main Handler ─────────────────────────────────────────────────────────────

export const handler: Handler = async (event: GigProcessorEvent, context) => {
  const trace = event._trace || { traceId: generateTraceId(), requestId: context.awsRequestId, source: "unknown" };
  const log = createLogger({
    ...trace, source: "gigler-gig-processor",
    gigId: event.gigId, userId: event.userId, phone: event.phone,
  });
  log.info("Processing gig message", { hasMedia: !!event.mediaUrls?.length, senderName: event.senderName });

  const { gigId, userId, message, phone, senderName } = event;

  const gig = await getGig(gigId);
  if (!gig) {
    log.error("Gig not found");
    return { statusCode: 404, body: "Gig not found" };
  }

  if (gig.status !== "active") {
    await sendSms(phone, `This gig ("${gig.title}") is ${gig.status}. Text "reopen" to reactivate it.`);
    return { statusCode: 200, body: "Gig not active" };
  }

  // Log inbound message
  await logMessage(gigId, userId, senderName || phone, message, "inbound");

  // Fetch conversation history
  const history = await fetchConversationHistory(gigId, 30);

  // Parse existing metadata
  let metadata: Record<string, unknown> = {};
  try {
    metadata = gig.metadata ? JSON.parse(gig.metadata) : {};
  } catch {
    metadata = {};
  }

  // Build type-specific system prompt with action instructions
  const typePrompt = GIG_TYPE_PROMPTS[gig.type] || GIG_TYPE_PROMPTS.planning;
  const systemPrompt = `You are Gigler, an AI assistant. You are managing a gig called "${gig.title}".

${typePrompt}

Current gig metadata: ${JSON.stringify(metadata)}

Keep responses concise and SMS-friendly. Be action-oriented and proactive.
If the user wants to add someone to the gig, tell them to text: "Add [name] [phone]"
If the gig seems complete, suggest marking it done.

IMPORTANT: After your user-facing response, on a NEW line write ACTION_JSON: followed by a JSON array of actions to execute. If no actions are needed, write ACTION_JSON: []

Available actions:
- {"type":"generate_image","prompt":"detailed image description"} — generate an AI image
- {"type":"create_deliverable","deliverableType":"pdf|website|menu|code_project","title":"...","content":"the full content to include"} — create a deliverable
- {"type":"set_reminder","scheduledAt":"ISO 8601 datetime","reminderMessage":"...","channel":"sms|voice"} — set a reminder. Use the user's timezone or default to America/Chicago. Convert relative times (tomorrow, next Monday, in 2 hours) to absolute ISO 8601.
- {"type":"book_reservation","platform":"opentable|resy|evite","params":{"query":"...","date":"...","partySize":2}} — search for a reservation

Only include actions when the user explicitly requests something actionable. Do NOT include actions for general conversation.`;

  // Call Gemini with action-aware prompt
  const rawResponse = await callGemini(systemPrompt, message, history);
  const { userText, actions } = parseAiResponse(rawResponse);

  // Log and send the user-facing portion
  await logMessage(gigId, "gigler", "Gigler", userText, "outbound", "ai");
  await sendSms(phone, userText);

  // Execute any parsed actions asynchronously
  if (actions.length > 0) {
    log.info("Executing actions from AI response", { actionCount: actions.length, actionTypes: actions.map(a => a.type) });
    await executeActions(actions, { gigId, userId, phone }, log.tracePayload());
  }

  // Update gig metadata with latest interaction timestamp
  await updateGigMetadata(gigId, {
    ...metadata,
    lastInteraction: new Date().toISOString(),
    messageCount: ((metadata.messageCount as number) || 0) + 1,
  });

  return { statusCode: 200, body: "Processed" };
};
