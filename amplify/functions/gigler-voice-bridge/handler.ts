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

interface VoiceBridgeEvent {
  type: "wake_up" | "check_in" | "consultation";
  userId: string;
  gigId?: string;
  phone: string;
  context?: string;
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

export const handler: Handler = async (event: VoiceBridgeEvent) => {
  console.log(`[VoiceBridge] ${event.type} call for user ${event.userId}`);

  const user = await getUser(event.userId);
  if (!user) {
    console.error(`[VoiceBridge] User ${event.userId} not found`);
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

  // For now, send the briefing as SMS since Pipecat integration requires
  // a separate WebSocket server deployment
  const smsResult = await sendSms(event.phone, callContext);
  if (smsResult) {
    await logVoiceAttempt(event, callContext);
  }

  console.log(`[VoiceBridge] Sent ${event.type} briefing to ${event.phone}`);
  return { statusCode: 200, body: callContext };
};

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
