/**
 * Gigler Email Handler
 *
 * Processes inbound emails via SES Receipt Rules.
 * Routes gig@gigler.ai to user's active gig thread.
 * Routes [shortCode]@gigler.ai to specific gigs.
 * Extracts info from forwarded emails (dates, confirmations, attachments).
 */

import type { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

export const handler: Handler = async (event) => {
  console.log("[EmailHandler] Event received");

  // TODO: Phase 10 -- Full implementation:
  // 1. Parse SES notification (sender, recipient, subject, body, attachments)
  // 2. Route by recipient:
  //    - gig@gigler.ai -> match sender email to User (email GSI) -> active gig
  //    - [shortCode]@gigler.ai -> match shortCode to gig
  // 3. AI extraction (Gemini): dates, addresses, confirmation numbers
  // 4. Store attachments in S3, create Media records
  // 5. Summarize in gig thread via SMS
  // 6. Notify group thread participants

  return { statusCode: 200, body: "Email handler stub" };
};
