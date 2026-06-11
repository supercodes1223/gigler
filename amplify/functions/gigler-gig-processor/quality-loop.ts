/**
 * Orca quality loop — single judge pass over the draft reply + proposed actions.
 *
 * After the primary Gemini pass produces a draft reply and validated actions,
 * a cheap judge model reviews the draft BEFORE actions are executed or the
 * reply is sent. The judge can:
 *   - approve the draft as-is
 *   - provide a revised reply text (verdict "revise")
 *   - veto specific proposed actions by index (vetoed actions are dropped)
 *
 * The judge NEVER regenerates actions and runs at most once per message
 * (no loops). Fail-open by design: any judge error, timeout, or malformed
 * output means the original draft ships unchanged.
 *
 * Outcome signals are captured as compact QualityLogEntry records appended
 * to Gig.metadata.qualityLog (capped at the last 20 entries) — phase 1
 * "Capture" of docs/gigler-self-improvement.md.
 */

import type { GigAction } from "./vision-utils";

export type FetchFn = typeof globalThis.fetch;

export const DEFAULT_JUDGE_MODEL = "gemini-2.5-flash";
export const DEFAULT_JUDGE_TIMEOUT_MS = 10_000;
export const QUALITY_LOG_MAX_ENTRIES = 20;

export interface QualityLoopDeps {
  fetch: FetchFn;
  geminiApiKey: string;
  judgeModel: string;
  enabled: boolean;
  timeoutMs?: number;
}

export interface JudgeReview {
  score: number;
  verdict: "approve" | "revise";
  issues: string[];
  revisedText?: string;
  vetoedActionIndexes: number[];
}

export interface QualityLogEntry {
  ts: string;
  judgeScore: number | null;
  verdict: "approve" | "revise" | "error";
  revised: boolean;
  vetoedActions: number;
  model: string;
  /** Judge issues, persisted only when verdict is "revise" (max 3, 120 chars each). */
  issues?: string[];
}

const PERSISTED_ISSUES_MAX = 3;
const PERSISTED_ISSUE_MAX_CHARS = 120;

export interface QualityLoopResult {
  finalText: string;
  finalActions: GigAction[];
  logEntry: QualityLogEntry | null;
}

export interface ReviewDraftParams {
  draftText: string;
  proposedActions: GigAction[];
  gigContext: { type: string; title: string; description?: string };
  userMessage: string;
}

/** Feature flag parser. Defaults ON when unset; "false"/"0"/"off"/"no" disable. */
export function isQualityLoopEnabled(rawValue: string | undefined): boolean {
  if (rawValue === undefined || rawValue.trim() === "") return true;
  return !["false", "0", "off", "no"].includes(rawValue.trim().toLowerCase());
}

function summarizeActionForJudge(action: GigAction, index: number): string {
  const { files, content, ...rest } = action;
  const compact: Record<string, unknown> = { ...rest };
  if (typeof content === "string") {
    compact.content = content.length > 200 ? `${content.substring(0, 200)}… (${content.length} chars total)` : content;
  }
  if (files) compact.files = files.map((f) => f.path);
  return `${index}: ${JSON.stringify(compact)}`;
}

function buildJudgePrompt(params: ReviewDraftParams): string {
  const { draftText, proposedActions, gigContext, userMessage } = params;
  const actionList = proposedActions.length > 0
    ? proposedActions.map(summarizeActionForJudge).join("\n")
    : "(none)";

  return `You are a strict quality judge for Gigler, an AI assistant that helps users via SMS. Another model drafted a reply (and possibly actions) for the user's latest message. Review the draft BEFORE it is sent.

GIG CONTEXT:
- Title: "${gigContext.title}"
- Type: ${gigContext.type}
${gigContext.description ? `- Description: ${gigContext.description}` : ""}

USER'S LATEST MESSAGE:
${userMessage}

DRAFT REPLY (would be sent to the user via SMS):
${draftText}

PROPOSED ACTIONS (already validated, listed by 0-based index):
${actionList}

Evaluate the draft reply for: correctness vs the user's message, SMS-appropriate brevity and tone, no hallucinated claims, no unsafe or embarrassing content. Evaluate each proposed action for being safe and clearly justified by the user's message.

Respond with JSON ONLY, exactly this shape:
{
  "score": <integer 0-10 rating the draft reply>,
  "verdict": "approve" | "revise",
  "issues": ["concrete issue", ...],
  "revisedText": "<improved reply text — include ONLY when verdict is revise; keep it concise and SMS-friendly>",
  "vetoedActionIndexes": [<index of any proposed action that is unsafe or clearly wrong>]
}

Rules:
- Default to "approve" (score >= 7) unless there is a material problem. Do NOT revise for minor stylistic preferences.
- revisedText must be plain reply text only — no prefixes, no markdown, no explanations.
- Veto an action ONLY if it is unsafe, contradicts the user's request, or targets the wrong person/thing. Never invent new actions.
- issues must be concrete and specific (empty array if none).`;
}

