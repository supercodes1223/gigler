/**
 * Deliverable access verification helpers.
 *
 * Uses AppSync with API key auth (not raw DynamoDB SDK) because
 * Amplify Hosting SSR does not provide IAM credentials to Next.js.
 */

import {
  getDeliverableByShortCode as appsyncGetDeliverable,
  getGigParticipant,
  getUserByPhone,
  listGigsByOwner,
  getDeliverableAccess,
  putDeliverableAccess,
  type DeliverableRecord,
} from "./appsync";
import { createHmac, randomInt } from "crypto";

const COOKIE_SECRET = process.env.COOKIE_SECRET || "gigler-deliverable-access-secret-2026";
const COOKIE_NAME = "gigler_access";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
const CODE_TTL_SECONDS = 600; // 10 minutes

export { COOKIE_NAME, COOKIE_MAX_AGE };
export type { DeliverableRecord };

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+")) return raw;
  return `+${digits}`;
}

export async function getDeliverableByShortCode(shortCode: string): Promise<DeliverableRecord | null> {
  return appsyncGetDeliverable(shortCode);
}

export async function isPhoneAuthorized(gigId: string, phone: string): Promise<boolean> {
  const participant = await getGigParticipant(gigId, phone);
  if (participant) return true;

  const users = await getUserByPhone(phone);
  for (const user of users) {
    const gigs = await listGigsByOwner(user.id);
    if (gigs.some((g) => g.id === gigId)) return true;
  }

  return false;
}

export function generateCode(): string {
  return String(randomInt(100000, 999999));
}

export async function storeVerificationCode(shortCode: string, phone: string, code: string): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + CODE_TTL_SECONDS;
  await putDeliverableAccess(shortCode, phone, code, expiresAt);
}

export async function verifyCode(shortCode: string, phone: string, code: string): Promise<boolean> {
  const item = await getDeliverableAccess(shortCode, phone);
  if (!item) return false;
  if (item.code !== code) return false;
  if (item.expiresAt < Math.floor(Date.now() / 1000)) return false;
  return true;
}

export function signCookie(shortCode: string, phone: string): string {
  const payload = `${shortCode}:${phone}:${Math.floor(Date.now() / 1000)}`;
  const sig = createHmac("sha256", COOKIE_SECRET).update(payload).digest("hex").slice(0, 16);
  return `${payload}:${sig}`;
}

export function verifyCookie(cookieValue: string, shortCode: string): boolean {
  const parts = cookieValue.split(":");
  if (parts.length !== 4) return false;
  const [sc, phone, tsStr, sig] = parts;
  if (sc !== shortCode) return false;
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts)) return false;
  if (Math.floor(Date.now() / 1000) - ts > COOKIE_MAX_AGE) return false;
  const expected = createHmac("sha256", COOKIE_SECRET)
    .update(`${sc}:${phone}:${tsStr}`)
    .digest("hex")
    .slice(0, 16);
  return sig === expected;
}
