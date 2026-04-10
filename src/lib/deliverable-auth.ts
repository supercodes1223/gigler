import { getDynamoClient, queryByGsi } from "./dynamo";
import { PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { createHmac, randomInt } from "crypto";

const DELIVERABLE_TABLE =
  process.env.DELIVERABLE_TABLE_NAME ||
  "Deliverable-v7rrpmhbmbgzjmwqpeflaw2rra-NONE";

const GIG_PARTICIPANT_TABLE =
  process.env.GIG_PARTICIPANT_TABLE_NAME ||
  "GigParticipant-v7rrpmhbmbgzjmwqpeflaw2rra-NONE";

const USER_TABLE =
  process.env.USER_TABLE_NAME ||
  "User-v7rrpmhbmbgzjmwqpeflaw2rra-NONE";

const ACCESS_TABLE =
  process.env.DELIVERABLE_ACCESS_TABLE_NAME ||
  "DeliverableAccess-v7rrpmhbmbgzjmwqpeflaw2rra-NONE";

const COOKIE_SECRET = process.env.COOKIE_SECRET || "gigler-deliverable-access-secret-2026";
const COOKIE_NAME = "gigler_access";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds
const CODE_TTL_SECONDS = 600; // 10 minutes

export { COOKIE_NAME, COOKIE_MAX_AGE };

export interface DeliverableRecord {
  gigId: string;
  deliverableId: string;
  type: string;
  title: string;
  s3Key: string;
  publicUrl: string;
  shortCode: string;
  createdAt: string;
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (raw.startsWith("+")) return raw;
  return `+${digits}`;
}

export async function getDeliverableByShortCode(shortCode: string): Promise<DeliverableRecord | null> {
  const results = await queryByGsi<DeliverableRecord>(
    DELIVERABLE_TABLE,
    "byShortCode",
    "shortCode",
    shortCode,
    { limit: 1 },
  );
  return results[0] || null;
}

export async function isPhoneAuthorized(gigId: string, phone: string): Promise<boolean> {
  const ddb = getDynamoClient();

  const participantResult = await ddb.send(
    new GetCommand({
      TableName: GIG_PARTICIPANT_TABLE,
      Key: { gigId, phone },
    }),
  );
  if (participantResult.Item) return true;

  const ownerResults = await queryByGsi(
    USER_TABLE,
    "byPhone",
    "phone",
    phone,
    { limit: 10 },
  );
  for (const user of ownerResults) {
    const userId = (user as Record<string, string>).id;
    if (!userId) continue;
    const gigs = await queryByGsi(
      process.env.GIG_TABLE_NAME || "Gig-v7rrpmhbmbgzjmwqpeflaw2rra-NONE",
      "byOwner",
      "ownerId",
      userId,
      { limit: 50 },
    );
    if (gigs.some((g) => (g as Record<string, string>).id === gigId)) return true;
  }

  return false;
}

export function generateCode(): string {
  return String(randomInt(100000, 999999));
}

export async function storeVerificationCode(shortCode: string, phone: string, code: string): Promise<void> {
  const ddb = getDynamoClient();
  const expiresAt = Math.floor(Date.now() / 1000) + CODE_TTL_SECONDS;
  await ddb.send(
    new PutCommand({
      TableName: ACCESS_TABLE,
      Item: { shortCode, phone, code, expiresAt, verified: false },
    }),
  );
}

export async function verifyCode(shortCode: string, phone: string, code: string): Promise<boolean> {
  const ddb = getDynamoClient();
  const result = await ddb.send(
    new GetCommand({
      TableName: ACCESS_TABLE,
      Key: { shortCode, phone },
    }),
  );
  const item = result.Item;
  if (!item) return false;
  if (item.code !== code) return false;
  if (typeof item.expiresAt === "number" && item.expiresAt < Math.floor(Date.now() / 1000)) return false;
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
