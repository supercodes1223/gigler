/**
 * Stale-gig detection: owner + participant nudges with Gemini (DI for tests).
 */

import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetCommand, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { getNudgeCadence, getParticipantStaleHours } from "./cadence";
import { generateNudgeSms } from "./gemini-nudge";
import {
  buildOwnerFallbackSms,
  buildParticipantFallbackSms,
  type NudgeContextInput,
  type RosterEntry,
} from "./nudge-context";
import { getLastInboundForSender, type MessageRow } from "./participant-activity";

export const MAX_GEMINI_CALLS_PER_RUN = 15;

export interface StaleNudgeLogger {
  info: (msg: string, data?: Record<string, unknown>) => void;
  warn: (msg: string, data?: Record<string, unknown>) => void;
  error: (msg: string, data?: Record<string, unknown>) => void;
}

export interface ProcessStaleGigsParams {
  ddb: DynamoDBDocumentClient;
  gigTableName: string;
  reminderTableName: string;
  messageTableName: string;
  gigParticipantTableName: string;
  userTableName: string;
  geminiApiKey: string;
  geminiModel: string;
  /** Injectable clock (tests). */
  nowMs: number;
  maxGeminiCalls?: number;
  sendSms: (to: string, body: string) => Promise<boolean>;
  fetch: typeof globalThis.fetch;
  log: StaleNudgeLogger;
  maskPhone: (phone?: string) => string | undefined;
}

export interface ProcessStaleGigsResult {
  ownerNudges: number;
  participantNudges: number;
}

