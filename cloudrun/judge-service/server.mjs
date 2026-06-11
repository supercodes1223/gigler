/**
 * Gigler Judge Service — Orca Quality Loop as a standalone HTTP service.
 *
 * Endpoints:
 *   POST /review  { draftText, proposedActions, gigContext, userMessage }
 *                 → { finalText, finalActions, logEntry }
 *   GET  /healthz → { ok: true, model: <judge model> }
 *
 * Env:
 *   PORT               — injected by Cloud Run (defaults to 8080 locally)
 *   GEMINI_API_KEY     — required for /review (503 otherwise)
 *   GEMINI_JUDGE_MODEL — optional, defaults to gemini-2.5-flash
 */

import express from "express";
import { runQualityLoop, DEFAULT_JUDGE_MODEL } from "./quality-loop.mjs";

const PORT = Number(process.env.PORT) || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const JUDGE_MODEL = process.env.GEMINI_JUDGE_MODEL || DEFAULT_JUDGE_MODEL;

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, model: JUDGE_MODEL });
});

app.post("/review", async (req, res) => {
  if (!GEMINI_API_KEY) {
    res.status(503).json({
      error: "Judge service is not configured: GEMINI_API_KEY env var is missing. Set it via --set-env-vars on deploy.",
    });
    return;
  }

  const body = req.body ?? {};
  const draftText = typeof body.draftText === "string" ? body.draftText : "";
  const proposedActions = Array.isArray(body.proposedActions) ? body.proposedActions : [];
  const userMessage = typeof body.userMessage === "string" ? body.userMessage : "";
  const gigContext =
    body.gigContext && typeof body.gigContext === "object"
      ? {
          type: String(body.gigContext.type ?? "unknown"),
          title: String(body.gigContext.title ?? "Untitled gig"),
          ...(body.gigContext.description ? { description: String(body.gigContext.description) } : {}),
        }
      : { type: "unknown", title: "Untitled gig" };

  if (!draftText.trim() && proposedActions.length === 0) {
    res.status(400).json({ error: "Request must include a non-empty draftText or at least one proposed action." });
    return;
  }

  const result = await runQualityLoop(
    { draftText, proposedActions, gigContext, userMessage },
    {
      fetch: globalThis.fetch,
      geminiApiKey: GEMINI_API_KEY,
      judgeModel: JUDGE_MODEL,
      enabled: true,
    }
  );

  res.json(result);
});

app.listen(PORT, () => {
  console.log(`[JudgeService] Listening on port ${PORT} (model=${JUDGE_MODEL}, key=${GEMINI_API_KEY ? "set" : "MISSING"})`);
});
