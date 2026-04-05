/**
 * Shared DynamoDB helper functions.
 * Used by Lambda handlers for consistent database operations.
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

let _client: DynamoDBDocumentClient | null = null;

export function getDynamoClient(): DynamoDBDocumentClient {
  if (!_client) {
    _client = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return _client;
}

export async function queryByGsi<T = Record<string, unknown>>(
  tableName: string,
  indexName: string,
  keyField: string,
  keyValue: string,
  options?: { limit?: number; scanForward?: boolean }
): Promise<T[]> {
  const client = getDynamoClient();
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: indexName,
      KeyConditionExpression: `#key = :val`,
      ExpressionAttributeNames: { "#key": keyField },
      ExpressionAttributeValues: { ":val": keyValue },
      Limit: options?.limit,
      ScanIndexForward: options?.scanForward ?? true,
    })
  );
  return (result.Items as T[]) || [];
}

export async function getItem<T = Record<string, unknown>>(
  tableName: string,
  key: Record<string, string>
): Promise<T | null> {
  const client = getDynamoClient();
  const result = await client.send(
    new GetCommand({ TableName: tableName, Key: key })
  );
  return (result.Item as T) || null;
}

export async function putItem(
  tableName: string,
  item: Record<string, unknown>
): Promise<void> {
  const client = getDynamoClient();
  await client.send(new PutCommand({ TableName: tableName, Item: item }));
}

export async function updateItem(
  tableName: string,
  key: Record<string, string>,
  updates: Record<string, unknown>
): Promise<void> {
  const client = getDynamoClient();
  const entries = Object.entries(updates);
  if (entries.length === 0) return;

  const exprParts: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  entries.forEach(([k, v], i) => {
    exprParts.push(`#f${i} = :v${i}`);
    names[`#f${i}`] = k;
    values[`:v${i}`] = v;
  });

  await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: `SET ${exprParts.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );
}
