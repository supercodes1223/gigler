import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: process.env.AWS_REGION || "us-east-2" });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gigler.ai";
const FROM_EMAIL = process.env.FROM_EMAIL || "notifications@gigler.ai";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://gigler.ai";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  if (event.requestContext?.http?.method === "OPTIONS") {
    return response(204, {});
  }

  let email = "";
  try {
    const body = JSON.parse(event.body || "{}");
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return response(400, { error: "Invalid request body" });
  }

  if (!emailPattern.test(email)) {
    return response(400, { error: "Please enter a valid email address." });
  }

  const submittedAt = new Date().toISOString();

  try {
    await ses.send(
      new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [ADMIN_EMAIL] },
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
    return response(500, { error: "Could not submit invite request. Please try again." });
  }

  return response(200, {
    ok: true,
    message:
      "Request submitted. Gigler is currently invite-only, and we'll follow up if we can add you to the closed beta.",
  });
}
