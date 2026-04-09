import { describe, expect, it, vi } from "vitest";
import { generateGigTitle, type TitleDeps } from "../title";

function makeDeps(overrides: Partial<TitleDeps> = {}): TitleDeps {
  return {
    fetch: vi.fn(),
    geminiApiKey: "test-key",
    ...overrides,
  };
}

function mockGeminiTitle(title: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      candidates: [{ content: { parts: [{ text: title }] } }],
    }),
  });
}

describe("generateGigTitle", () => {
  it("returns Gemini-generated title when valid", async () => {
    const deps = makeDeps({ fetch: mockGeminiTitle("Monthly Utility Bill Tracker") });
    const title = await generateGigTitle(
      "I need to track my son's monthly utility bills",
      "household",
      deps
    );
    expect(title).toBe("Monthly Utility Bill Tracker");
  });

  it("returns fallback when Gemini API key is missing", async () => {
    const title = await generateGigTitle("plan a party", "planning", makeDeps({ geminiApiKey: "" }));
    expect(title).toBe("New Planning Gig");
  });

  it("returns fallback when Gemini returns invalid title", async () => {
    const deps = makeDeps({ fetch: mockGeminiTitle("Son's Monthly") });
    const title = await generateGigTitle(
      "I need to track my son's monthly utility bills",
      "household",
      deps
    );
    expect(title).toBe("New Household Gig");
  });

  it("returns fallback when Gemini returns the full user message", async () => {
    const msg = "I need to track my son's monthly utility bills";
    const deps = makeDeps({ fetch: mockGeminiTitle(msg) });
    const title = await generateGigTitle(msg, "household", deps);
    expect(title).toBe("New Household Gig");
  });

  it("returns fallback when Gemini API returns error", async () => {
    const deps = makeDeps({
      fetch: vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "bad request" }),
      }),
    });
    const title = await generateGigTitle("build website", "coding", deps);
    expect(title).toBe("New Coding Gig");
  });

  it("returns fallback when fetch throws", async () => {
    const deps = makeDeps({ fetch: vi.fn().mockRejectedValue(new Error("network")) });
    const title = await generateGigTitle("something", "creative", deps);
    expect(title).toBe("New Creative Gig");
  });

  it("strips surrounding quotes from Gemini response", async () => {
    const deps = makeDeps({ fetch: mockGeminiTitle('"Saturday Birthday Party Plan"') });
    const title = await generateGigTitle(
      "plan a birthday party for Saturday",
      "planning",
      deps
    );
    expect(title).toBe("Saturday Birthday Party Plan");
  });

  it("returns fallback for two-word title", async () => {
    const deps = makeDeps({ fetch: mockGeminiTitle("Birthday Party") });
    const title = await generateGigTitle(
      "plan a birthday party for Saturday",
      "planning",
      deps
    );
    expect(title).toBe("New Planning Gig");
  });

  it("sends correct model and API key in URL", async () => {
    const fetchFn = mockGeminiTitle("Valid Title For Test");
    await generateGigTitle("test", "planning", { fetch: fetchFn, geminiApiKey: "mykey123" });
    const calledUrl = fetchFn.mock.calls[0][0] as string;
    expect(calledUrl).toContain("gemini-2.5-flash");
    expect(calledUrl).toContain("mykey123");
  });

  it("returns fallback when Gemini returns empty text", async () => {
    const deps = makeDeps({
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ candidates: [{ content: { parts: [{ text: "" }] } }] }),
      }),
    });
    const title = await generateGigTitle("test", "planning", deps);
    expect(title).toBe("New Planning Gig");
  });

  it("returns fallback when candidates array is empty", async () => {
    const deps = makeDeps({
      fetch: vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ candidates: [] }),
      }),
    });
    const title = await generateGigTitle("test", "coding", deps);
    expect(title).toBe("New Coding Gig");
  });
});