function parseGigMetadata(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

function gigLastActiveMs(gig: Record<string, unknown>): number {
  const meta = parseGigMetadata(gig.metadata);
  const dateStr = (meta.lastInteraction as string) || (gig.updatedAt as string);
  if (dateStr) {
    const t = new Date(dateStr).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (gig.updatedAt) {
    const t = new Date(gig.updatedAt as string).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

function firstName(name: string | undefined | null): string {
  if (!name?.trim()) return "there";
  return name.trim().split(/\s+/)[0] || "there";
}

async function hasRecentOwnerNudge(
  ddb: DynamoDBDocumentClient,
  reminderTable: string,
  gigId: string,
  cooldownHours: number,
  nowMs: number
): Promise<boolean> {
  if (!reminderTable) return false;
  const cutoff = new Date(nowMs - cooldownHours * 60 * 60 * 1000).toISOString();
  const result = await ddb.send(
    new QueryCommand({
      TableName: reminderTable,
      IndexName: "byGig",
      KeyConditionExpression: "gigId = :gid AND scheduledAt > :cutoff",
      FilterExpression: "#t = :nudge",
      ExpressionAttributeNames: { "#t": "type" },
      ExpressionAttributeValues: {
        ":gid": gigId,
        ":cutoff": cutoff,
        ":nudge": "nudge",
      },
      Limit: 1,
    })
  );
  return (result.Items?.length || 0) > 0;
}

async function hasRecentParticipantNudge(
  ddb: DynamoDBDocumentClient,
  reminderTable: string,
  gigId: string,
  phone: string,
  cooldownHours: number,
  nowMs: number
): Promise<boolean> {
  if (!reminderTable) return false;
  const cutoff = new Date(nowMs - cooldownHours * 60 * 60 * 1000).toISOString();
  const result = await ddb.send(
    new QueryCommand({
      TableName: reminderTable,
      IndexName: "byGig",
      KeyConditionExpression: "gigId = :gid AND scheduledAt > :cutoff",
      FilterExpression: "#t = :pn AND contains(recipients, :ph)",
      ExpressionAttributeNames: { "#t": "type" },
      ExpressionAttributeValues: {
        ":gid": gigId,
        ":cutoff": cutoff,
        ":pn": "participant_nudge",
        ":ph": phone,
      },
      Limit: 1,
    })
  );
  return (result.Items?.length || 0) > 0;
}

async function recordOwnerNudge(
  ddb: DynamoDBDocumentClient,
  reminderTable: string,
  gigId: string,
  userId: string,
  nowIso: string
): Promise<void> {
  if (!reminderTable) return;
  await ddb.send(
    new PutCommand({
      TableName: reminderTable,
      Item: {
        id: `nudge_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        gigId,
        userId,
        type: "nudge",
        message: "Stale gig nudge",
        channel: "sms",
        scheduledAt: nowIso,
        sent: true,
        sentAt: nowIso,
      },
    })
  );
}

async function recordParticipantNudge(
  ddb: DynamoDBDocumentClient,
  reminderTable: string,
  gigId: string,
  ownerUserId: string,
  targetPhone: string,
  nowIso: string
): Promise<void> {
  if (!reminderTable) return;
  await ddb.send(
    new PutCommand({
      TableName: reminderTable,
      Item: {
        id: `pnudge_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        gigId,
        userId: ownerUserId,
        type: "participant_nudge",
        message: "Participant stale nudge",
        channel: "sms",
        recipients: [targetPhone],
        scheduledAt: nowIso,
        sent: true,
        sentAt: nowIso,
      },
    })
  );
}

async function getUserNameAndPhone(
  ddb: DynamoDBDocumentClient,
  userTable: string,
  userId: string
): Promise<{ name: string; phone: string } | null> {
  if (!userTable) return null;
  const result = await ddb.send(
    new GetCommand({ TableName: userTable, Key: { id: userId } })
  );
  if (!result.Item?.phone) return null;
  return { name: (result.Item.name as string) || "there", phone: result.Item.phone as string };
}

async function fetchParticipantsForGig(
  ddb: DynamoDBDocumentClient,
  table: string,
  gigId: string
): Promise<Array<Record<string, unknown>>> {
  if (!table) return [];
  const result = await ddb.send(
    new QueryCommand({
      TableName: table,
      KeyConditionExpression: "gigId = :gid",
      ExpressionAttributeValues: { ":gid": gigId },
    })
  );
  return (result.Items as Array<Record<string, unknown>>) || [];
}

async function fetchRecentMessagesForGig(
  ddb: DynamoDBDocumentClient,
  table: string,
  gigId: string,
  limit: number
): Promise<MessageRow[]> {
  if (!table) return [];
  const result = await ddb.send(
    new QueryCommand({
      TableName: table,
      KeyConditionExpression: "gigId = :gid",
      ExpressionAttributeValues: { ":gid": gigId },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  const items = (result.Items || []) as Array<Record<string, unknown>>;
  const rows: MessageRow[] = items.map(it => ({
    timestamp: it.timestamp as string | undefined,
    senderId: it.senderId as string | undefined,
    direction: it.direction as string | undefined,
  }));
  return rows.reverse();
}

function hintsFromMetadata(meta: Record<string, unknown>, gig: Record<string, unknown>): NudgeContextInput["hints"] {
  const messageCount = typeof meta.messageCount === "number" ? meta.messageCount : undefined;
  const hasGroupChat = !!(gig.conversationSid as string)?.trim();
  const shortCode = (gig.shortCode as string) || (meta.shortCode as string) || undefined;
  const hasDeliverableHint = !!(meta.deliverableShortCode || meta.lastDeliverableUrl || shortCode);
  return { messageCount, hasGroupChat, shortCode, hasDeliverableHint };
}

/**
 * Exported for integration tests — same logic as production path.
 */
export async function processStaleGigsSmart(p: ProcessStaleGigsParams): Promise<ProcessStaleGigsResult> {
  const {
    ddb,
    gigTableName,
    reminderTableName,
    messageTableName,
    gigParticipantTableName,
    userTableName,
    geminiApiKey,
    geminiModel,
    nowMs,
    sendSms,
    fetch: fetchFn,
    log,
    maskPhone,
  } = p;

  const maxCalls = p.maxGeminiCalls ?? MAX_GEMINI_CALLS_PER_RUN;
  let geminiCallsLeft = maxCalls;

  let ownerNudges = 0;
  let participantNudges = 0;

  if (!gigTableName) return { ownerNudges: 0, participantNudges: 0 };

  const scanResult = await ddb.send(
    new ScanCommand({
      TableName: gigTableName,
      FilterExpression: "#s = :active",
      ExpressionAttributeNames: { "#s": "status", "#t": "type" },
      ExpressionAttributeValues: { ":active": "active" },
      ProjectionExpression:
        "id, ownerId, title, metadata, updatedAt, #t, description, conversationSid, shortCode",
    })
  );

  const gigs = (scanResult.Items || []) as Array<Record<string, unknown>>;

  for (const gig of gigs) {
    const gigId = gig.id as string;
    const ownerId = gig.ownerId as string;
    const title = (gig.title as string) || "Untitled";
    const gigType = (gig.type as string) || "custom";
    const description = (gig.description as string) || undefined;
    const conversationSid = (gig.conversationSid as string) || "";

    const cadence = getNudgeCadence(gigType);
    const staleCutoff = nowMs - cadence.staleHours * 60 * 60 * 1000;

    const lastActive = gigLastActiveMs(gig);
    if (lastActive === 0 || lastActive > staleCutoff) continue;

    const daysIdle = Math.floor((nowMs - lastActive) / (1000 * 60 * 60 * 24));
    const meta = parseGigMetadata(gig.metadata);
    const hints = hintsFromMetadata(meta, gig);

    // Build participant roster for context-aware nudges (used by both owner and participant paths)
    let roster: RosterEntry[] = [];
    let participants: Array<Record<string, unknown>> = [];
    let messages: MessageRow[] = [];

    if (conversationSid && gigParticipantTableName && messageTableName) {
      participants = await fetchParticipantsForGig(ddb, gigParticipantTableName, gigId);
      if (participants.length >= 2) {
        messages = await fetchRecentMessagesForGig(ddb, messageTableName, gigId, 80);
        roster = participants.map(p => {
          const pUserId = (p.userId as string) || "";
          const pPhone = (p.phone as string) || "";
          const lastMsg = getLastInboundForSender(messages, [pUserId, pPhone].filter(Boolean));
          const daysSince = lastMsg
            ? Math.floor((nowMs - lastMsg.getTime()) / (1000 * 60 * 60 * 24))
            : undefined;
          return {
            name: firstName(p.name as string),
            role: (p.role as string) || "collaborator",
            contextLabel: (p.contextLabel as string) || undefined,
            daysSinceLastMessage: daysSince,
            isCurrentRecipient: false,
          };
        });
      }
    }

    const ownerCooldowned = await hasRecentOwnerNudge(
      ddb,
      reminderTableName,
      gigId,
      cadence.cooldownHours,
      nowMs
    );
    if (!ownerCooldowned) {
      const user = await getUserNameAndPhone(ddb, userTableName, ownerId);
      if (user) {
        const ctx: NudgeContextInput = {
          audience: "owner",
          recipientFirstName: firstName(user.name),
          gigTitle: title,
          gigType,
          gigDescription: description,
          daysIdle,
          hints,
          participantRoster: roster.length > 0 ? roster : undefined,
        };

        let body: string | null = null;
        if (geminiApiKey && geminiCallsLeft > 0) {
          geminiCallsLeft -= 1;
          const result = await generateNudgeSms(ctx, {
            fetch: fetchFn,
            apiKey: geminiApiKey,
            model: geminiModel,
          });
          body = result.sms;
        }
        if (!body) {
          body = buildOwnerFallbackSms(firstName(user.name), title, daysIdle);
        }

        const nowIso = new Date(nowMs).toISOString();
        const sent = await sendSms(user.phone, body);
        if (sent) {
          await recordOwnerNudge(ddb, reminderTableName, gigId, ownerId, nowIso);
          ownerNudges++;
          log.info("Sent stale gig owner nudge", {
            gigId,
            ownerId,
            daysIdle,
            phone: maskPhone(user.phone),
          });
        }
      }
    }

    if (participants.length < 2) continue;

    const participantStaleMs = getParticipantStaleHours(gigType) * 60 * 60 * 1000;

    for (const part of participants) {
      const role = part.role as string | undefined;
      if (role === "owner") continue;

      const phone = part.phone as string | undefined;
      if (!phone) continue;

      const partUserId = (part.userId as string) || "";
      const joinedAtStr = part.joinedAt as string | undefined;
      const joinedMs = joinedAtStr ? new Date(joinedAtStr).getTime() : 0;

      const lastInbound = getLastInboundForSender(messages, [partUserId, phone].filter(Boolean));
      const baselineMs = lastInbound
        ? lastInbound.getTime()
        : joinedMs > 0
          ? joinedMs
          : 0;

      if (baselineMs === 0) continue;

      if (nowMs - baselineMs < participantStaleMs) continue;

      const nudgedRecently = await hasRecentParticipantNudge(
        ddb,
        reminderTableName,
        gigId,
        phone,
        cadence.cooldownHours,
        nowMs
      );
      if (nudgedRecently) continue;

      const partDaysSince =
        lastInbound != null
          ? Math.floor((nowMs - lastInbound.getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((nowMs - baselineMs) / (1000 * 60 * 60 * 24));

      const partRoster = roster.map(r => ({
        ...r,
        isCurrentRecipient: r.name === firstName(part.name as string) && r.role !== "owner",
      }));

      const pctx: NudgeContextInput = {
        audience: "participant",
        recipientFirstName: firstName(part.name as string),
        gigTitle: title,
        gigType,
        gigDescription: description,
        daysIdle,
        hints,
        participantDaysSinceMessage: partDaysSince,
        participantRoster: partRoster.length > 0 ? partRoster : undefined,
      };

      let pbody: string | null = null;
      if (geminiApiKey && geminiCallsLeft > 0) {
        geminiCallsLeft -= 1;
        const result = await generateNudgeSms(pctx, {
          fetch: fetchFn,
          apiKey: geminiApiKey,
          model: geminiModel,
        });
        if (result.skip) {
          log.info("Gemini skipped nudge for participant", { gigId, phone: maskPhone(phone) });
          continue;
        }
        pbody = result.sms;
      }
      if (!pbody) {
        pbody = buildParticipantFallbackSms(firstName(part.name as string), title);
      }

      const nowIso = new Date(nowMs).toISOString();
      const psent = await sendSms(phone, pbody);
      if (psent) {
        await recordParticipantNudge(ddb, reminderTableName, gigId, ownerId, phone, nowIso);
        participantNudges++;
        log.info("Sent participant stale nudge", { gigId, phone: maskPhone(phone) });
      }
    }
  }

  return { ownerNudges, participantNudges };
}
