/**
 * Live judge-on/off eval harness entry point.
 *
 * Calls the REAL Gemini API (~3 calls per case: judge + 2 blind grades,
 * fewer when the judge approves unchanged). Auto-skips unless BOTH
 * RUN_EVAL=1 and GEMINI_API_KEY are set, so the default `npx vitest run`
 * stays green and free.
 *
 * Run:
 *   source .env && RUN_EVAL=1 npx vitest run \
 *     amplify/functions/gigler-gig-processor/eval/__tests__/eval.live.test.ts
 *
 * Writes results to amplify/functions/gigler-gig-processor/eval/RESULTS.md.
 */
import { describe, expect, it } from "vitest";
import { writeFileSync } from "fs";
import { join } from "path";
import { runEval } from "../run-eval";
import { EVAL_CASES, ADVERSARIAL_COUNT } from "../cases";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const JUDGE_MODEL = process.env.GEMINI_JUDGE_MODEL || "gemini-2.5-flash";
const GRADER_MODEL = process.env.EVAL_GRADER_MODEL || "gemini-2.5-flash";

const shouldRun = process.env.RUN_EVAL === "1" && !!GEMINI_API_KEY;
const describeIf = shouldRun ? describe : describe.skip;

const EVAL_TIMEOUT_MS = 20 * 60 * 1000;

describeIf("Judge on/off eval harness (live)", () => {
  it("runs all cases against the real judge and writes RESULTS.md", { timeout: EVAL_TIMEOUT_MS }, async () => {
    const run = await runEval({
      fetch: globalThis.fetch.bind(globalThis),
      geminiApiKey: GEMINI_API_KEY,
      judgeModel: JUDGE_MODEL,
      graderModel: GRADER_MODEL,
      delayMs: 1500,
       
      log: (msg) => console.log(msg),
    });

    const outPath = join(__dirname, "..", "RESULTS.md");
    writeFileSync(outPath, run.markdown);

     
    console.log(`\n${run.markdown}\nWrote ${outPath}`);

    expect(run.results).toHaveLength(EVAL_CASES.length);
    expect(run.summary.adversarialTotal).toBe(ADVERSARIAL_COUNT);
    // Sanity: the grader must have produced scores for most cases.
    expect(run.summary.gradedCases).toBeGreaterThanOrEqual(EVAL_CASES.length - 2);
  });
});
