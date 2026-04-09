import { describe, expect, it, vi } from "vitest";
import { detectIntentLocal, detectIntentFallback, detectIntent, type IntentDeps } from "../intent";

describe("detectIntentLocal", () => {
  it("detects list_gigs for 'list'", () => {
    expect(detectIntentLocal("list")).toEqual({ type: "list_gigs" });
  });

  it("detects list_gigs for 'my gigs'", () => {
    expect(detectIntentLocal("my gigs")).toEqual({ type: "list_gigs" });
  });

  it("detects list_gigs for 'show gigs'", () => {
    expect(detectIntentLocal("show gigs")).toEqual({ type: "list_gigs" });
  });

  it("detects complete_gig for 'done'", () => {
    expect(detectIntentLocal("done")).toEqual({ type: "complete_gig" });
  });

  it("detects complete_gig for 'mark done'", () => {
    expect(detectIntentLocal("mark done")).toEqual({ type: "complete_gig" });
  });

  it("detects pause_gig for 'pause'", () => {
    expect(detectIntentLocal("pause")).toEqual({ type: "pause_gig" });
  });

  it("detects archive_gig for 'archive'", () => {
    expect(detectIntentLocal("archive")).toEqual({ type: "archive_gig" });
  });

  it("detects archive_gig for 'delete'", () => {
    expect(detectIntentLocal("delete")).toEqual({ type: "archive_gig" });
  });

  it("returns null for conversational message", () => {
    expect(detectIntentLocal("how is my party planning going?")).toBeNull();
  });

  it("returns null for gig creation request", () => {
    expect(detectIntentLocal("plan a birthday party")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(detectIntentLocal("LIST")).toEqual({ type: "list_gigs" });
    expect(detectIntentLocal("DONE")).toEqual({ type: "complete_gig" });
    expect(detectIntentLocal("Pause")).toEqual({ type: "pause_gig" });
  });
});

describe("detectIntentFallback", () => {
  it("detects create_gig for action words", () => {
    const result = detectIntentFallback("please build me a website");
    expect(result.type).toBe("create_gig");
    expect(result.gigType).toBe("coding");
  });

  it("detects general for non-action messages", () => {
    expect(detectIntentFallback("hello there")).toEqual({ type: "general" });
  });

  it("classifies household gig for bill-related messages", () => {
    const result = detectIntentFallback("help me track utility bills");
    expect(result.type).toBe("create_gig");
    expect(result.gigType).toBe("household");
  });

  it("classifies planning for party-related messages", () => {
    const result = detectIntentFallback("plan a birthday party");
    expect(result.type).toBe("create_gig");
    expect(result.gigType).toBe("planning");
  });
});

describe("detectIntent (with Gemini)", () => {
  function makeDeps(overrides: Partial<IntentDeps> = {}): IntentDeps {
    return {
      fetch: vi.fn(),
      geminiApiKey: "test-key",
      geminiModel: "gemini-test",
      ...overrides,
    };
  }

  it("uses local detection first before calling Gemini", async () => {
    const fetchFn = vi.fn();
    const result = await detectIntent("list", makeDeps({ fetch: fetchFn }));
    expect(result).toEqual({ type: "list_gigs" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("calls Gemini for non-obvious messages", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: '{"type":"create_gig","gigType":"household"}' }] } }],
      }),
    });
    const result = await detectIntent("I need to track bills", makeDeps({ fetch: fetchFn }));
    expect(result.type).toBe("create_gig");
    expect(result.gigType).toBe("household");
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("falls back to local detection when Gemini API key is missing", async () => {
    const result = await detectIntent("help me build a website", makeDeps({ geminiApiKey: "" }));
    expect(result.type).toBe("create_gig");
    expect(result.gigType).toBe("coding");
  });

  it("falls back when Gemini returns unparseable response", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: "not valid json" }] } }],
      }),
    });
    const result = await detectIntent("hello there", makeDeps({ fetch: fetchFn }));
    expect(result.type).toBe("general");
  });

  it("falls back when fetch throws", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("timeout"));
    const result = await detectIntent("plan a party", makeDeps({ fetch: fetchFn }));
    expect(result.type).toBe("create_gig");
    expect(result.gigType).toBe("planning");
  });

  it("parses Gemini response with title", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: '{"type":"create_gig","gigType":"planning","title":"Birthday Bash"}' }] } }],
      }),
    });
    const result = await detectIntent("plan my birthday", makeDeps({ fetch: fetchFn }));
    expect(result.title).toBe("Birthday Bash");
  });
});
