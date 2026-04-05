/**
 * Gigler Deliverable Generator
 *
 * Creates tangible outputs and hosts them at public URLs.
 * PDFs (pdf-lib), hosted web pages (S3 + CloudFront),
 * code projects, photo collages. Each gets a short URL.
 */

import type { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const s3 = new S3Client({});

const DELIVERABLE_TABLE_NAME = process.env.DELIVERABLE_TABLE_NAME || "";
const GIG_TABLE_NAME = process.env.GIG_TABLE_NAME || "";
const S3_BUCKET_NAME = process.env.STORAGE_AMPLIFYGENFILES_BUCKETNAME || process.env.S3_BUCKET_NAME || "";
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const RESERVED_PATHS = new Set([
  "dashboard", "settings", "pricing", "login", "signup", "api", "examples",
]);

function generateShortCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return RESERVED_PATHS.has(code) ? generateShortCode() : code;
}

export const handler: Handler = async (event) => {
  console.log("[DeliverableGenerator] Event received");

  // TODO: Phase 7 -- Full implementation:
  // 1. Parse deliverable request (type, gigId, content)
  // 2. Generate deliverable based on type:
  //    - PDF: use pdf-lib to create document
  //    - Website/Menu: generate HTML, upload to S3
  //    - Code project: scaffold and deploy to Vercel/Amplify
  //    - Photo collage: aggregate gig photos, generate layout
  // 3. Upload to S3
  // 4. Generate shortCode, create Deliverable record
  // 5. Return public URL (gigler.ai/d/[shortCode])

  return { statusCode: 200, body: "Deliverable generator stub" };
};
