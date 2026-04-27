import { NextResponse } from "next/server";

const INVITE_REQUEST_WEBHOOK_URL =
  process.env.INVITE_REQUEST_WEBHOOK_URL ||
  "https://7j4ltm42m5dnejb7qx5nzyieyq0ecehw.lambda-url.us-east-2.on.aws/";

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

  try {
    const response = await fetch(INVITE_REQUEST_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const result = (await response.json()) as { error?: string; message?: string };

    if (!response.ok) {
      return NextResponse.json(
        { error: result.error || "Could not submit invite request. Please try again." },
        { status: response.status },
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        result.message ||
        "Request submitted. Gigler is currently invite-only, and we'll follow up if we can add you to the closed beta.",
    });
  } catch (error) {
    console.error("[InviteRequest] Failed to submit invite request:", error);
    return NextResponse.json(
      { error: "Could not submit invite request. Please try again." },
      { status: 500 },
    );
  }
}
