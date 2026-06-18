/**
 * Server-side helpers for creating a Gig from the web home page.
 *
 * Flow for a logged-out visitor:
 *   1. submit prompt -> `/api/gig/plan` selects the apps to show
 *   2. enter phone   -> `/api/gig/otp` sends a Twilio SMS OTP
 *   3. enter code    -> `/api/gig/create` verifies the OTP, then upserts the
 *      User, creates the Gig + initial Message, and (best-effort) kicks the
 *      existing `gigler-gig-processor` Lambda so the SMS pipeline picks it up.
 *
 * Everything degrades gracefully: if Twilio / AppSync / the processor Lambda
 * are not configured, the relevant step returns a friendly error instead of
 * throwing, and the build/page still work.
 */

import {
  createGigParticipantRecord,
  createGigRecord,
  createMessageRecord,
  createUserRecord,
  findUserByPhone,
  isAppsyncConfigured,
  type UserRecord,
} from "./appsync";
import { classifyGigType } from "./apps";
import {
  generateCode,
  normalizePhone,
  storeVerificationCode,
  verifyCode,
} from "./deliverable-auth";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || "";
const GIGLER_NUMBER = process.env.GIGLER_NUMBER || "";
const GIG_PROCESSOR_FUNCTION_NAME = process.env.GIG_PROCESSOR_FUNCTION_NAME || "";

/** Namespace used to store web sign-up OTPs in the DeliverableAccess table. */
const OTP_SHORTCODE = "__web_gig_signup__";

export { normalizePhone };

export function isSmsConfigured(): boolean {
  return Boolean(
    TWILIO_ACCOUNT_SID &&
      TWILIO_AUTH_TOKEN &&
      (TWILIO_MESSAGING_SERVICE_SID || GIGLER_NUMBER),
  );
}

export function isGigCreationConfigured(): boolean {
  return isAppsyncConfigured();
}

async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  if (!isSmsConfigured()) {
    return { ok: false, error: "SMS service not configured" };
  }
  try {
    const params: Record<string, string> = { To: to, Body: body };
    if (TWILIO_MESSAGING_SERVICE_SID) {
      params.MessagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
    } else {
      params.From = GIGLER_NUMBER;
    }
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(params).toString(),
      },
    );
    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[WebGig] Twilio error ${resp.status}: ${errText.slice(0, 300)}`);
      return { ok: false, error: `SMS delivery failed (${resp.status})` };
    }
    return { ok: true };
  } catch (err) {
    console.error("[WebGig] SMS send exception:", err);
    return { ok: false, error: "SMS service error" };
  }
}

export async function sendOtp(phone: string): Promise<{ ok: boolean; error?: string }> {
  const code = generateCode();
  try {
    await storeVerificationCode(OTP_SHORTCODE, phone, code);
  } catch (err) {
    console.error("[WebGig] Failed to store OTP:", err);
    return { ok: false, error: "Could not prepare verification" };
  }
  return sendSms(
    phone,
    `Your Gigler code is ${code}. We'll text you to continue your Gig over the phone if needed.`,
  );
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  return verifyCode(OTP_SHORTCODE, phone, code);
}

function generateShortCode(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/**
 * Best-effort async invoke of the gig processor Lambda. Amplify Hosting SSR
 * usually has no IAM credentials, so this is wrapped to never throw — the Gig
 * is already persisted via AppSync regardless.
 */
async function invokeProcessor(payload: Record<string, unknown>): Promise<void> {
  if (!GIG_PROCESSOR_FUNCTION_NAME) return;
  try {
    const { LambdaClient, InvokeCommand } = await import("@aws-sdk/client-lambda");
    const client = new LambdaClient({});
    await client.send(
      new InvokeCommand({
        FunctionName: GIG_PROCESSOR_FUNCTION_NAME,
        InvocationType: "Event",
        Payload: new TextEncoder().encode(JSON.stringify(payload)),
      }),
    );
  } catch (err) {
    console.warn("[WebGig] Processor invoke skipped/failed (non-blocking):", err);
  }
}

export interface CreateGigInput {
  prompt: string;
  apps: string[];
  title?: string;
  phone: string;
  name?: string;
}

export interface CreateGigResult {
  gigId: string;
  shortCode: string;
}

export async function createWebGig(input: CreateGigInput): Promise<CreateGigResult> {
  const phone = normalizePhone(input.phone);
  const gigType = classifyGigType(input.prompt);
  const title = (input.title || input.prompt).trim().slice(0, 80) || "New Gig";
  const shortCode = generateShortCode();

  let user: UserRecord | null = await findUserByPhone(phone);
  if (!user) {
    user = await createUserRecord(phone, input.name);
  }

  const metadata = JSON.stringify({
    source: "web",
    prompt: input.prompt,
    selectedApps: input.apps,
    createdVia: "home_page",
  });

  const gig = await createGigRecord({
    ownerId: user.id,
    title,
    description: input.prompt,
    type: gigType,
    shortCode,
    metadata,
  });

  await createGigParticipantRecord(gig.id, phone, user.id, user.name || input.name);
  await createMessageRecord(gig.id, user.id, user.name || phone, input.prompt);

  // Best-effort: let the existing fulfillment engine pick it up.
  await invokeProcessor({
    gigId: gig.id,
    userId: user.id,
    message: input.prompt,
    mediaUrls: [],
    phone,
    senderName: user.name || input.name,
    skipReply: false,
    _trace: { source: "web-gig-create" },
  });

  return { gigId: gig.id, shortCode: gig.shortCode };
}
