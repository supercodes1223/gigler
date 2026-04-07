/**
 * Gigler Gig Processor (AI Execution Engine)
 *
 * Receives a message + gig context from gigler-inbound-sms.
 * Uses Gemini to understand and act based on gig type.
 * Can trigger deliverable generation, media processing,
 * reminders, and third-party actions.
 *
 * Invoked via direct Lambda invocation OR HTTP Function URL (Conversations webhook).
 * Direct event payload: { gigId, userId, message, mediaUrls?, phone }
 * HTTP event: Twilio Conversations onMessageAdded webhook (form-encoded)
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
const TWILIO_CONVERSATIONS_SERVICE_SID = process.env.TWILIO_CONVERSATIONS_SERVICE_SID || "";
const USER_TABLE_NAME = process.env.USER_TABLE_NAME || "";
const GIG_PARTICIPANT_TABLE_NAME = process.env.GIG_PARTICIPANT_TABLE_NAME || "";
const MEDIA_PROCESSOR_FUNCTION_NAME = process.env.MEDIA_PROCESSOR_FUNCTION_NAME || "";
const DELIVERABLE_GENERATOR_FUNCTION_NAME = process.env.DELIVERABLE_GENERATOR_FUNCTION_NAME || "";
const THIRD_PARTY_ACTIONS_FUNCTION_NAME = process.env.THIRD_PARTY_ACTIONS_FUNCTION_NAME || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const GITHUB_ORG = process.env.GITHUB_ORG || "";

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
  type: "generate_image" | "create_deliverable" | "set_reminder" | "book_reservation" | "add_participant" | "create_github_repo" | "create_collage" | "update_bill_status";
  prompt?: string;
  deliverableType?: string;
  title?: string;
  content?: string;
  scheduledAt?: string;
  reminderMessage?: string;
  channel?: string;
  platform?: string;
  params?: Record<string, unknown>;
  name?: string;
  phone?: string;
  description?: string;
  files?: Array<{ path: string; content: string }>;
  recurrence?: string;
  recurrenceDay?: number;
  billType?: string;
  vendor?: string;
  amount?: number;
  dueDate?: string;
  billingPeriod?: string;
  billStatus?: string;
  paidBy?: string;
  mediaId?: string;
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
            recurrence: action.recurrence,
            recurrenceDay: action.recurrenceDay,
          });
        }
        break;

      case "update_bill_status":
        if (action.billType) {
          await handleUpdateBillStatus(ctx.gigId, {
            billType: action.billType,
            vendor: action.vendor,
            amount: action.amount,
            dueDate: action.dueDate,
            billingPeriod: action.billingPeriod,
            status: action.billStatus || "submitted",
            submittedBy: ctx.phone,
            paidBy: action.paidBy || ctx.phone,
            mediaId: action.mediaId,
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

      case "add_participant":
        if (action.phone && action.name) {
          await handleAddParticipant(
            ctx.gigId, ctx.userId, ctx.phone,
            action.name, action.phone, trace
          );
        }
        break;

      case "create_github_repo":
        if (action.name && action.files?.length) {
          await handleCreateGitHubRepo(
            ctx.gigId, ctx.userId, ctx.phone,
            action.name, action.description || "",
            action.files, trace
          );
        }
        break;

      case "create_collage":
        await invokeLambdaAsync(DELIVERABLE_GENERATOR_FUNCTION_NAME, {
          gigId: ctx.gigId, userId: ctx.userId,
          type: "collage",
          title: action.title || "Photo Gallery",
          content: action.content || "",
          phone: ctx.phone, _trace: trace,
        });
        break;
    }
  }
}

// ── Add Participant ──────────────────────────────────────────────────────────

function twilioConversationsConfig() {
  return {
    accountSid: TWILIO_ACCOUNT_SID,
    authToken: TWILIO_AUTH_TOKEN,
    serviceSid: TWILIO_CONVERSATIONS_SERVICE_SID || undefined,
  };
}

function conversationsBase(path: string): string {
  return TWILIO_CONVERSATIONS_SERVICE_SID
    ? `https://conversations.twilio.com/v1/Services/${TWILIO_CONVERSATIONS_SERVICE_SID}${path}`
    : `https://conversations.twilio.com/v1${path}`;
}

function conversationsAuthHeaders() {
  return {
    Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

async function lookupUserByPhone(phone: string): Promise<Record<string, unknown> | null> {
  if (!USER_TABLE_NAME) return null;
  const result = await ddb.send(
    new QueryCommand({
      TableName: USER_TABLE_NAME,
      IndexName: "byPhone",
      KeyConditionExpression: "phone = :phone",
      ExpressionAttributeValues: { ":phone": phone },
    })
  );
  return (result.Items?.[0] as Record<string, unknown>) || null;
}

async function getOrCreateConversation(
  gigId: string,
  gigTitle: string,
  metadata: Record<string, unknown>
): Promise<string> {
  if (metadata.conversationSid) return metadata.conversationSid as string;

  const uniqueName = `gig-${gigId}`;
  const response = await fetch(conversationsBase("/Conversations"), {
    method: "POST",
    headers: conversationsAuthHeaders(),
    body: new URLSearchParams({
      FriendlyName: gigTitle,
      UniqueName: uniqueName,
      Attributes: JSON.stringify({ gigId }),
    }).toString(),
  });
  const data = await response.json();

  let conversationSid: string;

  if (!response.ok && data.code === 50053) {
    const fetchResp = await fetch(conversationsBase(`/Conversations/${uniqueName}`), {
      method: "GET",
      headers: conversationsAuthHeaders(),
    });
    if (!fetchResp.ok) {
      throw new Error("Conversation exists but could not be fetched");
    }
    const existing = await fetchResp.json();
    conversationSid = existing.sid as string;
    console.log(`[GigProcessor] Reusing existing Conversation ${conversationSid} for gig ${gigId}`);
  } else if (!response.ok) {
    throw new Error(`Failed to create conversation: ${data.message || response.statusText}`);
  } else {
    conversationSid = data.sid as string;
    console.log(`[GigProcessor] Created Group MMS Conversation ${conversationSid} for gig ${gigId}`);
  }

  await ddb.send(
    new UpdateCommand({
      TableName: GIG_TABLE_NAME,
      Key: { id: gigId },
      UpdateExpression: "SET conversationSid = :csid, metadata = :meta, updatedAt = :now",
      ExpressionAttributeValues: {
        ":csid": conversationSid,
        ":meta": JSON.stringify({ ...metadata, conversationSid }),
        ":now": new Date().toISOString(),
      },
    })
  );
  return conversationSid;
}

async function addSmsParticipantToConversation(
  conversationSid: string,
  phone: string
): Promise<void> {
  const base = conversationsBase(`/Conversations/${conversationSid}/Participants`);

  const response = await fetch(base, {
    method: "POST",
    headers: conversationsAuthHeaders(),
    body: new URLSearchParams({
      "MessagingBinding.Address": phone,
    }).toString(),
  });

  if (!response.ok) {
    const data = await response.json();
    if (data.code === 50433 || data.code === 50416) {
      console.log(`[GigProcessor] Participant ${phone} already in conversation`);
      return;
    }
    throw new Error(`Failed to add participant: ${data.message || response.statusText}`);
  }
  console.log(`[GigProcessor] Added ${phone} to Group MMS conversation ${conversationSid}`);
}

async function addGiglerProjectedAddress(conversationSid: string): Promise<void> {
  const base = conversationsBase(`/Conversations/${conversationSid}/Participants`);

  const response = await fetch(base, {
    method: "POST",
    headers: conversationsAuthHeaders(),
    body: new URLSearchParams({
      "MessagingBinding.ProjectedAddress": GIGLER_NUMBER,
    }).toString(),
  });

  if (!response.ok) {
    const data = await response.json();
    if (data.code === 50433 || data.code === 50416) {
      console.log("[GigProcessor] Gigler projected address already in conversation");
      return;
    }
    throw new Error(`Failed to add Gigler projected address: ${data.message || response.statusText}`);
  }
  console.log(`[GigProcessor] Added Gigler as projected address in ${conversationSid}`);
}

async function sendConversationMessage(
  conversationSid: string,
  body: string
): Promise<void> {
  const base = conversationsBase(`/Conversations/${conversationSid}/Messages`);

  const response = await fetch(base, {
    method: "POST",
    headers: conversationsAuthHeaders(),
    body: new URLSearchParams({ Author: GIGLER_NUMBER, Body: body }).toString(),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(`Failed to send conversation message: ${data.message || response.statusText}`);
  }
}

async function fetchConversationMessages(
  conversationSid: string,
  limit = 20
): Promise<Array<{ author: string; body: string; dateCreated: string }>> {
  const base = conversationsBase(`/Conversations/${conversationSid}/Messages?PageSize=${limit}&Order=desc`);

  const response = await fetch(base, {
    method: "GET",
    headers: conversationsAuthHeaders(),
  });

  if (!response.ok) return [];
  const data = await response.json();
  const messages = (data.messages || []) as Array<{ author: string; body: string; date_created: string }>;
  return messages.reverse().map(m => ({
    author: m.author,
    body: m.body,
    dateCreated: m.date_created,
  }));
}

async function getGigParticipants(gigId: string): Promise<Array<Record<string, unknown>>> {
  if (!GIG_PARTICIPANT_TABLE_NAME) return [];
  const result = await ddb.send(
    new QueryCommand({
      TableName: GIG_PARTICIPANT_TABLE_NAME,
      KeyConditionExpression: "gigId = :gid",
      ExpressionAttributeValues: { ":gid": gigId },
    })
  );
  return (result.Items as Array<Record<string, unknown>>) || [];
}

async function findGigByConversationSid(conversationSid: string): Promise<Record<string, unknown> | null> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: GIG_TABLE_NAME,
      IndexName: "byConversationSid",
      KeyConditionExpression: "conversationSid = :csid",
      ExpressionAttributeValues: { ":csid": conversationSid },
    })
  );
  return (result.Items?.[0] as Record<string, unknown>) || null;
}

async function handleAddParticipant(
  gigId: string,
  ownerUserId: string,
  ownerPhone: string,
  participantName: string,
  participantPhone: string,
  trace: TraceContext
): Promise<void> {
  console.log(`[GigProcessor] Adding participant: ${participantName} (${participantPhone}) to gig ${gigId}`);

  const gig = await ddb.send(
    new GetCommand({ TableName: GIG_TABLE_NAME, Key: { id: gigId } })
  );
  const gigItem = gig.Item as Record<string, unknown> | undefined;
  if (!gigItem) {
    console.error(`[GigProcessor] Gig ${gigId} not found`);
    return;
  }

  const metadata: Record<string, unknown> = typeof gigItem.metadata === "string"
    ? JSON.parse(gigItem.metadata)
    : (gigItem.metadata as Record<string, unknown>) || {};

  const existingUser = await lookupUserByPhone(participantPhone);
  const isNewToGigler = !existingUser;

  const ownerUser = await ddb.send(
    new GetCommand({ TableName: USER_TABLE_NAME, Key: { id: ownerUserId } })
  );
  const ownerName = (ownerUser.Item?.name as string) || "Someone";

  const now = new Date().toISOString();

  await ddb.send(
    new PutCommand({
      TableName: GIG_PARTICIPANT_TABLE_NAME,
      Item: {
        gigId,
        phone: ownerPhone,
        userId: ownerUserId,
        role: "owner",
        name: ownerName,
        isGuest: false,
        joinedAt: now,
      },
      ConditionExpression: "attribute_not_exists(gigId) AND attribute_not_exists(phone)",
    })
  ).catch(() => { /* owner already exists */ });

  await ddb.send(
    new PutCommand({
      TableName: GIG_PARTICIPANT_TABLE_NAME,
      Item: {
        gigId,
        phone: participantPhone,
        userId: existingUser?.id as string || undefined,
        role: "collaborator",
        name: participantName,
        isGuest: isNewToGigler,
        invitedBy: ownerUserId,
        joinedAt: now,
      },
    })
  );
  console.log(`[GigProcessor] Created GigParticipant records for owner ${ownerPhone} and participant ${participantPhone}`);
  const gigTitle = gigItem.title as string || "a gig";

  try {
    const conversationSid = await getOrCreateConversation(gigId, gigTitle, metadata);
    await addGiglerProjectedAddress(conversationSid);
    await addSmsParticipantToConversation(conversationSid, ownerPhone);
    await addSmsParticipantToConversation(conversationSid, participantPhone);

    const groupIntro = isNewToGigler
      ? `Hi ${participantName}! ${ownerName} has added you as a participant on: "${gigTitle}". Welcome to Gigler — I'm your AI assistant and I'll help coordinate everything here. Reply in this thread to collaborate!`
      : `Hi ${participantName}! ${ownerName} has added you as a participant on: "${gigTitle}". Reply in this thread to collaborate!`;

    await sendConversationMessage(conversationSid, groupIntro);
    console.log(`[GigProcessor] Sent group intro to conversation ${conversationSid}`);
  } catch (err) {
    console.error("[GigProcessor] Conversation setup failed, falling back to direct SMS:", err);
    const fallbackMsg = isNewToGigler
      ? `Hi ${participantName}! ${ownerName} has added you to their Gigler gig: "${gigTitle}". I'm Gigler, your AI assistant — I'll help coordinate everything.`
      : `Hi ${participantName}! ${ownerName} has added you to their gig: "${gigTitle}".`;
    await sendSms(participantPhone, fallbackMsg);
  }

  if (isNewToGigler) {
    const welcomeMsg = `Welcome to Gigler! 🎉\n\n${ownerName} just added you to their gig "${gigTitle}".\n\nGigler is your AI-powered assistant that helps you plan, organize, and execute anything via text.\n\nYou can create your own gigs anytime — just text this number with what you need!\n\nLearn more at gigler.ai`;
    await sendSms(participantPhone, welcomeMsg);
    console.log(`[GigProcessor] Sent 1-on-1 welcome SMS to new user ${participantPhone}`);

    sendVcardToNewUser(participantPhone).catch(() => {});
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

  household: `You are managing a household bills/expenses gig. This is a group effort between family members.

CAPABILITIES:
- Track utility bills (power, gas, water, trash, internet, rent, etc.)
- When someone sends a bill photo, acknowledge it and confirm the extracted amount and due date
- Maintain a checklist of bills per month: which are submitted, which are paid
- When a parent says "zelle sent" or "payment sent" or "paid [bill]", mark that bill as paid via update_bill_status
- When the son submits a bill (photo or text like "power bill: $429"), mark it as submitted via update_bill_status
- Proactively remind about upcoming due dates
- At month end or on request, generate the monthly dashboard via create_deliverable with deliverableType "bills_dashboard"
- Be natural and family-friendly -- this is a parent-child collaboration, not a corporate tool
- Use common sense: "got the electric" means they received the bill, "sent $500" means payment was made

SETUP PHASE: When this gig is first created, collect the following before switching to ongoing tracking mode. Ask naturally over 2-3 messages, not as a rigid form:
1. What bills need tracking? (power, gas, water, trash, internet, rent, etc.)
2. Due date for each bill (day of month)
3. Who should be added as participants? (name + phone)
4. How many days before due date should reminders go out? (default: 3 days)

Example setup conversation:
User: "Track monthly utility bills for Jordan"
You: "On it! What bills are we tracking — power, gas, water, trash, internet? All of those or different ones?"
User: "Power, water, gas, and internet"
You: "Got it — 4 bills. When's each one due? Like 'power on the 15th, gas on the 20th'"
User: "Power 15th, water 10th, gas 20th, internet 1st"
You: "Locked in. Want me to add Jordan to the group? Drop their number and I'll loop them in."

Once setup info is collected, use set_reminder with recurrence "monthly" for each bill, and switch to ongoing tracking mode.
When bill photos arrive with extracted data (shown as [Bill detected: ...]), use update_bill_status to record them.`,
};

