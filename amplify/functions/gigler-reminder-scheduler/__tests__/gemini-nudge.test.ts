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
  it("returns sms:null skip:false when api key missing", async () => {
    const fetch = vi.fn();
    const out = await generateNudgeSms(baseContext, {
      fetch,
      apiKey: "",
      model: "gemini-2.5-flash",
    });
    expect(out).toEqual({ sms: null, skip: false });
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
    expect(out).toEqual({ sms: "Hello from Gigler!", skip: false });
    expect(fetch).toHaveBeenCalledTimes(1);
    const url = (fetch.mock.calls[0][0] as string);
    expect(url).toContain("gemini-2.5-flash");
    expect(url).toContain("key=k");
  });

  it("returns sms:null skip:false on API error", async () => {
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
    expect(out).toEqual({ sms: null, skip: false });
  });

  it("returns sms:null skip:false when no candidates text", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [] }),
    });
    const out = await generateNudgeSms(baseContext, { fetch, apiKey: "k", model: "m" });
    expect(out).toEqual({ sms: null, skip: false });
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
    expect(out.sms).not.toBeNull();
    expect(out.sms!.length).toBeLessThanOrEqual(MAX_NUDGE_SMS_CHARS);
    expect(out.sms!.endsWith("…")).toBe(true);
    expect(out.skip).toBe(false);
  });

  it("returns skip:true when Gemini responds with skip", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"sms":"","skip":true}' }] } }],
      }),
    });
    const out = await generateNudgeSms(baseContext, { fetch, apiKey: "k", model: "m" });
    expect(out).toEqual({ sms: null, skip: true });
  });

  it("returns skip:false when Gemini responds without skip field", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"sms":"Nudge!"}' }] } }],
      }),
    });
    const out = await generateNudgeSms(baseContext, { fetch, apiKey: "k", model: "m" });
    expect(out).toEqual({ sms: "Nudge!", skip: false });
  });

  it("returns skip:false on fetch error (fail-open)", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("network"));
    const out = await generateNudgeSms(baseContext, { fetch, apiKey: "k", model: "m" });
    expect(out).toEqual({ sms: null, skip: false });
  });

  it("includes skip instruction in prompt", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"sms":"hi"}' }] } }],
      }),
    });
    await generateNudgeSms(baseContext, { fetch, apiKey: "k", model: "m" });
    const body = JSON.parse((fetch.mock.calls[0][1] as { body: string }).body);
    const prompt = body.contents[0].parts[0].text;
    expect(prompt).toContain("skip");
    expect(prompt).toContain("bottleneck");
    expect(prompt).toContain("contextLabel");
  });
});
