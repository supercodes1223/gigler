/**
 * Gigler Deliverable Generator
 *
 * Creates tangible outputs: PDFs, web pages, code projects, collages.
 * Each deliverable gets a unique short URL (6-char alphanumeric).
 *
 * Invocation: Direct Lambda from gig-processor.
 * Event: { gigId, userId, type, title, content, phone }
 */

import type { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gigler.ai";

const RESERVED_PATHS = new Set([
  "dashboard", "settings", "pricing", "login", "signup", "api", "examples",
  "d", "admin", "billing", "help", "support",
]);

interface DeliverableEvent {
  gigId: string;
  userId: string;
  type: "pdf" | "website" | "menu" | "collage" | "code_project";
  title: string;
  content: string;
  phone: string;
}

function generateShortCode(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return RESERVED_PATHS.has(code) ? generateShortCode() : code;
}

async function isShortCodeTaken(shortCode: string): Promise<boolean> {
  if (!DELIVERABLE_TABLE_NAME) return false;
  const result = await ddb.send(
    new QueryCommand({
      TableName: DELIVERABLE_TABLE_NAME,
      IndexName: "byShortCode",
      KeyConditionExpression: "shortCode = :sc",
      ExpressionAttributeValues: { ":sc": shortCode },
      Limit: 1,
    })
  );
  return (result.Items?.length || 0) > 0;
}

async function getUniqueShortCode(): Promise<string> {
  let code = generateShortCode();
  let attempts = 0;
  while (await isShortCodeTaken(code) && attempts < 10) {
    code = generateShortCode();
    attempts++;
  }
  return code;
}

async function uploadToS3(key: string, body: string | Buffer, contentType: string): Promise<string> {
  if (!S3_BUCKET_NAME) return "";
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return CLOUDFRONT_DOMAIN ? `https://${CLOUDFRONT_DOMAIN}/${key}` : `s3://${S3_BUCKET_NAME}/${key}`;
}

async function generatePdfContent(title: string, content: string): Promise<Buffer> {
  // Simple PDF generation using raw PDF format
  // In production, use pdf-lib for proper PDF generation
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${title.length + content.length + 100} >>
stream
BT
/F1 18 Tf
72 720 Td
(${title}) Tj
/F1 12 Tf
72 680 Td
(${content.substring(0, 500).replace(/[()\\]/g, " ")}) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`;
  return Buffer.from(pdfContent);
}

function generateHtmlPage(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Gigler</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="Created with Gigler - AI that lives in your texts">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #0f172a; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 2rem; margin-bottom: 1rem; }
    .content { margin-top: 1.5rem; white-space: pre-line; }
    .footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 0.875rem; }
    .footer a { color: #4f46e5; text-decoration: none; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="content">${content}</div>
  <div class="footer">Created with <a href="${SITE_URL}">Gigler</a></div>
</body>
</html>`;
}

export const handler: Handler = async (event: DeliverableEvent) => {
  console.log(`[DeliverableGenerator] Creating ${event.type} for gig ${event.gigId}`);

  const shortCode = await getUniqueShortCode();
  const deliverableId = `del_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const now = new Date().toISOString();

  let s3Key = "";
  let publicUrl = "";

  switch (event.type) {
    case "pdf": {
      const pdfBuffer = await generatePdfContent(event.title, event.content);
      s3Key = `deliverables/${event.gigId}/${deliverableId}.pdf`;
      publicUrl = await uploadToS3(s3Key, pdfBuffer, "application/pdf");
      break;
    }
    case "website":
    case "menu": {
      const html = generateHtmlPage(event.title, event.content);
      s3Key = `deliverables/${event.gigId}/${deliverableId}/index.html`;
      publicUrl = await uploadToS3(s3Key, html, "text/html");
      break;
    }
    case "collage": {
      s3Key = `deliverables/${event.gigId}/${deliverableId}/collage.html`;
      const html = generateHtmlPage(event.title, "Photo collage coming soon...");
      publicUrl = await uploadToS3(s3Key, html, "text/html");
      break;
    }
    case "code_project": {
      s3Key = `deliverables/${event.gigId}/${deliverableId}/readme.html`;
      const html = generateHtmlPage(event.title, event.content);
      publicUrl = await uploadToS3(s3Key, html, "text/html");
      break;
    }
  }

  const giglerUrl = `${SITE_URL}/${shortCode}`;

  await ddb.send(
    new PutCommand({
      TableName: DELIVERABLE_TABLE_NAME,
      Item: {
        gigId: event.gigId,
        deliverableId,
        type: event.type,
        title: event.title,
        s3Key,
        publicUrl: publicUrl || giglerUrl,
        shortCode,
        createdAt: now,
      },
    })
  );

  console.log(`[DeliverableGenerator] Created ${event.type}: ${giglerUrl}`);
  return {
    statusCode: 200,
    body: JSON.stringify({
      deliverableId,
      shortCode,
      url: giglerUrl,
      s3Key,
    }),
  };
};