// ── GitHub Repo Creation ─────────────────────────────────────────────────────

async function handleCreateGitHubRepo(
  gigId: string,
  userId: string,
  phone: string,
  repoName: string,
  description: string,
  files: Array<{ path: string; content: string }>,
  trace: TraceContext
): Promise<void> {
  if (!GITHUB_TOKEN) {
    console.warn("[GigProcessor] No GITHUB_TOKEN configured, skipping repo creation");
    await sendSms(phone, "GitHub repo creation isn't configured yet. The code is saved in your gig thread!");
    return;
  }

  const owner = GITHUB_ORG || "gigler-projects";
  const sanitizedName = repoName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);

  try {
    const createRepoRes = await fetch("https://api.github.com/user/repos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: sanitizedName,
        description: description || `Created by Gigler for gig ${gigId}`,
        private: false,
        auto_init: true,
      }),
    });

    if (!createRepoRes.ok) {
      const err = await createRepoRes.text();
      console.error("[GigProcessor] GitHub repo creation failed:", createRepoRes.status, err);
      await sendSms(phone, `Couldn't create the GitHub repo. I'll keep the code in your gig thread.`);
      return;
    }

    const repo = await createRepoRes.json();
    const repoFullName = repo.full_name;
    const repoUrl = repo.html_url;
    console.log(`[GigProcessor] Created repo: ${repoFullName}`);

    for (const file of files) {
      const contentBase64 = Buffer.from(file.content).toString("base64");
      const putRes = await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/${file.path}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Add ${file.path} via Gigler`,
            content: contentBase64,
          }),
        }
      );

      if (!putRes.ok) {
        const err = await putRes.text();
        console.error(`[GigProcessor] Failed to push ${file.path}:`, putRes.status, err);
      }
    }

    await sendSms(phone, `Your code is live on GitHub!\n\n${repoUrl}\n\n${files.length} file(s) pushed.`);
    console.log(`[GigProcessor] Pushed ${files.length} files to ${repoFullName}`);

  } catch (error) {
    console.error("[GigProcessor] GitHub error:", error);
    await sendSms(phone, "Had trouble creating the GitHub repo. The code is saved in your gig thread.");
  }
}

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

  const params: Record<string, string> = { To: to, Body: message, From: GIGLER_NUMBER };
  if (TWILIO_MESSAGING_SERVICE_SID) {
    params.MessagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
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
    console.error("[GigProcessor] Failed to send vCard MMS:", error);
  }
}

// ── Gemini AI ────────────────────────────────────────────────────────────────

async function callGemini(
  systemPrompt: string,
  userMessage: string,
  history: Array<{ role: string; content: string }> = [],
  enableSearch: boolean = true
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

  const requestBody: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      maxOutputTokens: 1600,
      temperature: 0.7,
    },
  };

  if (enableSearch) {
    requestBody.tools = [{ google_search: {} }];
  }

  try {
    console.log(`[GigProcessor] Calling Gemini model: ${GEMINI_MODEL} (search: ${enableSearch})`);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "I'm working on that. Give me a moment!";

    const grounding = data?.candidates?.[0]?.groundingMetadata;
    if (grounding?.webSearchQueries?.length) {
      console.log(`[GigProcessor] Grounding searches: ${JSON.stringify(grounding.webSearchQueries)}`);
    }

    return text;
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
  recurrence?: string;
  recurrenceDay?: number;
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
  console.log(`[GigProcessor] Created reminder ${id} for gig ${params.gigId}${params.recurrence ? ` (${params.recurrence})` : ""}`);
}

// ── Bill Tracking ────────────────────────────────────────────────────────────

interface BillEntry {
  billType: string;
  vendor?: string;
  amount?: number;
  dueDate?: string;
  billingPeriod?: string;
  status: string;
  submittedAt?: string;
  submittedBy?: string;
  paidAt?: string;
  paidBy?: string;
  mediaId?: string;
}

async function handleUpdateBillStatus(gigId: string, entry: {
  billType: string;
  vendor?: string;
  amount?: number;
  dueDate?: string;
  billingPeriod?: string;
  status: string;
  submittedBy?: string;
  paidBy?: string;
  mediaId?: string;
}): Promise<void> {
  const gig = await getGig(gigId);
  if (!gig) return;

  let metadata: Record<string, unknown> = {};
  try { metadata = gig.metadata ? JSON.parse(gig.metadata) : {}; } catch { metadata = {}; }

  const now = new Date().toISOString();
  const monthKey = now.substring(0, 7);

  const bills = (metadata.bills as Record<string, BillEntry[]>) || {};
  if (!bills[monthKey]) bills[monthKey] = [];

  const existing = bills[monthKey].find(
    (b) => b.billType.toLowerCase() === entry.billType.toLowerCase()
  );

  if (existing) {
    if (entry.vendor) existing.vendor = entry.vendor;
    if (entry.amount !== undefined) existing.amount = entry.amount;
    if (entry.dueDate) existing.dueDate = entry.dueDate;
    if (entry.billingPeriod) existing.billingPeriod = entry.billingPeriod;
    if (entry.mediaId) existing.mediaId = entry.mediaId;

    if (entry.status === "paid") {
      existing.status = "paid";
      existing.paidAt = now;
      existing.paidBy = entry.paidBy;
    } else if (entry.status === "submitted" && existing.status !== "paid") {
      existing.status = "submitted";
      existing.submittedAt = now;
      existing.submittedBy = entry.submittedBy;
    }
  } else {
    const newEntry: BillEntry = {
      billType: entry.billType,
      vendor: entry.vendor,
      amount: entry.amount,
      dueDate: entry.dueDate,
      billingPeriod: entry.billingPeriod,
      status: entry.status,
      mediaId: entry.mediaId,
    };
    if (entry.status === "submitted") {
      newEntry.submittedAt = now;
      newEntry.submittedBy = entry.submittedBy;
    } else if (entry.status === "paid") {
      newEntry.paidAt = now;
      newEntry.paidBy = entry.paidBy;
    }
    bills[monthKey].push(newEntry);
  }

  const monthlyTotals = (metadata.monthlyTotals as Record<string, number>) || {};
  monthlyTotals[monthKey] = bills[monthKey].reduce((sum, b) => sum + (b.amount || 0), 0);

  metadata.bills = bills;
  metadata.monthlyTotals = monthlyTotals;
  metadata.lastInteraction = now;

  await updateGigMetadata(gigId, metadata);
  console.log(`[GigProcessor] Updated bill status: ${entry.billType} -> ${entry.status} for gig ${gigId}`);
}

// ── System Prompt Builder ────────────────────────────────────────────────────

const ACTION_INSTRUCTIONS = `
IMPORTANT: After your user-facing response, on a NEW line write ACTION_JSON: followed by a JSON array of actions to execute. If no actions are needed, write ACTION_JSON: []

Available actions:
- {"type":"generate_image","prompt":"detailed image description"} — generate an AI image using Imagen 3
- {"type":"create_deliverable","deliverableType":"pdf|website|menu|code_project","title":"...","content":"the full content to include"} — create a deliverable. For "website" type, content should be complete HTML/CSS/JS. For "pdf" type, content is the document body text. For "code_project", content should be the full project code.
- {"type":"set_reminder","scheduledAt":"ISO 8601 datetime","reminderMessage":"...","channel":"sms|voice","recurrence":"monthly","recurrenceDay":15} — set a reminder. Use the user's timezone or default to America/Chicago. Convert relative times to absolute ISO 8601. For recurring reminders, add "recurrence" (none/daily/weekly/monthly) and "recurrenceDay" (1-31 for monthly). The scheduler will auto-create the next occurrence after each send.
- {"type":"book_reservation","platform":"opentable|resy|evite","params":{"query":"...","date":"...","partySize":2}} — search for a reservation
- {"type":"add_participant","name":"person's name","phone":"+1XXXXXXXXXX"} — add a person to this gig as a collaborator. Use this when the user says "Add [name] [phone]" or asks to invite someone. The phone MUST be in E.164 format (+1 followed by 10 digits).
- {"type":"create_github_repo","name":"repo-name","description":"short description","files":[{"path":"filename","content":"file content"}]} — create a GitHub repository with generated code files. Use kebab-case for repo names.
- {"type":"create_collage","title":"gallery title","content":"optional description"} — generate a shareable photo gallery/collage page from all images in this gig. The gallery is hosted at a short gigler.ai URL. Use when user asks for a gallery, collage, photo page, or wants to share collected images.
- {"type":"update_bill_status","billType":"power","vendor":"Austin Energy","amount":429,"dueDate":"2026-04-15","billingPeriod":"Mar 2026","billStatus":"submitted"} — update a bill's status in the household tracker. Use when someone submits a bill (photo or text) or marks it as paid. billStatus can be "submitted" or "paid".

You have access to Google Search for real-time information. When the user asks about vendors, venues, prices, availability, restaurants, or any factual information, use your search capability to provide accurate, current results with specific names, addresses, and details.

When a user sends photos/images (indicated by "[User attached N photo(s) via MMS]"):
- Acknowledge the photos naturally ("Got your photos!" or "Nice, I saved those")
- If the gig context makes it relevant, proactively suggest what to do with them (create a gallery, use for invitations, etc.)
- If several photos have been collected over the gig, offer to create a shareable gallery page using create_collage
- Don't over-explain the process — keep it casual and SMS-friendly

Only include actions when the user explicitly requests something actionable. Do NOT include actions for general conversation.`;

function buildDirectPrompt(gig: Gig, metadata: Record<string, unknown>): string {
  let typePrompt: string;
  if (gig.type === "custom" && metadata.customPrompt) {
    typePrompt = metadata.customPrompt as string;
  } else {
    typePrompt = GIG_TYPE_PROMPTS[gig.type] || GIG_TYPE_PROMPTS.planning;
  }
  return `You are Gigler, an AI assistant. You are managing a gig called "${gig.title}".

${typePrompt}

Current gig metadata: ${JSON.stringify(metadata)}

Keep responses concise and SMS-friendly. Be action-oriented and proactive.
When the user says to add someone (e.g. "Add Sarah 555-123-4567"), use the add_participant action. Convert the phone to E.164 format (+15551234567).
If the gig seems complete, suggest marking it done.
${ACTION_INSTRUCTIONS}`;
}

function buildGroupPrompt(
  gig: Gig,
  metadata: Record<string, unknown>,
  participants: Array<Record<string, unknown>>,
  senderName: string,
  senderPhone: string
): string {
  const typePrompt = GIG_TYPE_PROMPTS[gig.type] || GIG_TYPE_PROMPTS.planning;
  const roster = participants.map(p => {
    const name = p.name as string || "Unknown";
    const role = p.role as string || "collaborator";
    const phone = p.phone as string || "";
    return `- ${name} (${role})${phone === senderPhone ? " [sender of this message]" : ""}`;
  }).join("\n");

  return `You are Gigler, an AI assistant participating in a GROUP TEXT thread for a gig called "${gig.title}".

${typePrompt}

Current gig metadata: ${JSON.stringify(metadata)}

PARTICIPANTS IN THIS GROUP THREAD:
${roster}

The latest message was sent by: ${senderName} (${senderPhone})

CRITICAL RULES FOR GROUP CONVERSATION:
1. You are ONE participant among humans. Do NOT respond to every message.
2. STAY SILENT when humans are talking to each other (e.g. "sounds good!", "see you at 7", "haha yeah", casual banter).
3. RESPOND when someone asks a question you can help with, requests something actionable, or directly addresses you/Gigler.
4. RESPOND when you can offer genuinely useful information (e.g. after a planning discussion settles, suggest a next step).
5. Use common sense. If two people are coordinating with each other, stay out of it.
6. Be natural and concise. You're a helpful friend in the group, not a chatbot.
7. NEVER repeat information that was already discussed in the thread.

RESPONSE FORMAT:
First line MUST be exactly one of:
RESPOND: true
RESPOND: false

If RESPOND: true, write your message on the following lines.
If RESPOND: false, write nothing else.
${ACTION_INSTRUCTIONS}`;
}

// ── Conversations Webhook Handler ────────────────────────────────────────────

function parseFormBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const pair of body.split("&")) {
    const [key, value] = pair.split("=").map(decodeURIComponent);
    if (key) params[key] = value || "";
  }
  return params;
}

async function handleConversationsWebhook(event: Record<string, unknown>): Promise<{ statusCode: number; body: string }> {
  const rawBody = (event.body as string) || "";
  const decodedBody = (event as unknown as { isBase64Encoded?: boolean }).isBase64Encoded
    ? Buffer.from(rawBody, "base64").toString("utf8")
    : rawBody;

  const params = parseFormBody(decodedBody);
  const eventType = params.EventType;
  const conversationSid = params.ConversationSid;
  const author = params.Author;
  const messageBody = params.Body;

  if (eventType !== "onMessageAdded" || !conversationSid || !messageBody) {
    return { statusCode: 200, body: "Ignored" };
  }

  if (author === GIGLER_NUMBER) {
    return { statusCode: 200, body: "Skip own message" };
  }

  console.log(`[GigProcessor] Group message in ${conversationSid} from ${author}: ${messageBody.substring(0, 80)}`);

  const gigFromGsi = await findGigByConversationSid(conversationSid);
  let gigId: string | undefined = gigFromGsi?.id as string | undefined;

  if (!gigId) {
    const convResponse = await fetch(conversationsBase(`/Conversations/${conversationSid}`), {
      method: "GET",
      headers: conversationsAuthHeaders(),
    });
    if (convResponse.ok) {
      const convData = await convResponse.json();
      try {
        const attrs = JSON.parse(convData.attributes || "{}");
        gigId = attrs.gigId;
      } catch { /* ignore */ }
      if (!gigId && convData.unique_name) {
        const match = (convData.unique_name as string).match(/^gig-(.+)$/);
        if (match) gigId = match[1];
      }
    }
  }

  if (!gigId) {
    console.error("[GigProcessor] Could not determine gigId from conversation");
    return { statusCode: 200, body: "No gigId" };
  }

  const gig = await getGig(gigId);
  if (!gig || gig.status !== "active") {
    return { statusCode: 200, body: "Gig not active" };
  }

  let metadata: Record<string, unknown> = {};
  try { metadata = gig.metadata ? JSON.parse(gig.metadata) : {}; } catch { /* ignore */ }

  const participants = await getGigParticipants(gigId);
  const senderParticipant = participants.find(p => p.phone === author);
  const senderName = (senderParticipant?.name as string) || author || "Someone";

  await logMessage(gigId, (senderParticipant?.userId as string) || author || "unknown", senderName, messageBody, "inbound", "group-mms");

  const recentMessages = await fetchConversationMessages(conversationSid, 20);
  const history = recentMessages
    .filter(m => m.author !== author || m.body !== messageBody)
    .map(m => {
      const p = participants.find(pp => pp.phone === m.author);
      const name = m.author === GIGLER_NUMBER ? "Gigler" : ((p?.name as string) || m.author);
      return { role: m.author === GIGLER_NUMBER ? "ai" : "user", content: `[${name}]: ${m.body}` };
    });

  const systemPrompt = buildGroupPrompt(gig, metadata, participants, senderName, author || "");
  console.log(`[GigProcessor] Calling Gemini model: ${GEMINI_MODEL} (group conversation)`);
  const rawResponse = await callGemini(systemPrompt, `[${senderName}]: ${messageBody}`, history);

  const respondMatch = rawResponse.match(/^RESPOND:\s*(true|false)\s*\n?([\s\S]*)/i);
  const shouldRespond = respondMatch ? respondMatch[1].toLowerCase() === "true" : rawResponse.trim().length > 0;
  const responseText = respondMatch ? (respondMatch[2] || "").trim() : rawResponse.trim();

  if (!shouldRespond || !responseText) {
    console.log("[GigProcessor] AI decided to stay silent in group thread");
    await updateGigMetadata(gigId, {
      ...metadata,
      lastInteraction: new Date().toISOString(),
      messageCount: ((metadata.messageCount as number) || 0) + 1,
    });
    return { statusCode: 200, body: "Silent" };
  }

  const { userText, actions } = parseAiResponse(responseText);

  await logMessage(gigId, "gigler", "Gigler", userText, "outbound", "group-mms-ai");
  await sendConversationMessage(conversationSid, userText);
  console.log(`[GigProcessor] Sent group reply in ${conversationSid}`);

  if (actions.length > 0) {
    const ownerParticipant = participants.find(p => p.role === "owner");
    const ownerPhone = (ownerParticipant?.phone as string) || "";
    const ownerUserId = (ownerParticipant?.userId as string) || "";
    await executeActions(actions, { gigId, userId: ownerUserId, phone: ownerPhone }, { traceId: generateTraceId(), requestId: "group-webhook", source: "gigler-gig-processor" });
  }

  await updateGigMetadata(gigId, {
    ...metadata,
    lastInteraction: new Date().toISOString(),
    messageCount: ((metadata.messageCount as number) || 0) + 1,
  });

  return { statusCode: 200, body: "Responded" };
}

// ── Main Handler ─────────────────────────────────────────────────────────────

export const handler: Handler = async (event: Record<string, unknown>, context) => {
  if (event.requestContext && event.headers) {
    return handleConversationsWebhook(event);
  }

  const gigEvent = event as unknown as GigProcessorEvent;
  const trace = gigEvent._trace || { traceId: generateTraceId(), requestId: context.awsRequestId, source: "unknown" };
  const log = createLogger({
    ...trace, source: "gigler-gig-processor",
    gigId: gigEvent.gigId, userId: gigEvent.userId, phone: gigEvent.phone,
  });
  log.info("Processing gig message", { hasMedia: !!gigEvent.mediaUrls?.length, senderName: gigEvent.senderName });

  const { gigId, userId, message, phone, senderName } = gigEvent;
  const mediaUrls = gigEvent.mediaUrls || [];

  const gig = await getGig(gigId);
  if (!gig) {
    log.error("Gig not found");
    return { statusCode: 404, body: "Gig not found" };
  }

  if (gig.status !== "active") {
    await sendSms(phone, `This gig ("${gig.title}") is ${gig.status}. Text "reopen" to reactivate it.`);
    return { statusCode: 200, body: "Gig not active" };
  }

  await logMessage(gigId, userId, senderName || phone, message, "inbound");
  const history = await fetchConversationHistory(gigId, 30);

  let metadata: Record<string, unknown> = {};
  try { metadata = gig.metadata ? JSON.parse(gig.metadata) : {}; } catch { metadata = {}; }

  const systemPrompt = buildDirectPrompt(gig, metadata);

  let enrichedMessage = message;
  if (mediaUrls.length > 0) {
    const photoCount = mediaUrls.length;
    const mediaNote = `[User attached ${photoCount} photo${photoCount > 1 ? "s" : ""} via MMS. The photos have been saved to this gig's media collection. You can offer to create a collage/gallery, use them for the gig, or acknowledge receipt.]`;
    enrichedMessage = message ? `${message}\n\n${mediaNote}` : mediaNote;
    log.info("Enriched message with media context", { photoCount });
  }

  const rawResponse = await callGemini(systemPrompt, enrichedMessage, history);
  const { userText, actions } = parseAiResponse(rawResponse);

  await logMessage(gigId, "gigler", "Gigler", userText, "outbound", "ai");
  await sendSms(phone, userText);

  if (actions.length > 0) {
    log.info("Executing actions from AI response", { actionCount: actions.length, actionTypes: actions.map(a => a.type) });
    await executeActions(actions, { gigId, userId, phone }, log.tracePayload());
  }

  await updateGigMetadata(gigId, {
    ...metadata,
    lastInteraction: new Date().toISOString(),
    messageCount: ((metadata.messageCount as number) || 0) + 1,
    mediaCount: ((metadata.mediaCount as number) || 0) + mediaUrls.length,
  });

  return { statusCode: 200, body: "Processed" };
};
