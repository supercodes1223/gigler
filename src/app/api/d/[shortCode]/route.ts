import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { queryByGsi } from "@/lib/dynamo";

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-2" });

const DELIVERABLE_TABLE =
  process.env.DELIVERABLE_TABLE_NAME ||
  "Deliverable-v7rrpmhbmbgzjmwqpeflaw2rra-NONE";

const S3_BUCKET =
  process.env.STORAGE_AMPLIFYGENFILES_BUCKETNAME ||
  process.env.S3_BUCKET_NAME ||
  "";

interface Deliverable {
  s3Key: string;
  publicUrl: string;
  type: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shortCode: string }> }
) {
  const { shortCode } = await params;

  try {
    const results = await queryByGsi<Deliverable>(
      DELIVERABLE_TABLE,
      "byShortCode",
      "shortCode",
      shortCode,
      { limit: 1 }
    );
    const deliverable = results[0];
    if (!deliverable) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (
      deliverable.publicUrl &&
      deliverable.publicUrl.startsWith("http")
    ) {
      return NextResponse.redirect(deliverable.publicUrl, 302);
    }

    const s3Key = deliverable.s3Key;
    if (!s3Key || !S3_BUCKET) {
      return NextResponse.json(
        { error: "Content not available" },
        { status: 404 }
      );
    }

    const obj = await s3.send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key })
    );
    const rawBody = await obj.Body?.transformToByteArray();
    if (!rawBody) {
      return NextResponse.json({ error: "Empty content" }, { status: 404 });
    }

    let contentType = "application/octet-stream";
    if (s3Key.endsWith(".html")) contentType = "text/html; charset=utf-8";
    else if (s3Key.endsWith(".pdf")) contentType = "application/pdf";
    else if (s3Key.endsWith(".json")) contentType = "application/json";

    return new NextResponse(Buffer.from(rawBody), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300, s-maxage=3600",
      },
    });
  } catch (err) {
    console.error("[API/d] Failed to serve deliverable:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
