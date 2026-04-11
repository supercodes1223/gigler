import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDeliverableByShortCode } from "@/lib/appsync";
import { verifyCookie, COOKIE_NAME } from "@/lib/deliverable-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;

  try {
    const deliverable = await getDeliverableByShortCode(shortCode);
    if (!deliverable) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const cookieStore = await cookies();
    const accessCookie = cookieStore.get(COOKIE_NAME)?.value;
    if (!accessCookie || !verifyCookie(accessCookie, shortCode)) {
      return NextResponse.json(
        {
          error: "Verification required",
          code: "AUTH_REQUIRED",
          title: deliverable.title,
          type: deliverable.type,
          createdAt: deliverable.createdAt,
        },
        { status: 401 },
      );
    }

    if (deliverable.publicUrl && deliverable.publicUrl.startsWith("http")) {
      return NextResponse.redirect(deliverable.publicUrl, 302);
    }

    const s3Key = deliverable.s3Key;
    const S3_BUCKET =
      process.env.STORAGE_AMPLIFYGENFILES_BUCKETNAME ||
      process.env.S3_BUCKET_NAME ||
      "";

    if (!s3Key || !S3_BUCKET) {
      return NextResponse.json(
        { error: "Content not available" },
        { status: 404 },
      );
    }

    const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-2" });
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }),
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
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("[API/d] Failed to serve deliverable:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
