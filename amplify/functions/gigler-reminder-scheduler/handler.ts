/**
 * Gigler Reminder Scheduler
 *
 * EventBridge-triggered Lambda running every 5 minutes.
 * Queries due reminders, sends SMS/voice, detects stale gigs.
 */

import type { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const lambdaClient = new LambdaClient({});

const REMINDER_TABLE_NAME = process.env.REMINDER_TABLE_NAME || "";
const USER_TABLE_NAME = process.env.USER_TABLE_NAME || "";
const GIG_TABLE_NAME = process.env.GIG_TABLE_NAME || "";
const MESSAGE_TABLE_NAME = process.env.MESSAGE_TABLE_NAME || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const GIGLER_NUMBER = process.env.GIGLER_NUMBER || "";
const VOICE_BRIDGE_FUNCTION_NAME = process.env.VOICE_BRIDGE_FUNCTION_NAME || "";

// ── Structured Tracing ───────────────────────────────────────────────────────

function generateTraceId(): string {
  return `trc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

function maskPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.length > 4 ? `***${phone.slice(-4)}` : phone;
}

function createLogger(ctx: { traceId: string; requestId: string; source: string; gigId?: string; userId?: string; phone?: string }) {
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

async function sendSms(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !GIGLER_NUMBER) return false;
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
          From: GIGLER_NUMBER, To: to, Body: message,
        }).toString(),
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function markReminderSent(reminderId: string): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: REMINDER_TABLE_NAME,
      Key: { id: reminderId },
      UpdateExpression: "SET sent = :val, sentAt = :now",
      ExpressionAttributeValues: {
        ":val": true,
        ":now": new Date().toISOString(),
      },
    })
  );
}

async function fetchDueReminders(): Promise<Array<Record<string, unknown>>> {
  if (!REMINDER_TABLE_NAME) return [];
  const now = new Date().toISOString();

  const result = await ddb.send(
    new QueryCommand({
      TableName: REMINDER_TABLE_NAME,
      IndexName: "byScheduledAt",
      KeyConditionExpression: "scheduledAt <= :now",
      FilterExpression: "sent = :false",
      ExpressionAttributeValues: {
        ":now": now,
        ":false": false,
      },
    })
  );
  return (result.Items as Record<string, unknown>[]) || [];
}

async function getUserPhone(userId: string): Promise<string | null> {
  if (!USER_TABLE_NAME) return null;
  const { GetCommand } = await import("@aws-sdk/lib-dynamodb");
  const result = await ddb.send(
    new GetCommand({ TableName: USER_TABLE_NAME, Key: { id: userId } })
  );
  return (result.Item?.phone as string) || null;
}

export const handler: Handler = async (_event, context) => {
  const traceId = generateTraceId();
  const log = createLogger({ traceId, requestId: context.awsRequestId, source: "gigler-reminder-scheduler" });
  log.info("Scheduled trigger fired");

  const reminders = await fetchDueReminders();
  log.info("Fetched due reminders", { count: reminders.length });

  let sent = 0;
  for (const reminder of reminders) {
    const channel = reminder.channel as string;
    const message = (reminder.message as string) || "Reminder from Gigler!";
    const recipients = (reminder.recipients as string[]) || [];
    const userId = reminder.userId as string;
    const reminderId = reminder.id as string;
    const gigId = (reminder.gigId as string) || undefined;

    const rlog = createLogger({ traceId, requestId: context.awsRequestId, source: "gigler-reminder-scheduler", gigId, userId });

    let phones: string[] = [];
    if (recipients.length > 0) {
      phones = recipients;
    } else if (userId) {
      const phone = await getUserPhone(userId);
      if (phone) phones = [phone];
    }

    if (phones.length === 0) {
      rlog.warn("No recipient phones for reminder", { reminderId });
      continue;
    }

    rlog.info("Processing reminder", { reminderId, channel, recipientCount: phones.length, reminderType: reminder.type });

    if (channel === "voice" && VOICE_BRIDGE_FUNCTION_NAME) {
      const voiceType = reminder.type === "wake_up_call" ? "wake_up" : "check_in";
      for (const phone of phones) {
        try {
          await lambdaClient.send(
            new InvokeCommand({
              FunctionName: VOICE_BRIDGE_FUNCTION_NAME,
              InvocationType: "Event",
              Payload: new TextEncoder().encode(JSON.stringify({
                type: voiceType, userId, gigId, phone,
                _trace: { traceId, requestId: context.awsRequestId, source: "gigler-reminder-scheduler" },
              })),
            })
          );
          rlog.info("Invoked voice-bridge", { phone: maskPhone(phone), voiceType });
        } catch (error) {
          rlog.error("Voice-bridge invoke failed — falling back to SMS", { phone: maskPhone(phone), error: String(error) });
          await sendSms(phone, message);
        }
      }
    } else if (channel === "voice") {
      rlog.warn("Voice bridge not configured — SMS fallback");
      for (const phone of phones) {
        const prefix = reminder.type === "wake_up_call" ? "Good morning! " : "";
        await sendSms(phone, `${prefix}${message}`);
      }
    } else {
      for (const phone of phones) {
        await sendSms(phone, message);
      }
    }

    await markReminderSent(reminderId);
    sent++;
  }

  log.info("Reminder batch complete", { sent, total: reminders.length });
  return { statusCode: 200, body: `Processed ${sent} reminders` };
};