function parseJudgeJson(rawText: string): unknown | null {
  const text = rawText.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

function sanitizeReview(raw: unknown, actionCount: number): JudgeReview | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const verdict = r.verdict === "approve" || r.verdict === "revise" ? r.verdict : null;
  const score = typeof r.score === "number" && Number.isFinite(r.score)
    ? Math.min(10, Math.max(0, Math.round(r.score)))
    : null;
  if (!verdict || score === null) return null;

  const issues = Array.isArray(r.issues)
    ? r.issues.filter((i): i is string => typeof i === "string").slice(0, 10)
    : [];
  const revisedText = typeof r.revisedText === "string" && r.revisedText.trim()
    ? r.revisedText.trim()
    : undefined;
  const vetoedActionIndexes = Array.isArray(r.vetoedActionIndexes)
    ? [...new Set(r.vetoedActionIndexes.filter(
        (i): i is number => typeof i === "number" && Number.isInteger(i) && i >= 0 && i < actionCount
      ))]
    : [];

  return { score, verdict, issues, revisedText, vetoedActionIndexes };
}

/**
 * Calls the judge model and returns a sanitized review, or null on any
 * failure (missing key, timeout, API error, malformed JSON). Never throws.
 */
export async function reviewDraft(
  params: ReviewDraftParams,
  deps: QualityLoopDeps
): Promise<JudgeReview | null> {
  if (!deps.geminiApiKey) {
    console.warn("[QualityLoop] No Gemini API key — skipping judge pass");
    return null;
  }

  const timeoutMs = deps.timeoutMs ?? DEFAULT_JUDGE_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await deps.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${deps.judgeModel}:generateContent?key=${deps.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: buildJudgePrompt(params) }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      }
    );

    const data = await response.json();
    if (data?.error) {
      console.error(`[QualityLoop] Judge API error: ${JSON.stringify(data.error).substring(0, 300)}`);
      return null;
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.warn("[QualityLoop] No text in judge response");
      return null;
    }

    const review = sanitizeReview(parseJudgeJson(rawText), params.proposedActions.length);
    if (!review) {
      console.warn(`[QualityLoop] Malformed judge JSON — failing open: ${String(rawText).substring(0, 200)}`);
      return null;
    }
    return review;
  } catch (err) {
    console.error("[QualityLoop] Judge call failed (fail-open):", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Single judge pass over the draft. Applies the revised reply text (if any)
 * and drops vetoed actions. Always returns a usable result — on any judge
 * failure the original draft and actions pass through unchanged.
 */
export async function runQualityLoop(
  params: ReviewDraftParams,
  deps: QualityLoopDeps
): Promise<QualityLoopResult> {
  const passthrough: QualityLoopResult = {
    finalText: params.draftText,
    finalActions: params.proposedActions,
    logEntry: null,
  };

  if (!deps.enabled) return passthrough;
  if (!params.draftText.trim() && params.proposedActions.length === 0) return passthrough;

  try {
    const review = await reviewDraft(params, deps);
    const ts = new Date().toISOString();

    if (!review) {
      console.warn("[QualityLoop] Judge unavailable — proceeding with original draft");
      return {
        ...passthrough,
        logEntry: { ts, judgeScore: null, verdict: "error", revised: false, vetoedActions: 0, model: deps.judgeModel },
      };
    }

    let finalText = params.draftText;
    let revised = false;
    if (review.verdict === "revise" && review.revisedText) {
      finalText = review.revisedText;
      revised = true;
    }

    let finalActions = params.proposedActions;
    if (review.vetoedActionIndexes.length > 0) {
      const vetoed = params.proposedActions.filter((_, i) => review.vetoedActionIndexes.includes(i));
      finalActions = params.proposedActions.filter((_, i) => !review.vetoedActionIndexes.includes(i));
      console.warn(`[QualityLoop] Judge vetoed ${vetoed.length} action(s): ${vetoed.map((a) => a.type).join(", ")}`);
    }

    console.log(
      `[QualityLoop] Judge verdict=${review.verdict} score=${review.score} revised=${revised} vetoed=${review.vetoedActionIndexes.length} model=${deps.judgeModel}` +
      (review.issues.length > 0 ? ` issues=${JSON.stringify(review.issues)}` : "")
    );

    return {
      finalText,
      finalActions,
      logEntry: {
        ts,
        judgeScore: review.score,
        verdict: review.verdict,
        revised,
        vetoedActions: review.vetoedActionIndexes.length,
        model: deps.judgeModel,
        ...(review.verdict === "revise" && review.issues.length > 0
          ? {
              issues: review.issues
                .slice(0, PERSISTED_ISSUES_MAX)
                .map((i) => i.substring(0, PERSISTED_ISSUE_MAX_CHARS)),
            }
          : {}),
      },
    };
  } catch (err) {
    console.error("[QualityLoop] Unexpected judge failure (fail-open):", err);
    return {
      ...passthrough,
      logEntry: { ts: new Date().toISOString(), judgeScore: null, verdict: "error", revised: false, vetoedActions: 0, model: deps.judgeModel },
    };
  }
}

/**
 * Appends an outcome record to the qualityLog array stored in Gig.metadata,
 * keeping only the most recent QUALITY_LOG_MAX_ENTRIES entries.
 */
export function appendQualityLog(existing: unknown, entry: QualityLogEntry): QualityLogEntry[] {
  const log = Array.isArray(existing) ? existing.slice() : [];
  log.push(entry);
  return log.slice(-QUALITY_LOG_MAX_ENTRIES) as QualityLogEntry[];
}

const MEMORY_ISSUES_MAX = 5;

/**
 * Learning-store injection (phase 2 "Inject" of docs/gigler-self-improvement.md):
 * turns the qualityLog captured on past replies into a compact system-prompt
 * fragment so the next gig message starts with the judge's accumulated feedback.
 * Returns null when there is no usable (scored) history. Malformed entries are
 * tolerated and skipped.
 */
export function buildQualityMemory(metadata: Record<string, unknown>): string | null {
  const log = metadata?.qualityLog;
  if (!Array.isArray(log)) return null;

  const scored = log.filter((e): e is QualityLogEntry =>
    !!e && typeof e === "object"
    && typeof (e as QualityLogEntry).judgeScore === "number"
    && Number.isFinite((e as QualityLogEntry).judgeScore)
  );
  if (scored.length === 0) return null;

  const avg = scored.reduce((sum, e) => sum + (e.judgeScore as number), 0) / scored.length;
  const revisedEntries = scored.filter((e) => e.revised === true);

  // Most recent revision issues first, deduped, capped for prompt compactness.
  const issues: string[] = [];
  for (const entry of [...scored].reverse()) {
    if (entry.verdict !== "revise" || !Array.isArray(entry.issues)) continue;
    for (const issue of entry.issues) {
      if (typeof issue !== "string" || !issue.trim()) continue;
      const trimmed = issue.trim().substring(0, PERSISTED_ISSUE_MAX_CHARS);
      if (!issues.includes(trimmed)) issues.push(trimmed);
      if (issues.length >= MEMORY_ISSUES_MAX) break;
    }
    if (issues.length >= MEMORY_ISSUES_MAX) break;
  }

  const replyWord = scored.length === 1 ? "reply" : "replies";
  let fragment = `Recent quality signals for this gig: avg judge score ${avg.toFixed(1)}/10 over last ${scored.length} ${replyWord}.`;
  if (revisedEntries.length > 0) {
    fragment += ` ${revisedEntries.length} of ${scored.length} ${replyWord} needed revision before sending.`;
  }
  if (issues.length > 0) {
    fragment += ` Past replies were revised for: ${issues.join("; ")}. Avoid repeating these issues.`;
  }
  return fragment;
}
