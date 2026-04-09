import { describe, expect, it, vi } from "vitest";
import { selectGigByContext, guessTimezone, type RoutingDeps } from "../routing";
import type { AnnotatedGig } from "../utils";

function makeGig(overrides: Partial<AnnotatedGig> & { id: string; title: string }): AnnotatedGig {
  return {
    status: "active",
    type: "general",
    userRole: "owner",
    createdAt: "2026-04-06T00:00:00Z",
    updatedAt: "2026-04-06T00:00:00Z",
    ...overrides,
  };
}

function makeDeps(overrides: Partial<RoutingDeps> = {}): RoutingDeps {
  return {
    fetch: vi.fn(),
    geminiApiKey: "test-key",
    geminiModel: "gemini-test",
    ...overrides,
  };
}

const GIG_A = makeGig({ id: "g1", title: "Birthday Party" });
const GIG_B = makeGig({ id: "g2", title: "Website Redesign" });

describe("selectGigByContext", () => {
  it("returns the selected gig when Gemini returns a number", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: "1" }] } }],
      }),
    });
    const result = await selectGigByContext("about the party", [GIG_A, GIG_B], makeDeps({ fetch: fetchFn }));
    expect("gig" in result).toBe(true);
    if ("gig" in result) {
      expect(result.gig.id).toBe("g1");
    }
  });

  it("returns disambiguation when Gemini says 'ambiguous'", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: "ambiguous" }] } }],
      }),
    });
    const result = await selectGigByContext("update please", [GIG_A, GIG_B], makeDeps({ fetch: fetchFn }));
    expect("ambiguous" in result).toBe(true);
    if ("ambiguous" in result) {
      expect(result.prompt).toContain("Birthday Party");
      expect(result.prompt).toContain("Website Redesign");
    }
  });

  it("returns disambiguation when Gemini fetch fails", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("timeout"));
    const result = await selectGigByContext("test", [GIG_A, GIG_B], makeDeps({ fetch: fetchFn }));
    expect("ambiguous" in result).toBe(true);
  });

  it("returns disambiguation when Gemini returns empty", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ candidates: [] }),
    });
    const result = await selectGigByContext("test", [GIG_A], makeDeps({ fetch: fetchFn }));
    expect("ambiguous" in result).toBe(true);
  });

  it("selects gig 2 when Gemini responds '2'", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: "2" }] } }],
      }),
    });
    const result = await selectGigByContext("website stuff", [GIG_A, GIG_B], makeDeps({ fetch: fetchFn }));
    expect("gig" in result).toBe(true);
    if ("gig" in result) {
      expect(result.gig.id).toBe("g2");
    }
  });
});

describe("guessTimezone", () => {
  it("returns Eastern for NY", () => {
    expect(guessTimezone("NY")).toBe("America/New_York");
  });

  it("returns Mountain for CO", () => {
    expect(guessTimezone("CO")).toBe("America/Denver");
  });

  it("returns Pacific for CA", () => {
    expect(guessTimezone("CA")).toBe("America/Los_Angeles");
  });

  it("returns Alaska for AK", () => {
    expect(guessTimezone("AK")).toBe("America/Anchorage");
  });

  it("returns Hawaii for HI", () => {
    expect(guessTimezone("HI")).toBe("Pacific/Honolulu");
  });

  it("defaults to Central for unknown state", () => {
    expect(guessTimezone("XX")).toBe("America/Chicago");
  });

  it("defaults to Central when state is undefined", () => {
    expect(guessTimezone()).toBe("America/Chicago");
  });

  it("is case-insensitive", () => {
    expect(guessTimezone("ny")).toBe("America/New_York");
    expect(guessTimezone("ca")).toBe("America/Los_Angeles");
  });

  it("handles TX as Central (default)", () => {
    expect(guessTimezone("TX")).toBe("America/Chicago");
  });
});
