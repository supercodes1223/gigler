/**
 * Gigler Inbound SMS Handler (Main Brain)
 *
 * Direct Twilio webhook handler for the Gigler phone number.
 * Handles all inbound SMS/MMS: user identification, onboarding,
 * gig routing, and Gemini AI intent detection.
 *
 * Flow:
 * 1. Inbound SMS -> Identify user by phone (GSI lookup)
 * 2. New user? -> Onboarding flow (create account, welcome message)
 * 3. Existing user? -> Is this a gig thread? (match by Conversation SID)
 *    - Yes -> Route to gigler-gig-processor
 *    - No  -> Intent detection (create gig, list gigs, resume, general)
 */

import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const ses = new SESClient({});

const USER_TABLE_NAME = process.env.USER_TABLE_NAME || "";
const GIG_TABLE_NAME = process.env.GIG_TABLE_NAME || "";
const MESSAGE_TABLE_NAME = process.env.MESSAGE_TABLE_NAME || "";
const GIG_PARTICIPANT_TABLE_NAME = process.env.GIG_PARTICIPANT_TABLE_NAME || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const GIGLER_NUMBER = process.env.GIGLER_NUMBER || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

interface TwilioSmsWebhook {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  FromCity?: string;
  FromState?: string;
  MediaUrl0?: string;
  MediaUrl1?: string;
  MediaUrl2?: string;
  MediaUrl3?: string;
  MediaUrl4?: string;
  MediaContentType0?: string;
  MediaContentType1?: string;
  MediaContentType2?: string;
  MediaContentType3?: string;
  MediaContentType4?: string;
}

interface User {
  id: string;
  phone: string;
  name?: string;
  plan: string;
  onboardingComplete: boolean;
  timezone?: string;
}

function parseTwilioWebhook(body: string): TwilioSmsWebhook {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries()) as unknown as TwilioSmsWebhook;
}

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

async function callGemini(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return "I'm having trouble connecting to my brain right now. Try again in a moment!";
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

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("[Gigler] Inbound SMS event received");

  try {
    const webhook = parseTwilioWebhook(event.body || "");
    const { From: fromPhone, Body: messageBody } = webhook;

    if (!fromPhone || !messageBody) {
      return twimlResponse("");
    }

    console.log(`[Gigler] From: ${fromPhone}, Body: ${messageBody.substring(0, 100)}`);

    const user = await lookupUserByPhone(fromPhone);

    if (!user) {
      // TODO: Phase 3 -- New user onboarding flow
      // Create User record, welcome message, ask name
      console.log(`[Gigler] New user: ${fromPhone}`);
      return twimlResponse(
        "Welcome to Gigler! Let's create your first Gig.\nWhat's your name?"
      );
    }

    // TODO: Phase 4 -- Check if message is from a gig thread (Conversation SID routing)
    // TODO: Phase 4 -- Intent detection (create gig, list gigs, resume, general)

    const systemPrompt = `You are Gigler, an AI assistant that lives in text messages. Your voice is simple, non-pretentious, and action-oriented. You help people get things done by creating and managing Gigs -- projects, tasks, anything they need. You're the anti-app: no downloads, no dashboards required. Just text.

The user's name is ${user.name || "there"}. They are on the ${user.plan || "free"} plan.

Keep responses concise and SMS-friendly (under 320 characters when possible). Be helpful, direct, and warm.`;

    const aiResponse = await callGemini(systemPrompt, messageBody);
    await sendSms(fromPhone, aiResponse);

    return twimlResponse("");
  } catch (error) {
    console.error("[Gigler] Handler error:", error);
    return twimlResponse("Something went wrong. Try again in a moment!");
  }
};
