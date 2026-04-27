import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ADMIN_EMAIL = "admin@gigler.ai";
const FROM_EMAIL = process.env.INVITE_REQUEST_FROM_EMAIL || "notifications@gigler.ai";
const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-2";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return emailPattern.test(email);
}

export async function POST(request: Request) {
  let email: string;

  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const ses = new SESClient({ region: AWS_REGION });
  const submittedAt = new Date().toISOString();

  try {
    await ses.send(
      new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: {
          ToAddresses: [ADMIN_EMAIL],
        },
        ReplyToAddresses: [email],
        Message: {
          Subject: {
            Charset: "UTF-8",
            Data: "New Gigler closed beta invite request",
          },
          Body: {
            Text: {
              Charset: "UTF-8",
              Data: [
                "New Gigler closed beta invite request",
                "",
                `Email: ${email}`,
                `Submitted at: ${submittedAt}`,
                "",
                "Reply to this email to follow up with the requester.",
              ].join("\n"),
            },
          },
        },
      }),
    );
  } catch (error) {
    console.error("[InviteRequest] Failed to send admin email:", error);
    return NextResponse.json(
      { error: "Could not submit invite request. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message:
      "Request submitted. Gigler is currently invite-only, and we'll follow up if we can add you to the closed beta.",
  });
}
