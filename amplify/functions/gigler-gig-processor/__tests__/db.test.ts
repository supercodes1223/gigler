import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getGig,
  updateGigMetadata,
  lookupUserByPhone,
  getGigParticipants,
  findGigByConversationSid,
  reminderExists,
  deliverableExistsRecently,
  createReminder,
  storeMessage,
  fetchRecentMessages,
} from "../db";

function mockDdb() {
  return { send: vi.fn() };
}

function makeDeps(ddb = mockDdb()) {
  return {
    ddb: ddb as unknown as import("@aws-sdk/lib-dynamodb").DynamoDBDocumentClient,
    gigTableName: "GigTable",
    messageTableName: "MessageTable",
    deliverableTableName: "DeliverableTable",
    reminderTableName: "ReminderTable",
    userTableName: "UserTable",
    gigParticipantTableName: "ParticipantTable",
  };
}

describe("getGig", () => {
  it("returns gig item when found", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({ Item: { id: "g1", title: "Test", type: "planning", ownerId: "u1", status: "active" } });
    const result = await getGig("g1", { ddb: ddb as any, gigTableName: "T" });
    expect(result).toEqual({ id: "g1", title: "Test", type: "planning", ownerId: "u1", status: "active" });
  });

  it("returns null when not found", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({ Item: undefined });
    const result = await getGig("g_none", { ddb: ddb as any, gigTableName: "T" });
    expect(result).toBeNull();
  });
});

describe("updateGigMetadata", () => {
  it("sends UpdateCommand with correct params", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({});
    const deps = makeDeps(ddb);
    await updateGigMetadata("g1", { bills: ["power"] }, deps);
    expect(ddb.send).toHaveBeenCalledOnce();
    const cmd = ddb.send.mock.calls[0][0];
    expect(cmd.input.Key).toEqual({ id: "g1" });
    expect(cmd.input.ExpressionAttributeValues[":meta"]).toContain('"bills"');
  });
});

describe("lookupUserByPhone", () => {
  it("returns user when found", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({ Items: [{ id: "u1", phone: "+1234" }] });
    const result = await lookupUserByPhone("+1234", { ddb: ddb as any, userTableName: "U" });
    expect(result).toEqual({ id: "u1", phone: "+1234" });
  });

  it("returns null when no items", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({ Items: [] });
    const result = await lookupUserByPhone("+1234", { ddb: ddb as any, userTableName: "U" });
    expect(result).toBeNull();
  });

  it("returns null when userTableName is empty", async () => {
    const result = await lookupUserByPhone("+1234", { ddb: mockDdb() as any, userTableName: "" });
    expect(result).toBeNull();
  });
});

describe("getGigParticipants", () => {
  it("returns participant list", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({ Items: [{ gigId: "g1", name: "Alice" }] });
    const result = await getGigParticipants("g1", { ddb: ddb as any, gigParticipantTableName: "P" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });

  it("returns empty array when table name is empty", async () => {
    const result = await getGigParticipants("g1", { ddb: mockDdb() as any, gigParticipantTableName: "" });
    expect(result).toEqual([]);
  });
});

describe("findGigByConversationSid", () => {
  it("returns gig when found by conversationSid", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({ Items: [{ id: "g1", conversationSid: "CH123" }] });
    const result = await findGigByConversationSid("CH123", { ddb: ddb as any, gigTableName: "G" });
    expect(result?.id).toBe("g1");
  });

  it("returns null when not found", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({ Items: [] });
    const result = await findGigByConversationSid("CH_none", { ddb: ddb as any, gigTableName: "G" });
    expect(result).toBeNull();
  });
});

describe("reminderExists", () => {
  it("returns true when matching reminder exists", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({ Items: [{ recurrence: "monthly", recurrenceDay: 1 }] });
    const result = await reminderExists("g1", { ddb: ddb as any, reminderTableName: "R" }, "monthly", 1);
    expect(result).toBe(true);
  });

  it("returns false when no matching recurrence", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({ Items: [{ recurrence: "weekly", recurrenceDay: 3 }] });
    const result = await reminderExists("g1", { ddb: ddb as any, reminderTableName: "R" }, "monthly", 1);
    expect(result).toBe(false);
  });

  it("returns false when recurrence is undefined", async () => {
    const result = await reminderExists("g1", { ddb: mockDdb() as any, reminderTableName: "R" });
    expect(result).toBe(false);
  });

  it("returns false when table name is empty", async () => {
    const result = await reminderExists("g1", { ddb: mockDdb() as any, reminderTableName: "" }, "monthly");
    expect(result).toBe(false);
  });

  it("returns false on DDB error", async () => {
    const ddb = mockDdb();
    ddb.send.mockRejectedValue(new Error("DDB error"));
    const result = await reminderExists("g1", { ddb: ddb as any, reminderTableName: "R" }, "monthly", 1);
    expect(result).toBe(false);
  });

  it("matches when recurrenceDay is undefined in check (matches any day)", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({ Items: [{ recurrence: "monthly", recurrenceDay: 15 }] });
    const result = await reminderExists("g1", { ddb: ddb as any, reminderTableName: "R" }, "monthly");
    expect(result).toBe(true);
  });
});

