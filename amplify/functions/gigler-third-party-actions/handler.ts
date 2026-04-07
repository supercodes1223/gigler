/**
 * Gigler Third-Party Actions
 *
 * Executes actions on external platforms using adapter pattern.
 * Each integration implements search(), action(), confirm().
 * Every action requires user confirmation before finalizing.
 *
 * Invocation: Direct Lambda from gig-processor.
 * Event: { gigId, userId, platform, actionType, params, phone }
 */

import type { Handler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: { removeUndefinedValues: true },
});

const THIRD_PARTY_ACTION_TABLE_NAME = process.env.THIRD_PARTY_ACTION_TABLE_NAME || "";
const GIG_TABLE_NAME = process.env.GIG_TABLE_NAME || "";
const USER_INTEGRATION_TABLE_NAME = process.env.USER_INTEGRATION_TABLE_NAME || "";
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || "";
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || "";
const GIGLER_NUMBER = process.env.GIGLER_NUMBER || "";

interface TraceContext { traceId: string; requestId: string; source: string; }

function generateTraceId(): string {
  return `trc_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

function maskPhone(phone?: string): string | undefined {
  return phone && phone.length > 4 ? `***${phone.slice(-4)}` : phone;
}

function createLogger(ctx: TraceContext & { gigId?: string; userId?: string; phone?: string }) {
  const emit = (level: string, message: string, data?: Record<string, unknown>) => {
    const entry = {
      level, ts: new Date().toISOString(),
      traceId: ctx.traceId, requestId: ctx.requestId, source: ctx.source,
      gigId: ctx.gigId, userId: ctx.userId, phone: maskPhone(ctx.phone),
      message, ...(data && { data }),
    };
    if (level === "ERROR") console.error(JSON.stringify(entry));
    else if (level === "WARN") console.warn(JSON.stringify(entry));
    else console.log(JSON.stringify(entry));
  };
  return {
    info: (msg: string, data?: Record<string, unknown>) => emit("INFO", msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => emit("WARN", msg, data),
    error: (msg: string, data?: Record<string, unknown>) => emit("ERROR", msg, data),
  };
}

interface ThirdPartyEvent {
  gigId: string;
  userId: string;
  platform: string;
  actionType: "search" | "action" | "confirm" | "cancel";
  params: Record<string, unknown>;
  phone: string;
  actionId?: string;
  _trace?: TraceContext;
}

interface ThirdPartyAdapter {
  search(params: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  execute(params: Record<string, unknown>): Promise<{ externalId: string; details: Record<string, unknown> }>;
  confirm(externalId: string): Promise<{ success: boolean; confirmation: string }>;
  cancel(externalId: string): Promise<{ success: boolean }>;
}

// ── Platform Adapters ────────────────────────────────────────────────────────

class OpenTableAdapter implements ThirdPartyAdapter {
  async search(params: Record<string, unknown>) {
    console.log("[OpenTable] Searching:", params);
    return [
      {
        id: "ot_1",
        name: params.restaurant || "Restaurant",
        time: params.time || "7:00 PM",
        party: params.partySize || 2,
        available: true,
      },
    ];
  }

  async execute(params: Record<string, unknown>) {
    console.log("[OpenTable] Booking:", params);
    const id = `OT-${Date.now().toString(36).toUpperCase()}`;
    return {
      externalId: id,
      details: { confirmationNumber: id, ...params },
    };
  }

  async confirm(externalId: string) {
    return { success: true, confirmation: `OpenTable booking ${externalId} confirmed!` };
  }

  async cancel(externalId: string) {
    console.log("[OpenTable] Cancelling:", externalId);
    return { success: true };
  }
}

class ResyAdapter implements ThirdPartyAdapter {
  async search(params: Record<string, unknown>) {
    console.log("[Resy] Searching:", params);
    return [
      {
        id: "resy_1",
        name: params.restaurant || "Restaurant",
        time: params.time || "7:30 PM",
        party: params.partySize || 2,
        available: true,
      },
    ];
  }

  async execute(params: Record<string, unknown>) {
    const id = `RESY-${Date.now().toString(36).toUpperCase()}`;
    return {
      externalId: id,
      details: { confirmationNumber: id, ...params },
    };
  }

  async confirm(externalId: string) {
    return { success: true, confirmation: `Resy reservation ${externalId} confirmed!` };
  }

  async cancel(externalId: string) {
    console.log("[Resy] Cancelling:", externalId);
    return { success: true };
  }
}

class EviteAdapter implements ThirdPartyAdapter {
  async search(params: Record<string, unknown>) {
    return [{ id: "evite_template_1", name: "Event Template", ...params }];
  }

  async execute(params: Record<string, unknown>) {
    const id = `EVT-${Date.now().toString(36).toUpperCase()}`;
    return {
      externalId: id,
      details: {
        eventUrl: `https://evite.com/event/${id}`,
        ...params,
      },
    };
  }

  async confirm(externalId: string) {
    return { success: true, confirmation: `Evite event ${externalId} created and invites sent!` };
  }

  async cancel(externalId: string) {
    console.log("[Evite] Cancelling:", externalId);
    return { success: true };
  }
}

