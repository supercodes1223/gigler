/**
 * Gigler Media Processor
 *
 * Handles inbound MMS media (download from Twilio, store in S3)
 * and AI-generated media (images via Gemini Imagen / DALL-E).
 *
 * Invocation: Direct Lambda from inbound-sms or gig-processor.
 * Event: { action, gigId, userId, mediaUrls?, prompt?, phone }
 */

import type { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});
const s3 = new S3Client({});

const MEDIA_TABLE_NAME = process.env.MEDIA_TABLE_NAME || "";
const S3_BUCKET_NAME = process.env.STORAGE_AMPLIFYGENFILES_BUCKETNAME || process.env.S3_BUCKET_NAME || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

interface MediaEvent {
  action: "download_mms" | "generate_image" | "generate_video";
  gigId: string;
  userId: string;
  mediaUrls?: string[];
  prompt?: string;
  phone: string;
}

async function downloadTwilioMedia(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
    },
    redirect: "follow",
  });

  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const arrayBuffer = await response.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType };
}

function getExtensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
  };
  return map[contentType] || "bin";
}

function getMediaType(contentType: string): string {
  if (contentType.startsWith("image/")) return "photo";
  if (contentType.startsWith("video/")) return "video";
  if (contentType.startsWith("audio/")) return "voice_note";
  if (contentType === "application/pdf") return "pdf";
  return "document";
}

async function saveToS3(key: string, buffer: Buffer, contentType: string): Promise<void> {
  if (!S3_BUCKET_NAME) return;
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

async function createMediaRecord(
  gigId: string,
  mediaId: string,
  s3Key: string,
  type: string,
  uploadedBy: string
): Promise<void> {
  if (!MEDIA_TABLE_NAME) return;
  await ddb.send(
    new PutCommand({
      TableName: MEDIA_TABLE_NAME,
      Item: {
        gigId,
        mediaId,
        s3Key,
        type,
        uploadedBy,
        createdAt: new Date().toISOString(),
      },
    })
  );
}

async function generateImageWithGemini(prompt: string): Promise<Buffer | null> {
  if (!GEMINI_API_KEY) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
          generationConfig: {
            responseModalities: ["TEXT"],
          },
        }),
      }
    );

    const data = await response.json();
    const inlineData = data?.candidates?.[0]?.content?.parts?.find(
      (p: Record<string, unknown>) => p.inlineData
    );

    if (inlineData?.inlineData?.data) {
      return Buffer.from(inlineData.inlineData.data, "base64");
    }
  } catch (error) {
    console.error("[MediaProcessor] Gemini image generation error:", error);
  }

  return null;
}

async function generateImageWithDallE(prompt: string): Promise<Buffer | null> {
  if (!OPENAI_API_KEY) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    });

    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;
    return b64 ? Buffer.from(b64, "base64") : null;
  } catch (error) {
    console.error("[MediaProcessor] DALL-E error:", error);
    return null;
  }
}

export const handler: Handler = async (event: MediaEvent) => {
  console.log(`[MediaProcessor] Action: ${event.action}, Gig: ${event.gigId}`);

  switch (event.action) {
    case "download_mms": {
      const urls = event.mediaUrls || [];
      const results: string[] = [];

      for (const url of urls) {
        try {
          const { buffer, contentType } = await downloadTwilioMedia(url);
          const ext = getExtensionFromContentType(contentType);
          const mediaId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const s3Key = `media/${event.gigId}/${mediaId}.${ext}`;

          await saveToS3(s3Key, buffer, contentType);
          await createMediaRecord(event.gigId, mediaId, s3Key, getMediaType(contentType), event.userId);
          results.push(s3Key);
        } catch (error) {
          console.error(`[MediaProcessor] Failed to download: ${url}`, error);
        }
      }

      return { statusCode: 200, body: JSON.stringify({ processed: results.length, keys: results }) };
    }

    case "generate_image": {
      const prompt = event.prompt || "";
      let imageBuffer = await generateImageWithGemini(prompt);
      if (!imageBuffer) {
        imageBuffer = await generateImageWithDallE(prompt);
      }

      if (!imageBuffer) {
        return { statusCode: 500, body: "Failed to generate image" };
      }

      const mediaId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const s3Key = `media/${event.gigId}/${mediaId}.png`;
      await saveToS3(s3Key, imageBuffer, "image/png");
      await createMediaRecord(event.gigId, mediaId, s3Key, "photo", "gigler");

      return { statusCode: 200, body: JSON.stringify({ mediaId, s3Key }) };
    }

    case "generate_video": {
      console.log("[MediaProcessor] Video generation not yet implemented");
      return { statusCode: 501, body: "Video generation coming soon" };
    }

    default:
      return { statusCode: 400, body: "Unknown action" };
  }
};
