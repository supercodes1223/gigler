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

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const REMINDER_TABLE_NAME = process.env.REMINDER_TABLE_NAME || "";
const USER_TABLE_NAME = process.env.USER_TABLE_NAME || "";
const GIG_TABLE_NAME = process.env.GIG_TABLE_NAME || "";
const MESSAGE_TABLE_NAME = process.env.MESSAGE_TABLE_NAME || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const GIGLER_NUMBER = process.env.GIGLER_NUMBER || "";

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

export const handler: Handler = async () => {
  console.log("[ReminderScheduler] Triggered");

  const reminders = await fetchDueReminders();
  console.log(`[ReminderScheduler] Found ${reminders.length} due reminders`);

  let sent = 0;
  for (const reminder of reminders) {
    const channel = reminder.channel as string;
    const message = (reminder.message as string) || "Reminder from Gigler!";
    const recipients = (reminder.recipients as string[]) || [];
    const userId = reminder.userId as string;

    let phones: string[] = [];
    if (recipients.length > 0) {
      phones = recipients;
    } else if (userId) {
      const phone = await getUserPhone(userId);
      if (phone) phones = [phone];
    }

    if (phones.length === 0) {
      console.warn(`[ReminderScheduler] No phones for reminder ${reminder.id}`);
      continue;
    }

    if (channel === "voice") {
      // Voice reminders route through the voice bridge
      console.log(`[ReminderScheduler] Voice reminder ${reminder.id} -- sending as SMS for now`);
      for (const phone of phones) {
        const prefix = reminder.type === "wake_up_call" ? "Good morning! " : "";
        await sendSms(phone, `${prefix}${message}`);
      }
    } else {
      for (const phone of phones) {
        await sendSms(phone, message);
      }
    }

    await markReminderSent(reminder.id as string);
    sent++;
  }

  console.log(`[ReminderScheduler] Sent ${sent} reminders`);
  return { statusCode: 200, body: `Processed ${sent} reminders` };
};
