/**
 * Gigler Email Handler
 *
 * Processes inbound emails via SES Receipt Rules.
 * Routes gig@gigler.ai -> user's active gig.
 * Routes [shortCode]@gigler.ai -> specific gig.
 * Extracts info from forwarded emails and syncs to gig thread.
 *
 * Triggered by SES notification (SNS -> Lambda).
 */

import type { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const s3 = new S3Client({});
const ses = new SESClient({});

const GIG_TABLE_NAME = process.env.GIG_TABLE_NAME || "";
const USER_TABLE_NAME = process.env.USER_TABLE_NAME || "";
const MESSAGE_TABLE_NAME = process.env.MESSAGE_TABLE_NAME || "";
const MEDIA_TABLE_NAME = process.env.MEDIA_TABLE_NAME || "";
const S3_BUCKET_NAME = process.env.STORAGE_AMPLIFYGENFILES_BUCKETNAME || process.env.S3_BUCKET_NAME || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const GIGLER_NUMBER = process.env.GIGLER_NUMBER || "";
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || "notifications@gigler.ai";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-pro-preview";

// ── Structured Tracing ───────────────────────────────────────────────────────

function generateTraceId(): string {
  return `trc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

function createLogger(ctx: { traceId: string; requestId: string; source: string; gigId?: string; userId?: string }) {
  const emit = (level: string, message: string, data?: Record<string, unknown>) => {
    const entry = {
      level, ts: new Date().toISOString(),
      traceId: ctx.traceId, requestId: ctx.requestId, source: ctx.source,
      gigId: ctx.gigId, userId: ctx.userId,
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

interface SesNotification {
  Records?: Array<{
    ses?: {
      mail: {
        source: string;
        destination: string[];
        commonHeaders: {
          from: string[];
          to: string[];
          subject: string;
        };
      };
      receipt: {
        action: {
          type: string;
          bucketName?: string;
          objectKey?: string;
        };
      };
    };
  }>;
}

async function lookupUserByEmail(email: string): Promise<Record<string, unknown> | null> {
  if (!USER_TABLE_NAME) return null;
  const result = await ddb.send(
    new QueryCommand({
      TableName: USER_TABLE_NAME,
      IndexName: "byEmail",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: { ":email": email.toLowerCase() },
      Limit: 1,
    })
  );
  return (result.Items?.[0] as Record<string, unknown>) || null;
}

async function lookupGigByShortCode(shortCode: string): Promise<Record<string, unknown> | null> {
  if (!GIG_TABLE_NAME) return null;
  const result = await ddb.send(
    new QueryCommand({
      TableName: GIG_TABLE_NAME,
      IndexName: "byShortCode",
      KeyConditionExpression: "shortCode = :sc",
      ExpressionAttributeValues: { ":sc": shortCode },
      Limit: 1,
    })
  );
  return (result.Items?.[0] as Record<string, unknown>) || null;
}

async function extractInfoWithGemini(emailBody: string): Promise<string> {
  if (!GEMINI_API_KEY) return emailBody.substring(0, 500);

  try {
    console.log(`[EmailHandler] Calling Gemini model: ${GEMINI_MODEL} (email extraction)`);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "Extract key information from this email: dates, times, addresses, confirmation numbers, names, and amounts. Summarize concisely in 2-3 sentences for an SMS message.",
            }],
          },
          contents: [{ role: "user", parts: [{ text: emailBody }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0 },
        }),
      }
    );
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || emailBody.substring(0, 500);
  } catch {
    return emailBody.substring(0, 500);
  }
}

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
        From: GIGLER_NUMBER, To: to, Body: message,
      }).toString(),
    }
  );
}

async function logMessage(
  gigId: string,
  senderId: string,
  senderName: string,
  body: string
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
        direction: "inbound",
        messageType: "system",
      },
    })
  );
}

export const handler: Handler = async (event: SesNotification, context) => {
  const traceId = generateTraceId();
  const log = createLogger({ traceId, requestId: context.awsRequestId, source: "gigler-email-handler" });
  log.info("SES event received");

  const records = event.Records || [];

  for (const record of records) {
    const mail = record.ses?.mail;
    if (!mail) continue;

    const senderEmail = mail.source;
    const recipient = mail.destination?.[0] || "";
    const subject = mail.commonHeaders?.subject || "(no subject)";

    log.info("Processing email", { from: senderEmail, to: recipient, subject });

    // Determine routing
    const recipientLocal = recipient.split("@")[0].toLowerCase();
    let gigId: string | null = null;
    let userId: string | null = null;

    if (recipientLocal === "gig") {
      // Universal gig inbox: match sender email to user
      const user = await lookupUserByEmail(senderEmail);
      if (user) {
        userId = user.id as string;
        // Route to their most recent active gig
        const result = await ddb.send(
          new QueryCommand({
            TableName: GIG_TABLE_NAME,
            IndexName: "byOwner",
            KeyConditionExpression: "ownerId = :uid",
            ExpressionAttributeValues: { ":uid": userId },
          })
        );
        const activeGig = (result.Items || []).find((g) => g.status === "active");
        if (activeGig) gigId = activeGig.id as string;
      }
    } else {
      // Per-gig email: [shortCode]@gigler.ai
      const gig = await lookupGigByShortCode(recipientLocal);
      if (gig) {
        gigId = gig.id as string;
        userId = gig.ownerId as string;
      }
    }

    if (!gigId) {
      log.warn("No gig found for email", { recipient, sender: senderEmail });
      continue;
    }

    const elog = createLogger({ traceId, requestId: context.awsRequestId, source: "gigler-email-handler", gigId, userId: userId || undefined });
    elog.info("Matched email to gig", { routing: recipientLocal === "gig" ? "universal" : "shortCode" });

    // Read email body from S3 if stored there
    let emailBody = subject;
    const s3Action = record.ses?.receipt?.action;
    if (s3Action?.bucketName && s3Action?.objectKey) {
      try {
        const obj = await s3.send(
          new GetObjectCommand({
            Bucket: s3Action.bucketName,
            Key: s3Action.objectKey,
          })
        );
        emailBody = (await obj.Body?.transformToString()) || subject;
      } catch {
        elog.warn("Could not read email from S3", { bucket: s3Action.bucketName, key: s3Action.objectKey });
      }
    }

    // Extract key info with Gemini
    const summary = await extractInfoWithGemini(emailBody);

    // Log to gig conversation
    await logMessage(gigId, senderEmail, senderEmail, `[Email] ${subject}\n\n${summary}`);

    // Notify gig owner via SMS
    if (userId) {
      const { GetCommand } = await import("@aws-sdk/lib-dynamodb");
      const userResult = await ddb.send(
        new GetCommand({ TableName: USER_TABLE_NAME, Key: { id: userId } })
      );
      const phone = userResult.Item?.phone as string;
      if (phone) {
        await sendSms(phone, `Email received for your gig:\n\n${summary}`);
      }
    }
  }

  return { statusCode: 200, body: "Processed" };
};
