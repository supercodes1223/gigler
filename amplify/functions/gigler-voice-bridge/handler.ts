/**
 * Gigler Voice Bridge
 *
 * Manages voice calls via Pipecat + Gemini Live.
 * Handles wake-up calls, check-ins, and voice consultations.
 *
 * Invocation: Direct Lambda invocation from reminder-scheduler or inbound-sms.
 * Event: { type: "wake_up"|"check_in"|"consultation", userId, gigId?, phone, context? }
 */

import type { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const GIG_TABLE_NAME = process.env.GIG_TABLE_NAME || "";
const USER_TABLE_NAME = process.env.USER_TABLE_NAME || "";
const MESSAGE_TABLE_NAME = process.env.MESSAGE_TABLE_NAME || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const GIGLER_NUMBER = process.env.GIGLER_NUMBER || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
// Base URL of the Gemini Live voice bridge on GCE (e.g. https://voice.gigler.ai).
// When set, real calls are placed; otherwise we fall back to SMS briefings.
const VOICE_BRIDGE_URL = process.env.VOICE_BRIDGE_URL || "";

interface TraceContext { traceId: string; requestId: string; source: string; }

function generateTraceId(): string {
  return `trc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

function maskPhone(phone?: string): string | undefined {
  return phone && phone.length > 4 ? `***${phone.slice(-4)}` : phone;
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
  };
}

interface VoiceBridgeEvent {
  type: "wake_up" | "check_in" | "consultation";
  userId: string;
  gigId?: string;
  phone: string;
  context?: string;
  _trace?: TraceContext;
}

async function getUser(userId: string): Promise<Record<string, unknown> | null> {
  const result = await ddb.send(
    new GetCommand({ TableName: USER_TABLE_NAME, Key: { id: userId } })
  );
  return (result.Item as Record<string, unknown>) || null;
}

async function getActiveGigs(userId: string): Promise<Array<Record<string, unknown>>> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: GIG_TABLE_NAME,
      IndexName: "byOwner",
      KeyConditionExpression: "ownerId = :uid",
      ExpressionAttributeValues: { ":uid": userId },
    })
  );
  return ((result.Items || []) as Record<string, unknown>[]).filter((g) => g.status === "active");
}

async function initiateCall(
  to: string,
  twimlUrl: string
): Promise<{ success: boolean; callSid?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !GIGLER_NUMBER) {
    return { success: false };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: GIGLER_NUMBER,
          To: to,
          Url: twimlUrl,
        }).toString(),
      }
    );
    const data = await response.json();
    return response.ok ? { success: true, callSid: data.sid } : { success: false };
  } catch {
    return { success: false };
  }
}

function buildWakeUpBriefing(
  userName: string,
  gigs: Array<Record<string, unknown>>
): string {
  let briefing = `Good morning ${userName}! This is Gigler with your daily briefing.`;
  if (gigs.length > 0) {
    briefing += ` You have ${gigs.length} active gig${gigs.length > 1 ? "s" : ""}. `;
    gigs.slice(0, 3).forEach((g) => {
      briefing += `${g.title}. `;
    });
  }
  briefing += "Have a great day!";
  return briefing;
}

export const handler: Handler = async (event: VoiceBridgeEvent, context) => {
  const trace = event._trace || { traceId: generateTraceId(), requestId: context.awsRequestId, source: "unknown" };
  const log = createLogger({
    ...trace, source: "gigler-voice-bridge",
    gigId: event.gigId, userId: event.userId, phone: event.phone,
  });
  log.info("Voice bridge invoked", { callType: event.type });

  const user = await getUser(event.userId);
  if (!user) {
    log.error("User not found");
    return { statusCode: 404 };
  }

  const userName = (user.name as string) || "there";
  const gigs = await getActiveGigs(event.userId);

  let callContext: string;
  switch (event.type) {
    case "wake_up":
      callContext = buildWakeUpBriefing(userName, gigs);
      break;
    case "check_in":
      callContext = `Hey ${userName}, just checking in on your gig${event.gigId ? "" : "s"}. How's everything going?`;
      break;
    case "consultation":
      callContext = `Hi ${userName}! I'm ready to discuss ${event.context || "your gig"}. What would you like to talk about?`;
      break;
    default:
      callContext = `Hi ${userName}! This is Gigler.`;
  }

  // Place a real call through the Gemini Live voice bridge when configured.
  // Health-check first: Twilio accepts the call-create request before it ever
  // fetches our TwiML, so a dead bridge would otherwise mean a ringing call to
  // nowhere AND no SMS fallback.
  if (VOICE_BRIDGE_URL && (await isBridgeHealthy())) {
    const params = new URLSearchParams({ callType: event.type, userId: event.userId });
    if (event.gigId) params.set("gigId", event.gigId);
    if (event.context) params.set("context", event.context.slice(0, 800));
    const twimlUrl = `${VOICE_BRIDGE_URL.replace(/\/$/, "")}/voice/outbound?${params.toString()}`;

    const callResult = await initiateCall(event.phone, twimlUrl);
    if (callResult.success) {
      await logVoiceAttempt(event, `Outbound voice call placed (${callResult.callSid})`);
      log.info("Voice call placed via bridge", { callType: event.type, callSid: callResult.callSid });
      return { statusCode: 200, body: `call:${callResult.callSid}` };
    }
    log.warn("Voice bridge call failed, falling back to SMS", { callType: event.type });
  }

  const smsResult = await sendSms(event.phone, callContext);
  if (smsResult) {
    await logVoiceAttempt(event, callContext);
  }

  log.info("Voice briefing sent via SMS", { callType: event.type, activeGigCount: gigs.length });
  return { statusCode: 200, body: callContext };
};

async function isBridgeHealthy(): Promise<boolean> {
  try {
    const res = await fetch(`${VOICE_BRIDGE_URL.replace(/\/$/, "")}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendSms(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !GIGLER_NUMBER) return false;
  try {
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: GIGLER_NUMBER, To: to, Body: message,
        }).toString(),
      }
    );
    return true;
  } catch {
    return false;
  }
}

async function logVoiceAttempt(event: VoiceBridgeEvent, content: string): Promise<void> {
  if (!MESSAGE_TABLE_NAME) return;
  await ddb.send(
    new PutCommand({
      TableName: MESSAGE_TABLE_NAME,
      Item: {
        gigId: event.gigId || "_voice",
        timestamp: new Date().toISOString(),
        senderId: "gigler",
        senderName: "Gigler",
        body: `[${event.type}] ${content}`,
        direction: "outbound",
        messageType: "voice_note",
      },
    })
  );
}
