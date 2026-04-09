import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { QueryCommand, UpdateCommand, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { Gig } from "./prompts";

export interface DbDeps {
  ddb: DynamoDBDocumentClient;
  gigTableName: string;
  messageTableName: string;
  deliverableTableName: string;
  reminderTableName: string;
  userTableName: string;
  gigParticipantTableName: string;
}

export async function getGig(gigId: string, deps: Pick<DbDeps, "ddb" | "gigTableName">): Promise<Gig | null> {
  const result = await deps.ddb.send(
    new GetCommand({ TableName: deps.gigTableName, Key: { id: gigId } })
  );
  return (result.Item as Gig) || null;
}

export async function updateGigMetadata(
  gigId: string,
  metadata: Record<string, unknown>,
  deps: Pick<DbDeps, "ddb" | "gigTableName">
): Promise<void> {
  await deps.ddb.send(
    new UpdateCommand({
      TableName: deps.gigTableName,
      Key: { id: gigId },
      UpdateExpression: "SET metadata = :meta, updatedAt = :now",
      ExpressionAttributeValues: {
        ":meta": JSON.stringify(metadata),
        ":now": new Date().toISOString(),
      },
    })
  );
}

export async function lookupUserByPhone(
  phone: string,
  deps: Pick<DbDeps, "ddb" | "userTableName">
): Promise<Record<string, unknown> | null> {
  if (!deps.userTableName) return null;
  const result = await deps.ddb.send(
    new QueryCommand({
      TableName: deps.userTableName,
      IndexName: "byPhone",
      KeyConditionExpression: "phone = :phone",
      ExpressionAttributeValues: { ":phone": phone },
    })
  );
  return (result.Items?.[0] as Record<string, unknown>) || null;
}

export async function getGigParticipants(
  gigId: string,
  deps: Pick<DbDeps, "ddb" | "gigParticipantTableName">
): Promise<Array<Record<string, unknown>>> {
  if (!deps.gigParticipantTableName) return [];
  const result = await deps.ddb.send(
    new QueryCommand({
      TableName: deps.gigParticipantTableName,
      KeyConditionExpression: "gigId = :gid",
      ExpressionAttributeValues: { ":gid": gigId },
    })
  );
  return (result.Items as Array<Record<string, unknown>>) || [];
}

export async function findGigByConversationSid(
  conversationSid: string,
  deps: Pick<DbDeps, "ddb" | "gigTableName">
): Promise<Record<string, unknown> | null> {
  const result = await deps.ddb.send(
    new QueryCommand({
      TableName: deps.gigTableName,
      IndexName: "byConversationSid",
      KeyConditionExpression: "conversationSid = :csid",
      ExpressionAttributeValues: { ":csid": conversationSid },
    })
  );
  return (result.Items?.[0] as Record<string, unknown>) || null;
}

export async function reminderExists(
  gigId: string,
  deps: Pick<DbDeps, "ddb" | "reminderTableName">,
  recurrence?: string,
  recurrenceDay?: number
): Promise<boolean> {
  if (!deps.reminderTableName || !recurrence) return false;
  try {
    const result = await deps.ddb.send(
      new QueryCommand({
        TableName: deps.reminderTableName,
        IndexName: "byGig",
        KeyConditionExpression: "gigId = :gid",
        ExpressionAttributeValues: { ":gid": gigId },
      })
    );
    return (result.Items || []).some((r) => {
      const rec = r as Record<string, unknown>;
      return rec.recurrence === recurrence
        && (recurrenceDay === undefined || rec.recurrenceDay === recurrenceDay);
    });
  } catch {
    return false;
  }
}

export async function deliverableExistsRecently(
  gigId: string,
  type: string,
  deps: Pick<DbDeps, "ddb" | "deliverableTableName">
): Promise<boolean> {
  if (!deps.deliverableTableName) return false;
  try {
    const result = await deps.ddb.send(
      new QueryCommand({
        TableName: deps.deliverableTableName,
        IndexName: "byGig",
        KeyConditionExpression: "gigId = :gid",
        ExpressionAttributeValues: { ":gid": gigId },
      })
    );
    const now = Date.now();
    return (result.Items || []).some((d) => {
      const del = d as Record<string, unknown>;
      if (del.type !== type) return false;
      const created = del.createdAt as string | undefined;
      if (!created) return false;
      return now - new Date(created).getTime() < 120_000;
    });
  } catch {
    return false;
  }
}

export async function createReminder(
  params: {
    gigId: string;
    userId: string;
    scheduledAt: string;
    type: string;
    message: string;
    channel: string;
    recipients: string[];
    recurrence?: string;
    recurrenceDay?: number;
  },
  deps: Pick<DbDeps, "ddb" | "reminderTableName">
): Promise<void> {
  if (params.recurrence) {
    const exists = await reminderExists(params.gigId, deps, params.recurrence, params.recurrenceDay);
    if (exists) {
      console.log(`[DB] Skipping duplicate reminder for gig ${params.gigId}`);
      return;
    }
  }

  const id = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  await deps.ddb.send(
    new PutCommand({
      TableName: deps.reminderTableName,
      Item: {
        id,
        ...params,
        sent: false,
        createdAt: new Date().toISOString(),
      },
    })
  );
}

export async function storeMessage(
  params: {
    gigId: string;
    userId: string;
    role: string;
    content: string;
    channel?: string;
  },
  deps: Pick<DbDeps, "ddb" | "messageTableName">
): Promise<void> {
  const id = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  await deps.ddb.send(
    new PutCommand({
      TableName: deps.messageTableName,
      Item: {
        id,
        gigId: params.gigId,
        senderId: params.userId,
        role: params.role,
        content: params.content,
        channel: params.channel || "sms",
        createdAt: new Date().toISOString(),
      },
    })
  );
}

export async function fetchRecentMessages(
  gigId: string,
  limit: number,
  deps: Pick<DbDeps, "ddb" | "messageTableName">
): Promise<Array<{ role: string; content: string }>> {
  const result = await deps.ddb.send(
    new QueryCommand({
      TableName: deps.messageTableName,
      IndexName: "byGig",
      KeyConditionExpression: "gigId = :gid",
      ExpressionAttributeValues: { ":gid": gigId },
      ScanIndexForward: false,
      Limit: limit,
    })
  );
  return ((result.Items || []) as Array<Record<string, unknown>>)
    .reverse()
    .map(m => ({ role: m.role as string, content: m.content as string }));
}
