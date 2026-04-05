/**
 * Gigler Reminder Scheduler
 *
 * EventBridge-triggered Lambda that runs every 5-15 minutes.
 * Queries Reminder table for due items, sends SMS reminders
 * or initiates voice calls. Also detects stale gigs for proactive check-ins.
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
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const GIGLER_NUMBER = process.env.GIGLER_NUMBER || "";

export const handler: Handler = async (event) => {
  console.log("[ReminderScheduler] Triggered");

  // TODO: Phase 8 -- Full implementation:
  // 1. Query Reminder table: scheduledAt <= now AND sent = false
  // 2. For each due reminder:
  //    - channel: 'sms' -> send SMS via Twilio
  //    - channel: 'voice' -> trigger wake-up/check-in call via voice bridge
  // 3. Event countdowns
  // 4. Stale gig detection (active gigs with no messages in 3+ days)
  // 5. Mark reminders as sent

  return { statusCode: 200, body: "Reminder scheduler stub" };
};
