import { NextResponse } from "next/server";
import {
  getDeliverableByShortCode,
  isPhoneAuthorized,
  normalizePhone,
  generateCode,
  storeVerificationCode,
} from "@/lib/deliverable-auth";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "AC7b5c64bb04339909eb26c2905f976508";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "f03a5e37fa4c0682eef262acf436376a";
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || "MG27e17138d6d84ebef25d06ccc562756e";

async function sendSmsCode(to: string, code: string): Promise<{ ok: boolean; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error("[Verify] Twilio credentials missing — SID empty:", !TWILIO_ACCOUNT_SID, "Token empty:", !TWILIO_AUTH_TOKEN);
    return { ok: false, error: "SMS service not configured" };
  }
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const body = new URLSearchParams({
      To: to,
      MessagingServiceSid: TWILIO_MESSAGING_SERVICE_SID,
      Body: `Your Gigler verification code is: ${code}\n\nThis code expires in 10 minutes.`,
    });
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });
    if (!resp.ok) {
      const errBody = await resp.text();
      console.error(`[Verify] Twilio API error ${resp.status}: ${errBody}`);
      return { ok: false, error: `SMS delivery failed (${resp.status})` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[Verify] SMS send exception:", err);
    return { ok: false, error: "SMS service error" };
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;

  let phone: string;
  try {
    const body = await request.json();
    phone = normalizePhone(body.phone || "");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!phone || phone.length < 10) {
    return NextResponse.json({ error: "Valid phone number required" }, { status: 400 });
  }

  const deliverable = await getDeliverableByShortCode(shortCode);
  if (!deliverable) {
    return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
  }

  const authorized = await isPhoneAuthorized(deliverable.gigId, phone);
  if (!authorized) {
    return NextResponse.json(
      { error: "This phone number is not associated with this gig" },
      { status: 403 },
    );
  }

  const code = generateCode();
  try {
    await storeVerificationCode(shortCode, phone, code);
  } catch (err) {
    console.error("[Verify] Failed to store verification code:", err);
    return NextResponse.json({ error: "Failed to prepare verification" }, { status: 500 });
  }

  const smsResult = await sendSmsCode(phone, code);
  if (!smsResult.ok) {
    return NextResponse.json(
      { error: smsResult.error || "Failed to send verification code" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, message: "Verification code sent" });
}
