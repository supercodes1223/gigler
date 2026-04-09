import { describe, expect, it, vi } from "vitest";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { GetCommand, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { processStaleGigsSmart } from "../stale-nudge";

function isCmd(cmd: unknown, Cmd: new (input: object) => object): boolean {
  return cmd instanceof Cmd;
}

describe("processStaleGigsSmart (integration-style, mocked DDB)", () => {
  const nowMs = new Date("2026-04-15T12:00:00.000Z").getTime();
  const oldInteraction = "2026-04-01T00:00:00.000Z";

  it("sends owner fallback nudge when gig is stale and records owner nudge", async () => {
    const staleGig = {
      id: "gig-stale-1",
      ownerId: "user-owner-1",
      title: "My Custom Gig",
      type: "custom",
      status: "active",
      metadata: JSON.stringify({ lastInteraction: oldInteraction, messageCount: 3 }),
      updatedAt: oldInteraction,
      conversationSid: "",
      shortCode: "",
    };

    const mockSend = vi.fn().mockImplementation(async (cmd: unknown) => {
      if (isCmd(cmd, ScanCommand)) {
        return { Items: [staleGig] };
      }
      if (isCmd(cmd, QueryCommand)) {
        const input = (cmd as QueryCommand).input;
        if (input.IndexName === "byGig") {
          return { Items: [] };
        }
        return { Items: [] };
      }
      if (isCmd(cmd, GetCommand)) {
        return { Item: { id: "user-owner-1", phone: "+15550001111", name: "Jamie Smith" } };
      }
      if (isCmd(cmd, PutCommand)) {
        return {};
      }
      throw new Error(`Unexpected command: ${(cmd as object).constructor?.name}`);
    });

    const ddb = { send: mockSend } as unknown as DynamoDBDocumentClient;
    const sendSms = vi.fn().mockResolvedValue(true);
    const fetch = vi.fn();

    const result = await processStaleGigsSmart({
      ddb,
      gigTableName: "Gig",
      reminderTableName: "Reminder",
      messageTableName: "Message",
      gigParticipantTableName: "GigParticipant",
      userTableName: "User",
      geminiApiKey: "",
      geminiModel: "gemini-2.5-flash",
      nowMs,
      sendSms,
      fetch,
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      maskPhone: p => p,
    });

    expect(result.ownerNudges).toBe(1);
    expect(result.participantNudges).toBe(0);
    expect(sendSms).toHaveBeenCalledWith(
      "+15550001111",
      expect.stringContaining("My Custom Gig")
    );
    expect(fetch).not.toHaveBeenCalled();

    const puts = mockSend.mock.calls.filter(c => isCmd(c[0], PutCommand));
    expect(puts.length).toBeGreaterThanOrEqual(1);
    const nudgePut = puts.find(c => (c[0] as PutCommand).input.Item?.type === "nudge");
    expect(nudgePut).toBeDefined();
    expect((nudgePut![0] as PutCommand).input.Item).toMatchObject({
      gigId: "gig-stale-1",
      userId: "user-owner-1",
      type: "nudge",
    });
  });

  it("nudges idle participant in group gig with Gemini disabled (fallback)", async () => {
    const staleGig = {
      id: "gig-group-1",
      ownerId: "user-owner-1",
      title: "Household Bills",
      type: "household",
      status: "active",
      metadata: JSON.stringify({ lastInteraction: oldInteraction }),
      updatedAt: oldInteraction,
      conversationSid: "CHxxxxxxxx",
      shortCode: "abc12",
    };

    const participants = [
      { gigId: "gig-group-1", phone: "+15550001111", role: "owner", userId: "user-owner-1", name: "Jamie" },
      {
        gigId: "gig-group-1",
        phone: "+15550002222",
        role: "collaborator",
        userId: "user-collab-1",
        name: "Jordan",
        joinedAt: "2026-03-01T00:00:00.000Z",
      },
    ];

    const oldMsg = "2026-03-10T00:00:00.000Z";
    const messagesNewestFirst = [
      { gigId: "gig-group-1", timestamp: "2026-04-10T00:00:00.000Z", senderId: "user-owner-1", direction: "inbound" },
      { gigId: "gig-group-1", timestamp: oldMsg, senderId: "+15550002222", direction: "inbound" },
    ];

    const mockSend = vi.fn().mockImplementation(async (cmd: unknown) => {
      if (isCmd(cmd, ScanCommand)) {
        return { Items: [staleGig] };
      }
      if (isCmd(cmd, QueryCommand)) {
        const input = (cmd as QueryCommand).input;
        if (input.TableName === "GigParticipant") {
          return { Items: participants };
        }
        if (input.TableName === "Message") {
          return { Items: messagesNewestFirst };
        }
        if (input.IndexName === "byGig") {
          return { Items: [] };
        }
        return { Items: [] };
      }
      if (isCmd(cmd, GetCommand)) {
        return { Item: { id: "user-owner-1", phone: "+15550001111", name: "Jamie Smith" } };
      }
      if (isCmd(cmd, PutCommand)) {
        return {};
      }
      throw new Error(`Unexpected command: ${(cmd as object).constructor?.name}`);
    });

    const ddb = { send: mockSend } as unknown as DynamoDBDocumentClient;
    const sendSms = vi.fn().mockResolvedValue(true);

    const result = await processStaleGigsSmart({
      ddb,
      gigTableName: "Gig",
      reminderTableName: "Reminder",
      messageTableName: "Message",
      gigParticipantTableName: "GigParticipant",
      userTableName: "User",
      geminiApiKey: "",
      geminiModel: "gemini-2.5-flash",
      nowMs,
      sendSms,
      fetch: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      maskPhone: p => p,
    });

    expect(result.ownerNudges).toBe(1);
    expect(result.participantNudges).toBe(1);

    expect(sendSms).toHaveBeenCalledWith("+15550001111", expect.any(String));
    expect(sendSms).toHaveBeenCalledWith("+15550002222", expect.stringContaining("Household Bills"));

    const puts = mockSend.mock.calls.filter(c => isCmd(c[0], PutCommand));
    const pNudge = puts.find(c => (c[0] as PutCommand).input.Item?.type === "participant_nudge");
    expect(pNudge).toBeDefined();
    expect((pNudge![0] as PutCommand).input.Item).toMatchObject({
      type: "participant_nudge",
      recipients: ["+15550002222"],
    });
  });

  it("skips when no active gigs", async () => {
    const mockSend = vi.fn().mockImplementation(async (cmd: unknown) => {
      if (isCmd(cmd, ScanCommand)) return { Items: [] };
      throw new Error("unexpected");
    });
    const ddb = { send: mockSend } as unknown as DynamoDBDocumentClient;

    const result = await processStaleGigsSmart({
      ddb,
      gigTableName: "Gig",
      reminderTableName: "Reminder",
      messageTableName: "Message",
      gigParticipantTableName: "GigParticipant",
      userTableName: "User",
      geminiApiKey: "",
      geminiModel: "m",
      nowMs,
      sendSms: vi.fn(),
      fetch: vi.fn(),
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      maskPhone: p => p,
    });

    expect(result).toEqual({ ownerNudges: 0, participantNudges: 0 });
  });
});
