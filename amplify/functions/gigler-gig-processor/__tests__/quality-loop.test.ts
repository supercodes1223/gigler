import { afterEach, describe, expect, it, vi } from "vitest";
import {
  reviewDraft,
  runQualityLoop,
  appendQualityLog,
  buildQualityMemory,
  isQualityLoopEnabled,
  QUALITY_LOG_MAX_ENTRIES,
  type QualityLoopDeps,
  type QualityLogEntry,
  type ReviewDraftParams,
} from "../quality-loop";
import type { GigAction } from "../vision-utils";

function makeDeps(overrides: Partial<QualityLoopDeps> = {}): QualityLoopDeps {
  return {
    fetch: vi.fn(),
    geminiApiKey: "key_test",
    judgeModel: "gemini-judge-test",
    enabled: true,
    ...overrides,
  };
}

function mockJudgeFetch(judgeOutput: object | string): ReturnType<typeof vi.fn> {
  const text = typeof judgeOutput === "string" ? judgeOutput : JSON.stringify(judgeOutput);
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  });
}

const PROPOSED_ACTIONS: GigAction[] = [
  { type: "add_participant", name: "Jordan", phone: "+15551234567" },
  { type: "set_reminder", scheduledAt: "2026-07-01T09:00:00Z", reminderMessage: "Pay the power bill" },
];