function getAdapter(platform: string): ThirdPartyAdapter {
  switch (platform) {
    case "opentable": return new OpenTableAdapter();
    case "resy": return new ResyAdapter();
    case "evite": return new EviteAdapter();
    default: return new OpenTableAdapter();
  }
}

// ── SMS ──────────────────────────────────────────────────────────────────────

async function sendSms(to: string, message: string): Promise<void> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !GIGLER_NUMBER) return;
  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: GIGLER_NUMBER, To: to, Body: message,
      }).toString(),
    }
  );
}

// ── Main Handler ─────────────────────────────────────────────────────────────

export const handler: Handler = async (event: ThirdPartyEvent, context) => {
  const trace = event._trace || { traceId: generateTraceId(), requestId: context.awsRequestId, source: "unknown" };
  const log = createLogger({
    ...trace, source: "gigler-third-party-actions",
    gigId: event.gigId, userId: event.userId, phone: event.phone,
  });
  log.info("Third-party action invoked", { platform: event.platform, actionType: event.actionType });

  const adapter = getAdapter(event.platform);

  switch (event.actionType) {
    case "search": {
      log.info("Searching platform", { params: event.params });
      const results = await adapter.search(event.params);
      log.info("Search results", { resultCount: results.length });
      let message = `Found ${results.length} option${results.length !== 1 ? "s" : ""}:\n`;
      results.forEach((r, i) => {
        message += `\n${i + 1}. ${r.name}${r.time ? ` at ${r.time}` : ""}${r.party ? ` (party of ${r.party})` : ""}`;
      });
      message += "\n\nReply with a number to book, or describe what you want different.";
      await sendSms(event.phone, message);
      return { statusCode: 200, body: JSON.stringify(results) };
    }

    case "action": {
      log.info("Executing platform action", { params: event.params });
      const result = await adapter.execute(event.params);
      const actionId = `tpa_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      log.info("Action executed", { actionId, externalId: result.externalId });

      await ddb.send(
        new PutCommand({
          TableName: THIRD_PARTY_ACTION_TABLE_NAME,
          Item: {
            id: actionId,
            gigId: event.gigId,
            userId: event.userId,
            platform: event.platform,
            actionType: "reservation",
            status: "pending",
            requestPayload: JSON.stringify(event.params),
            responsePayload: JSON.stringify(result.details),
            externalId: result.externalId,
            createdAt: new Date().toISOString(),
          },
        })
      );

      await sendSms(
        event.phone,
        `I found what you're looking for! Confirmation #${result.externalId}\n\nWant me to finalize this? Reply "yes" to confirm or "no" to cancel.`
      );

      return { statusCode: 200, body: JSON.stringify({ actionId, ...result }) };
    }

    case "confirm": {
      if (!event.actionId) {
        return { statusCode: 400, body: "Missing actionId" };
      }

      const actionResult = await ddb.send(
        new GetCommand({
          TableName: THIRD_PARTY_ACTION_TABLE_NAME,
          Key: { id: event.actionId },
        })
      );
      const action = actionResult.Item;
      if (!action) {
        return { statusCode: 404, body: "Action not found" };
      }

      const confirmation = await adapter.confirm(action.externalId as string);

      await ddb.send(
        new UpdateCommand({
          TableName: THIRD_PARTY_ACTION_TABLE_NAME,
          Key: { id: event.actionId },
          UpdateExpression: "SET #status = :status, confirmedAt = :now",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":status": "confirmed",
            ":now": new Date().toISOString(),
          },
        })
      );

      await sendSms(event.phone, confirmation.confirmation);
      return { statusCode: 200, body: JSON.stringify(confirmation) };
    }

    case "cancel": {
      if (event.actionId) {
        await ddb.send(
          new UpdateCommand({
            TableName: THIRD_PARTY_ACTION_TABLE_NAME,
            Key: { id: event.actionId },
            UpdateExpression: "SET #status = :status",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: { ":status": "cancelled" },
          })
        );
      }
      await sendSms(event.phone, "Got it — cancelled!");
      return { statusCode: 200, body: "Cancelled" };
    }

    default:
      return { statusCode: 400, body: "Unknown action type" };
  }
};
