/**
 * Pure helpers for inferring participant message activity from Message rows.
 */

export interface MessageRow {
  timestamp?: string;
  senderId?: string;
  direction?: string;
}

function normalizeId(s: string): string {
  return s.trim();
}

function senderMatches(rowSender: string | undefined, candidates: string[]): boolean {
  if (!rowSender) return false;
  const norm = normalizeId(rowSender);
  return candidates.some(c => normalizeId(c) === norm);
}

/**
 * From messages in chronological order (oldest first), return the latest inbound
 * timestamp where senderId matches any of the candidates (userId or phone).
 */
export function getLastInboundForSender(
  messagesOldestFirst: MessageRow[],
  senderIdCandidates: string[]
): Date | null {
  const cands = senderIdCandidates.filter(Boolean);
  if (cands.length === 0) return null;

  let latest: Date | null = null;
  for (const m of messagesOldestFirst) {
    if (m.direction !== "inbound") continue;
    if (!senderMatches(m.senderId, cands)) continue;
    if (!m.timestamp) continue;
    const d = new Date(m.timestamp);
    if (Number.isNaN(d.getTime())) continue;
    if (!latest || d > latest) latest = d;
  }
  return latest;
}
