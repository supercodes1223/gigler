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

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const GIG_TABLE_NAME = process.env.GIG_TABLE_NAME || "";
const MESSAGE_TABLE_NAME = process.env.MESSAGE_TABLE_NAME || "";
const DELIVERABLE_TABLE_NAME = process.env.DELIVERABLE_TABLE_NAME || "";
const REMINDER_TABLE_NAME = process.env.REMINDER_TABLE_NAME || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const GIGLER_NUMBER = process.env.GIGLER_NUMBER || "";

interface GigProcessorEvent {
  gigId: string;
  userId: string;
  message: string;
  mediaUrls?: string[];
  phone: string;
  senderName?: string;
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
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !GIGLER_NUMBER) return;

  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: GIGLER_NUMBER,
        To: to,
        Body: message,
      }).toString(),
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

export const handler: Handler = async (event: GigProcessorEvent) => {
  console.log(`[GigProcessor] Processing gig ${event.gigId} for user ${event.userId}`);

  const { gigId, userId, message, phone, senderName } = event;

  const gig = await getGig(gigId);
  if (!gig) {
    console.error(`[GigProcessor] Gig ${gigId} not found`);
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

  // Build type-specific system prompt
  const typePrompt = GIG_TYPE_PROMPTS[gig.type] || GIG_TYPE_PROMPTS.planning;
  const systemPrompt = `You are Gigler, an AI assistant. You are managing a gig called "${gig.title}".

${typePrompt}

Current gig metadata: ${JSON.stringify(metadata)}

Keep responses concise and SMS-friendly. Be action-oriented and proactive.
When you have enough info to create a deliverable, mention it.
If the user wants to add someone to the gig, tell them to text: "Add [name] [phone]"
If the gig seems complete, suggest marking it done.`;

  // Call Gemini
  const aiResponse = await callGemini(systemPrompt, message, history);

  // Log and send AI response
  await logMessage(gigId, "gigler", "Gigler", aiResponse, "outbound", "ai");
  await sendSms(phone, aiResponse);

  // Detect if AI response suggests a reminder
  if (/remind|schedule|set.*reminder/i.test(message)) {
    const reminderMatch = message.match(/(\d{1,2}[/:]\d{2}\s*(?:am|pm)?|\d{4}-\d{2}-\d{2}|tomorrow|next\s+\w+day)/i);
    if (reminderMatch) {
      console.log(`[GigProcessor] Detected reminder request: ${reminderMatch[0]}`);
      // Reminder creation would parse the time expression -- for now log intent
    }
  }

  return { statusCode: 200, body: "Processed" };
};
