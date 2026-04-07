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
const GIGLER_NUMBER = process.env.GIGLER_NUMBER || "";
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || "";
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || "";

interface TraceContext { traceId: string; requestId: string; source: string; }

function generateTraceId(): string {
  return `trc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

function maskPhone(phone?: string): string | undefined {
  return phone && phone.length > 4 ? `***${phone.slice(-4)}` : phone;
}

function createLogger(ctx: TraceContext & { gigId?: string; userId?: string; phone?: string }) {
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

interface MediaEvent {
  action: "download_mms" | "generate_image" | "generate_video";
  gigId: string;
  userId: string;
  mediaUrls?: string[];
  prompt?: string;
  phone: string;
  _trace?: TraceContext;
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

async function generateImageWithImagen(prompt: string): Promise<Buffer | null> {
  if (!GEMINI_API_KEY) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[MediaProcessor] Imagen API error:", response.status, errText);
      return null;
    }

    const data = await response.json();
    const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
    return b64 ? Buffer.from(b64, "base64") : null;
  } catch (error) {
    console.error("[MediaProcessor] Imagen generation error:", error);
    return null;
  }
}

function getPublicUrl(s3Key: string): string {
  if (CLOUDFRONT_DOMAIN) return `https://${CLOUDFRONT_DOMAIN}/${s3Key}`;
  if (S3_BUCKET_NAME) return `https://${S3_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
  return "";
}

async function sendMmsToUser(phone: string, body: string, mediaUrl: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !phone) return;

  const params: Record<string, string> = {
    To: phone,
    Body: body,
    From: GIGLER_NUMBER,
    MediaUrl: mediaUrl,
  };
  if (TWILIO_MESSAGING_SERVICE_SID) {
    params.MessagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
  }

  try {
    await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params).toString(),
      }
    );
  } catch (error) {
    console.error("[MediaProcessor] Failed to send MMS:", error);
  }
}

export const handler: Handler = async (event: MediaEvent, context) => {
  const trace = event._trace || { traceId: generateTraceId(), requestId: context.awsRequestId, source: "unknown" };
  const log = createLogger({
    ...trace, source: "gigler-media-processor",
    gigId: event.gigId, userId: event.userId, phone: event.phone,
  });
  log.info("Media processor invoked", { action: event.action });

  switch (event.action) {
    case "download_mms": {
      const urls = event.mediaUrls || [];
      log.info("Downloading MMS media", { urlCount: urls.length });
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
          log.info("Downloaded media file", { mediaId, contentType, s3Key, bytes: buffer.length });
        } catch (error) {
          log.error("Failed to download media", { url, error: String(error) });
        }
      }

      log.info("MMS download complete", { processed: results.length });
      return { statusCode: 200, body: JSON.stringify({ processed: results.length, keys: results }) };
    }

    case "generate_image": {
      const prompt = event.prompt || "";
      log.info("Generating AI image with Imagen 3", { promptPreview: prompt.substring(0, 100) });
      const imageBuffer = await generateImageWithImagen(prompt);

      if (!imageBuffer) {
        log.error("Imagen 3 image generation failed");
        return { statusCode: 500, body: "Failed to generate image" };
      }

      const mediaId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const s3Key = `media/${event.gigId}/${mediaId}.png`;
      await saveToS3(s3Key, imageBuffer, "image/png");
      await createMediaRecord(event.gigId, mediaId, s3Key, "photo", "gigler");

      const publicUrl = getPublicUrl(s3Key);
      if (publicUrl && event.phone) {
        log.info("Sending generated image via MMS", { phone: maskPhone(event.phone) });
        await sendMmsToUser(event.phone, "Here's the image I generated:", publicUrl);
      }

      log.info("Image generated and stored", { mediaId, s3Key, bytes: imageBuffer.length });
      return { statusCode: 200, body: JSON.stringify({ mediaId, s3Key, publicUrl }) };
    }

    case "generate_video": {
      log.warn("Video generation not yet implemented");
      return { statusCode: 501, body: "Video generation coming soon" };
    }

    default:
      log.error("Unknown action", { action: event.action });
      return { statusCode: 400, body: "Unknown action" };
  }
};
