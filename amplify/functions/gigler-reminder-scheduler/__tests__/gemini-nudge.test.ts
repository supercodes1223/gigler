import { describe, expect, it, vi } from "vitest";
import { generateNudgeSms, MAX_NUDGE_SMS_CHARS } from "../gemini-nudge";

const baseContext = {
  audience: "owner" as const,
  recipientFirstName: "Sam",
  gigTitle: "Test Gig",
  gigType: "household",
  daysIdle: 4,
  hints: {},
};

describe("generateNudgeSms", () => {
  it("returns null when api key missing", async () => {
    const fetch = vi.fn();
    const out = await generateNudgeSms(baseContext, {
      fetch,
      apiKey: "",
      model: "gemini-2.5-flash",
    });
    expect(out).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns parsed sms from JSON response", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"sms":"Hello from Gigler!"}' }] } }],
      }),
    });
    const out = await generateNudgeSms(baseContext, {
      fetch,
      apiKey: "k",
      model: "gemini-2.5-flash",
    });
    expect(out).toBe("Hello from Gigler!");
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = (fetch.mock.calls[0][0] as string);
    expect(url).toContain("gemini-2.5-flash");
    expect(url).toContain("key=k");
  });

  it("returns null on API error", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: "rate" } }),
    });
    const out = await generateNudgeSms(baseContext, {
      fetch,
      apiKey: "k",
      model: "m",
    });
    expect(out).toBeNull();
  });

  it("returns null when no candidates text", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] }),
    });
    expect(
      await generateNudgeSms(baseContext, { fetch, apiKey: "k", model: "m" })
    ).toBeNull();
  });

  it("clamps long sms", async () => {
    const long = "x".repeat(MAX_NUDGE_SMS_CHARS + 50);
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ sms: long }) }] } }],
      }),
    });
    const out = await generateNudgeSms(baseContext, { fetch, apiKey: "k", model: "m" });
    expect(out).not.toBeNull();
    expect(out!.length).toBeLessThanOrEqual(MAX_NUDGE_SMS_CHARS);
    expect(out!.endsWith("…")).toBe(true);
  });
});