function makeParams(overrides: Partial<ReviewDraftParams> = {}): ReviewDraftParams {
  return {
    draftText: "On it! Adding Jordan to the group and setting the reminder now.",
    proposedActions: PROPOSED_ACTIONS,
    gigContext: { type: "household", title: "Bills Tracker", description: "Track monthly utility bills" },
    userMessage: "Add Jordan +15551234567 and remind us about the power bill July 1",
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("runQualityLoop — approve path", () => {
  it("keeps the draft text and all actions when judge approves", async () => {
    const deps = makeDeps({
      fetch: mockJudgeFetch({ score: 9, verdict: "approve", issues: [], vetoedActionIndexes: [] }),
    });
    const params = makeParams();
    const result = await runQualityLoop(params, deps);

    expect(result.finalText).toBe(params.draftText);
    expect(result.finalActions).toEqual(PROPOSED_ACTIONS);
    expect(result.logEntry).not.toBeNull();
    expect(result.logEntry!.verdict).toBe("approve");
    expect(result.logEntry!.judgeScore).toBe(9);
    expect(result.logEntry!.revised).toBe(false);
    expect(result.logEntry!.vetoedActions).toBe(0);
    expect(result.logEntry!.model).toBe("gemini-judge-test");
    expect(result.logEntry!.ts).toBeTruthy();
  });

  it("calls the judge model with strict JSON config and a timeout signal", async () => {
    const fetchFn = mockJudgeFetch({ score: 8, verdict: "approve", issues: [], vetoedActionIndexes: [] });
    const deps = makeDeps({ fetch: fetchFn, geminiApiKey: "mykey123", judgeModel: "gemini-2.5-flash" });
    await runQualityLoop(makeParams(), deps);

    const [calledUrl, calledOpts] = fetchFn.mock.calls[0];
    expect(calledUrl).toContain("gemini-2.5-flash");
    expect(calledUrl).toContain("mykey123");
    expect(calledOpts.signal).toBeInstanceOf(AbortSignal);

    const body = JSON.parse(calledOpts.body);
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    expect(body.generationConfig.temperature).toBe(0);

    const prompt = body.contents[0].parts[0].text;
    expect(prompt).toContain("On it! Adding Jordan");
    expect(prompt).toContain("Add Jordan +15551234567");
    expect(prompt).toContain("add_participant");
    expect(prompt).toContain("Bills Tracker");
  });
});

describe("runQualityLoop — revise path", () => {
  it("swaps in the revised reply text when verdict is revise", async () => {
    const deps = makeDeps({
      fetch: mockJudgeFetch({
        score: 4,
        verdict: "revise",
        issues: ["Draft does not confirm the reminder date"],
        revisedText: "Done! Jordan's added and I'll remind everyone about the power bill on July 1.",
        vetoedActionIndexes: [],
      }),
    });
    const result = await runQualityLoop(makeParams(), deps);

    expect(result.finalText).toBe("Done! Jordan's added and I'll remind everyone about the power bill on July 1.");
    expect(result.finalActions).toEqual(PROPOSED_ACTIONS);
    expect(result.logEntry!.verdict).toBe("revise");
    expect(result.logEntry!.revised).toBe(true);
    expect(result.logEntry!.judgeScore).toBe(4);
  });

  it("keeps the original draft when verdict is revise but no revisedText is provided", async () => {
    const deps = makeDeps({
      fetch: mockJudgeFetch({ score: 5, verdict: "revise", issues: ["vague"], vetoedActionIndexes: [] }),
    });
    const params = makeParams();
    const result = await runQualityLoop(params, deps);

    expect(result.finalText).toBe(params.draftText);
    expect(result.logEntry!.revised).toBe(false);
  });
});

describe("runQualityLoop — action veto path", () => {
  it("drops vetoed actions by index and keeps the rest", async () => {
    const deps = makeDeps({
      fetch: mockJudgeFetch({
        score: 6,
        verdict: "approve",
        issues: ["add_participant phone does not match anyone the user mentioned"],
        vetoedActionIndexes: [0],
      }),
    });
    const result = await runQualityLoop(makeParams(), deps);

    expect(result.finalActions).toHaveLength(1);
    expect(result.finalActions[0].type).toBe("set_reminder");
    expect(result.logEntry!.vetoedActions).toBe(1);
  });

  it("ignores out-of-range and non-integer veto indexes", async () => {
    const deps = makeDeps({
      fetch: mockJudgeFetch({
        score: 7,
        verdict: "approve",
        issues: [],
        vetoedActionIndexes: [5, -1, 1.5, "0"],
      }),
    });
    const result = await runQualityLoop(makeParams(), deps);

    expect(result.finalActions).toEqual(PROPOSED_ACTIONS);
    expect(result.logEntry!.vetoedActions).toBe(0);
  });
});

describe("runQualityLoop — fail-open behavior", () => {
  it("fails open with the original draft when the judge fetch rejects", async () => {
    const deps = makeDeps({ fetch: vi.fn().mockRejectedValue(new Error("network down")) });
    const params = makeParams();
    const result = await runQualityLoop(params, deps);

    expect(result.finalText).toBe(params.draftText);
    expect(result.finalActions).toEqual(PROPOSED_ACTIONS);
    expect(result.logEntry!.verdict).toBe("error");
    expect(result.logEntry!.judgeScore).toBeNull();
  });

  it("fails open on malformed judge JSON", async () => {
    const deps = makeDeps({ fetch: mockJudgeFetch("I think this reply looks great, ship it!") });
    const params = makeParams();
    const result = await runQualityLoop(params, deps);

    expect(result.finalText).toBe(params.draftText);
    expect(result.finalActions).toEqual(PROPOSED_ACTIONS);
    expect(result.logEntry!.verdict).toBe("error");
  });

  it("fails open when judge JSON is missing required fields", async () => {
    const deps = makeDeps({ fetch: mockJudgeFetch({ verdict: "maybe", issues: [] }) });
    const params = makeParams();
    const result = await runQualityLoop(params, deps);

    expect(result.finalText).toBe(params.draftText);
    expect(result.logEntry!.verdict).toBe("error");
  });

  it("fails open when the Gemini API returns an error object", async () => {
    const deps = makeDeps({
      fetch: vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: { code: 429, message: "rate limited" } }),
      }),
    });
    const params = makeParams();
    const result = await runQualityLoop(params, deps);

    expect(result.finalText).toBe(params.draftText);
    expect(result.logEntry!.verdict).toBe("error");
  });

  it("aborts the judge call after timeoutMs and fails open", async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn().mockImplementation((_url: string, opts: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        opts.signal.addEventListener("abort", () => reject(new Error("aborted")));
      })
    );
    const deps = makeDeps({ fetch: fetchFn, timeoutMs: 50 });
    const params = makeParams();

    const resultPromise = runQualityLoop(params, deps);
    await vi.advanceTimersByTimeAsync(60);
    const result = await resultPromise;

    expect(result.finalText).toBe(params.draftText);
    expect(result.finalActions).toEqual(PROPOSED_ACTIONS);
    expect(result.logEntry!.verdict).toBe("error");
  });
});

describe("runQualityLoop — gating", () => {
  it("skips the judge entirely when disabled", async () => {
    const fetchFn = vi.fn();
    const deps = makeDeps({ fetch: fetchFn, enabled: false });
    const params = makeParams();
    const result = await runQualityLoop(params, deps);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.finalText).toBe(params.draftText);
    expect(result.finalActions).toEqual(PROPOSED_ACTIONS);
    expect(result.logEntry).toBeNull();
  });

  it("skips the judge when there is nothing to review", async () => {
    const fetchFn = vi.fn();
    const deps = makeDeps({ fetch: fetchFn });
    const result = await runQualityLoop(makeParams({ draftText: "  ", proposedActions: [] }), deps);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(result.logEntry).toBeNull();
  });
});

