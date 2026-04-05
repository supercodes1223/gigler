/**
 * Gigler Gig Processor (AI Execution Engine)
 *
 * Receives a message + gig context, uses Gemini to understand and act.
 * Type-specific instructions for each gig category. Can trigger
 * deliverable generation, media processing, reminders, and third-party actions.
 */

import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
  PutCommand,
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

async function fetchConversationHistory(
  gigId: string,
  limit: number = 20
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
      content: item.body || "",
      timestamp: item.timestamp || "",
    }));
}

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log("[GigProcessor] Event received");

  // TODO: Phase 4 -- Full implementation:
  // 1. Parse incoming event (gigId, userId, message)
  // 2. Fetch gig metadata (type, status, metadata JSON)
  // 3. Fetch conversation history
  // 4. Build type-specific Gemini prompt
  // 5. Execute AI response (may trigger deliverable gen, media processing, etc.)
  // 6. Write AI response to Message table
  // 7. Send response via SMS

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Gig processor stub" }),
  };
};
