import { describe, expect, it } from "vitest";
import { getLastInboundForSender, type MessageRow } from "../participant-activity";

describe("getLastInboundForSender", () => {
  it("returns null for empty messages", () => {
    expect(getLastInboundForSender([], ["+15551234567"])).toBeNull();
  });

  it("returns null when no candidates", () => {
    const msgs: MessageRow[] = [
      { timestamp: "2026-01-01T00:00:00Z", senderId: "+1", direction: "inbound" },
    ];
    expect(getLastInboundForSender(msgs, [])).toBeNull();
  });

  it("ignores outbound", () => {
    const msgs: MessageRow[] = [
      { timestamp: "2026-01-02T00:00:00Z", senderId: "+15551234567", direction: "outbound" },
    ];
    expect(getLastInboundForSender(msgs, ["+15551234567"])).toBeNull();
  });

  it("matches by phone", () => {
    const msgs: MessageRow[] = [
      { timestamp: "2026-01-01T00:00:00Z", senderId: "+15551111111", direction: "inbound" },
      { timestamp: "2026-01-03T00:00:00Z", senderId: "+15551234567", direction: "inbound" },
    ];
    const d = getLastInboundForSender(msgs, ["+15551234567"]);
    expect(d?.toISOString()).toBe("2026-01-03T00:00:00.000Z");
  });

  it("matches by userId when provided as candidate", () => {
    const msgs: MessageRow[] = [
      { timestamp: "2026-01-02T12:00:00Z", senderId: "user-abc", direction: "inbound" },
    ];
    const d = getLastInboundForSender(msgs, ["user-abc"]);
    expect(d?.toISOString()).toBe("2026-01-02T12:00:00.000Z");
  });

  it("matches either userId or phone in candidates", () => {
    const msgs: MessageRow[] = [
      { timestamp: "2026-01-05T00:00:00Z", senderId: "+19998887777", direction: "inbound" },
    ];
    expect(getLastInboundForSender(msgs, ["user-x", "+19998887777"])?.toISOString()).toBe(
      "2026-01-05T00:00:00.000Z"
    );
  });

  it("trims whitespace in ids", () => {
    const msgs: MessageRow[] = [
      { timestamp: "2026-01-01T00:00:00Z", senderId: "  +15551234567  ", direction: "inbound" },
    ];
    expect(getLastInboundForSender(msgs, ["+15551234567"])).not.toBeNull();
  });

  it("skips invalid timestamps", () => {
    const msgs: MessageRow[] = [
      { timestamp: "not-a-date", senderId: "+1", direction: "inbound" },
      { timestamp: "2026-01-01T00:00:00Z", senderId: "+1", direction: "inbound" },
    ];
    const d = getLastInboundForSender(msgs, ["+1"]);
    expect(d?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
});