describe("deliverableExistsRecently", () => {
  it("returns true when recent matching deliverable exists", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({
      Items: [{ type: "bills_dashboard", createdAt: new Date().toISOString() }],
    });
    const result = await deliverableExistsRecently("g1", "bills_dashboard", { ddb: ddb as any, deliverableTableName: "D" });
    expect(result).toBe(true);
  });

  it("returns false when deliverable is older than 120s", async () => {
    const ddb = mockDdb();
    const old = new Date(Date.now() - 200_000).toISOString();
    ddb.send.mockResolvedValue({ Items: [{ type: "bills_dashboard", createdAt: old }] });
    const result = await deliverableExistsRecently("g1", "bills_dashboard", { ddb: ddb as any, deliverableTableName: "D" });
    expect(result).toBe(false);
  });

  it("returns false when type does not match", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({
      Items: [{ type: "pdf", createdAt: new Date().toISOString() }],
    });
    const result = await deliverableExistsRecently("g1", "bills_dashboard", { ddb: ddb as any, deliverableTableName: "D" });
    expect(result).toBe(false);
  });

  it("returns false when table name is empty", async () => {
    const result = await deliverableExistsRecently("g1", "pdf", { ddb: mockDdb() as any, deliverableTableName: "" });
    expect(result).toBe(false);
  });

  it("returns false on DDB error", async () => {
    const ddb = mockDdb();
    ddb.send.mockRejectedValue(new Error("DDB error"));
    const result = await deliverableExistsRecently("g1", "pdf", { ddb: ddb as any, deliverableTableName: "D" });
    expect(result).toBe(false);
  });
});

describe("createReminder", () => {
  it("creates a reminder with PutCommand", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({ Items: [] });
    const deps = makeDeps(ddb);
    await createReminder({
      gigId: "g1", userId: "u1", scheduledAt: "2026-05-01", type: "reminder",
      message: "Send bills!", channel: "sms", recipients: ["+1234"],
    }, deps);
    expect(ddb.send).toHaveBeenCalledOnce();
    const cmd = ddb.send.mock.calls[0][0];
    expect(cmd.input.Item.gigId).toBe("g1");
    expect(cmd.input.Item.sent).toBe(false);
  });

  it("skips creation if duplicate recurrence exists", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({ Items: [{ recurrence: "monthly", recurrenceDay: 1 }] });
    const deps = makeDeps(ddb);
    await createReminder({
      gigId: "g1", userId: "u1", scheduledAt: "2026-05-01", type: "reminder",
      message: "Send bills!", channel: "sms", recipients: ["+1234"],
      recurrence: "monthly", recurrenceDay: 1,
    }, deps);
    expect(ddb.send).toHaveBeenCalledOnce(); // only the query, no put
  });

  it("creates reminder even with recurrence if no duplicate found", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValueOnce({ Items: [] }); // reminderExists query
    ddb.send.mockResolvedValueOnce({}); // PutCommand
    const deps = makeDeps(ddb);
    await createReminder({
      gigId: "g1", userId: "u1", scheduledAt: "2026-05-01", type: "reminder",
      message: "Send bills!", channel: "sms", recipients: ["+1234"],
      recurrence: "monthly", recurrenceDay: 30,
    }, deps);
    expect(ddb.send).toHaveBeenCalledTimes(2);
  });
});

describe("storeMessage", () => {
  it("stores a message with PutCommand", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({});
    const deps = makeDeps(ddb);
    await storeMessage({ gigId: "g1", userId: "u1", role: "user", content: "Hello" }, deps);
    expect(ddb.send).toHaveBeenCalledOnce();
    const cmd = ddb.send.mock.calls[0][0];
    expect(cmd.input.Item.content).toBe("Hello");
    expect(cmd.input.Item.channel).toBe("sms");
  });
});

describe("fetchRecentMessages", () => {
  it("returns messages in chronological order", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({
      Items: [
        { role: "ai", content: "Second" },
        { role: "user", content: "First" },
      ],
    });
    const deps = makeDeps(ddb);
    const result = await fetchRecentMessages("g1", 20, deps);
    expect(result).toEqual([
      { role: "user", content: "First" },
      { role: "ai", content: "Second" },
    ]);
  });

  it("returns empty array when no messages", async () => {
    const ddb = mockDdb();
    ddb.send.mockResolvedValue({ Items: [] });
    const result = await fetchRecentMessages("g1", 20, makeDeps(ddb));
    expect(result).toEqual([]);
  });
});