describe("reviewDraft", () => {
  it("returns null when the API key is missing", async () => {
    const fetchFn = vi.fn();
    const review = await reviewDraft(makeParams(), makeDeps({ fetch: fetchFn, geminiApiKey: "" }));
    expect(review).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("strips ```json fences from the judge response", async () => {
    const judgeJson = JSON.stringify({ score: 8, verdict: "approve", issues: [], vetoedActionIndexes: [] });
    const deps = makeDeps({ fetch: mockJudgeFetch("```json\n" + judgeJson + "\n```") });
    const review = await reviewDraft(makeParams(), deps);

    expect(review).not.toBeNull();
    expect(review!.verdict).toBe("approve");
    expect(review!.score).toBe(8);
  });

  it("clamps out-of-range scores into 0-10", async () => {
    const deps = makeDeps({ fetch: mockJudgeFetch({ score: 42, verdict: "approve", issues: [], vetoedActionIndexes: [] }) });
    const review = await reviewDraft(makeParams(), deps);
    expect(review!.score).toBe(10);
  });
});

describe("appendQualityLog", () => {
  function makeEntry(i: number): QualityLogEntry {
    return { ts: `2026-06-10T00:00:${String(i).padStart(2, "0")}Z`, judgeScore: 8, verdict: "approve", revised: false, vetoedActions: 0, model: "m" };
  }

  it("appends to an existing array", () => {
    const log = appendQualityLog([makeEntry(0)], makeEntry(1));
    expect(log).toHaveLength(2);
    expect(log[1].ts).toContain(":01");
  });

  it("starts a fresh array when existing value is not an array", () => {
    expect(appendQualityLog(undefined, makeEntry(0))).toHaveLength(1);
    expect(appendQualityLog("garbage", makeEntry(0))).toHaveLength(1);
    expect(appendQualityLog({ not: "an array" }, makeEntry(0))).toHaveLength(1);
  });

  it(`caps the log at the last ${QUALITY_LOG_MAX_ENTRIES} entries, dropping the oldest`, () => {
    let log: QualityLogEntry[] = [];
    for (let i = 0; i < QUALITY_LOG_MAX_ENTRIES + 5; i++) {
      log = appendQualityLog(log, makeEntry(i));
    }
    expect(log).toHaveLength(QUALITY_LOG_MAX_ENTRIES);
    expect(log[0].ts).toContain(":05");
    expect(log[log.length - 1].ts).toContain(`:${QUALITY_LOG_MAX_ENTRIES + 4}`);
  });

  it("does not mutate the existing array", () => {
    const existing = [makeEntry(0)];
    appendQualityLog(existing, makeEntry(1));
    expect(existing).toHaveLength(1);
  });
});

describe("runQualityLoop — issues persistence", () => {
  it("persists issues on the log entry when verdict is revise, capped at 3 entries of 120 chars", async () => {
    const longIssue = "x".repeat(300);
    const deps = makeDeps({
      fetch: mockJudgeFetch({
        score: 4,
        verdict: "revise",
        issues: [longIssue, "too long for SMS", "overconfident claims", "fourth issue", "fifth issue"],
        revisedText: "Shorter reply.",
        vetoedActionIndexes: [],
      }),
    });
    const result = await runQualityLoop(makeParams(), deps);

    expect(result.logEntry!.issues).toHaveLength(3);
    expect(result.logEntry!.issues![0]).toHaveLength(120);
    expect(result.logEntry!.issues![1]).toBe("too long for SMS");
    expect(result.logEntry!.issues!).not.toContain("fourth issue");
  });

  it("does not persist issues when verdict is approve", async () => {
    const deps = makeDeps({
      fetch: mockJudgeFetch({
        score: 8,
        verdict: "approve",
        issues: ["minor nitpick that did not warrant revision"],
        vetoedActionIndexes: [],
      }),
    });
    const result = await runQualityLoop(makeParams(), deps);

    expect(result.logEntry!.verdict).toBe("approve");
    expect(result.logEntry!.issues).toBeUndefined();
  });
});

describe("buildQualityMemory", () => {
  function entry(overrides: Partial<QualityLogEntry> = {}): QualityLogEntry {
    return {
      ts: "2026-06-10T00:00:00Z",
      judgeScore: 8,
      verdict: "approve",
      revised: false,
      vetoedActions: 0,
      model: "m",
      ...overrides,
    };
  }

  it("returns null when metadata has no qualityLog", () => {
    expect(buildQualityMemory({})).toBeNull();
    expect(buildQualityMemory({ qualityLog: "not an array" })).toBeNull();
    expect(buildQualityMemory({ qualityLog: [] })).toBeNull();
  });

  it("returns null when there are only unscored (error) entries", () => {
    const metadata = { qualityLog: [entry({ judgeScore: null, verdict: "error" })] };
    expect(buildQualityMemory(metadata)).toBeNull();
  });

  it("reports the average score and reply count", () => {
    const metadata = { qualityLog: [entry({ judgeScore: 8 }), entry({ judgeScore: 9 }), entry({ judgeScore: 7 })] };
    const memory = buildQualityMemory(metadata);

    expect(memory).toContain("Recent quality signals for this gig");
    expect(memory).toContain("avg judge score 8.0/10");
    expect(memory).toContain("over last 3 replies");
    expect(memory).not.toContain("needed revision");
    expect(memory).not.toContain("revised for");
  });

  it("mentions revision count and issues from revised entries as guidance", () => {
    const metadata = {
      qualityLog: [
        entry({ judgeScore: 9 }),
        entry({ judgeScore: 4, verdict: "revise", revised: true, issues: ["too long for SMS", "overconfident claims"] }),
        entry({ judgeScore: 5, verdict: "revise", revised: true, issues: ["missed the user's question"] }),
      ],
    };
    const memory = buildQualityMemory(metadata);

    expect(memory).toContain("avg judge score 6.0/10 over last 3 replies");
    expect(memory).toContain("2 of 3 replies needed revision");
    expect(memory).toContain("missed the user's question");
    expect(memory).toContain("too long for SMS");
    expect(memory).toContain("overconfident claims");
    expect(memory).toContain("Avoid repeating these issues.");
  });

  it("tolerates malformed entries mixed into the log", () => {
    const metadata = {
      qualityLog: [
        null,
        "garbage",
        42,
        { unrelated: true },
        entry({ judgeScore: "9" as unknown as number }),
        entry({ judgeScore: 8 }),
        entry({ judgeScore: 6, verdict: "revise", revised: true, issues: [null, "", "  real issue  "] as unknown as string[] }),
      ],
    };
    const memory = buildQualityMemory(metadata);

    expect(memory).toContain("avg judge score 7.0/10 over last 2 replies");
    expect(memory).toContain("real issue");
    expect(memory).not.toContain("garbage");
  });

  it("dedupes issues and caps them at 5, most recent first", () => {
    const metadata = {
      qualityLog: [
        entry({ judgeScore: 5, verdict: "revise", revised: true, issues: ["issue 1", "issue 2", "issue 3"] }),
        entry({ judgeScore: 5, verdict: "revise", revised: true, issues: ["issue 3", "issue 4", "issue 5"] }),
        entry({ judgeScore: 5, verdict: "revise", revised: true, issues: ["issue 5", "issue 6", "issue 7"] }),
      ],
    };
    const memory = buildQualityMemory(metadata)!;

    // Newest entry's issues come first; older duplicates don't repeat.
    expect(memory.indexOf("issue 5")).toBeLessThan(memory.indexOf("issue 3"));
    expect(memory.match(/issue 5/g)).toHaveLength(1);
    const mentioned = ["issue 1", "issue 2", "issue 3", "issue 4", "issue 5", "issue 6", "issue 7"]
      .filter((i) => memory.includes(i));
    expect(mentioned).toHaveLength(5);
  });

  it("uses singular phrasing for a single reply", () => {
    const metadata = { qualityLog: [entry({ judgeScore: 9 })] };
    expect(buildQualityMemory(metadata)).toContain("over last 1 reply.");
  });
});

describe("isQualityLoopEnabled", () => {
  it("defaults ON when unset or empty", () => {
    expect(isQualityLoopEnabled(undefined)).toBe(true);
    expect(isQualityLoopEnabled("")).toBe(true);
    expect(isQualityLoopEnabled("  ")).toBe(true);
  });

  it("treats false/0/off/no as disabled (case-insensitive)", () => {
    expect(isQualityLoopEnabled("false")).toBe(false);
    expect(isQualityLoopEnabled("FALSE")).toBe(false);
    expect(isQualityLoopEnabled("0")).toBe(false);
    expect(isQualityLoopEnabled("off")).toBe(false);
    expect(isQualityLoopEnabled("no")).toBe(false);
  });

  it("treats anything else as enabled", () => {
    expect(isQualityLoopEnabled("true")).toBe(true);
    expect(isQualityLoopEnabled("1")).toBe(true);
    expect(isQualityLoopEnabled("on")).toBe(true);
  });
});
