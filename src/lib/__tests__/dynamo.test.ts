import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSend = vi.hoisted(() => vi.fn());

vi.mock("@aws-sdk/client-dynamodb", () => {
  return {
    DynamoDBClient: class MockDynamoDBClient {},
  };
});

vi.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: () => ({ send: mockSend }),
  },
  QueryCommand: class MockQueryCommand {
    input: unknown;
    constructor(input: unknown) { this.input = input; }
  },
  GetCommand: class MockGetCommand {
    input: unknown;
    constructor(input: unknown) { this.input = input; }
  },
  PutCommand: class MockPutCommand {
    input: unknown;
    constructor(input: unknown) { this.input = input; }
  },
  UpdateCommand: class MockUpdateCommand {
    input: unknown;
    constructor(input: unknown) { this.input = input; }
  },
}));

import { queryByGsi, getItem, putItem, updateItem, getDynamoClient } from "../dynamo";

beforeEach(() => {
  mockSend.mockReset();
});

describe("getDynamoClient", () => {
  it("returns a DynamoDBDocumentClient", () => {
    const client = getDynamoClient();
    expect(client).toBeDefined();
    expect(client.send).toBeDefined();
  });
});

describe("queryByGsi", () => {
  it("returns items from GSI query", async () => {
    mockSend.mockResolvedValue({ Items: [{ id: "1", shortCode: "abc" }] });
    const results = await queryByGsi("Table", "byShortCode", "shortCode", "abc");
    expect(results).toEqual([{ id: "1", shortCode: "abc" }]);
  });

  it("returns empty array when no items", async () => {
    mockSend.mockResolvedValue({ Items: undefined });
    const results = await queryByGsi("Table", "index", "field", "value");
    expect(results).toEqual([]);
  });

  it("passes limit and scanForward options", async () => {
    mockSend.mockResolvedValue({ Items: [] });
    await queryByGsi("Table", "index", "field", "value", { limit: 1, scanForward: false });
    const cmd = mockSend.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(cmd.input.Limit).toBe(1);
    expect(cmd.input.ScanIndexForward).toBe(false);
  });

  it("defaults scanForward to true", async () => {
    mockSend.mockResolvedValue({ Items: [] });
    await queryByGsi("Table", "index", "field", "value");
    const cmd = mockSend.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(cmd.input.ScanIndexForward).toBe(true);
  });
});

describe("getItem", () => {
  it("returns item when found", async () => {
    mockSend.mockResolvedValue({ Item: { id: "123", title: "Test" } });
    const result = await getItem("Table", { id: "123" });
    expect(result).toEqual({ id: "123", title: "Test" });
  });

  it("returns null when not found", async () => {
    mockSend.mockResolvedValue({ Item: undefined });
    const result = await getItem("Table", { id: "missing" });
    expect(result).toBeNull();
  });
});

describe("putItem", () => {
  it("sends PutCommand with correct table and item", async () => {
    mockSend.mockResolvedValue({});
    await putItem("Table", { id: "123", name: "test" });
    expect(mockSend).toHaveBeenCalledOnce();
    const cmd = mockSend.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(cmd.input.TableName).toBe("Table");
    expect(cmd.input.Item).toEqual({ id: "123", name: "test" });
  });
});

describe("updateItem", () => {
  it("sends UpdateCommand with correct expression", async () => {
    mockSend.mockResolvedValue({});
    await updateItem("Table", { id: "123" }, { name: "updated", status: "active" });
    expect(mockSend).toHaveBeenCalledOnce();
    const cmd = mockSend.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(cmd.input.TableName).toBe("Table");
    expect(cmd.input.Key).toEqual({ id: "123" });
    expect(cmd.input.UpdateExpression).toContain("SET");
  });

  it("does nothing when updates is empty", async () => {
    await updateItem("Table", { id: "123" }, {});
    expect(mockSend).not.toHaveBeenCalled();
  });
});
