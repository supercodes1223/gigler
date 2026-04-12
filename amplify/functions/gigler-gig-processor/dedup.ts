import { createHash } from "crypto";

export function computeMessageHash(sender: string, body: string, hasMedia: boolean, mediaId?: string): string {
  const normalized = `${sender}|${body.trim().substring(0, 100).toLowerCase()}|${hasMedia}${mediaId ? `|${mediaId}` : ""}`;
  return createHash("sha256").update(normalized).digest("hex").substring(0, 16);
}

export function isDuplicateMessage(metadata: Record<string, unknown>, hash: string): boolean {
  if (metadata.lastProcessedHash !== hash) return false;
  const lastTime = metadata.lastProcessedAt as string | undefined;
  if (!lastTime) return false;
  const elapsed = Date.now() - new Date(lastTime).getTime();
  return elapsed < 60_000;
}
