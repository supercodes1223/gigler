import { NextResponse } from "next/server";
import { ALL_APP_IDS, APPS, matchAppsByKeywords } from "@/lib/apps";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

interface PlanResult {
  appIds: string[];
  title: string;
  source: "gemini" | "keywords";
}

function fallbackTitle(prompt: string): string {
  const cleaned = prompt.trim().replace(/\s+/g, " ");
  if (cleaned.length <= 60) return cleaned;
  return `${cleaned.slice(0, 57)}…`;
}

/** Catalog with names + categories so the model picks genuinely relevant tools. */
function catalogForPrompt(): string {
  return APPS.map((a) => `${a.id} (${a.name}, ${a.category})`).join("; ");
}

const PLANNER_RULES = `You are Gigler's orchestration planner. Read the user's gig request and choose which tools/agents Gigler should orchestrate to actually get it done.

Choose ONLY from these tool ids: ${catalogForPrompt()}

Rules:
- Always include "gemini" (the routing engine) first.
- Pick 4-6 ids total that are genuinely relevant to THIS specific request.
- Coding/website/app/landing-page → coding + cloud tools (cursor, codex, claude, github, aws).
- Restaurant/dinner/reservation/party → opentable, resy, yelp, evite.
- Bills/finance/reminders → stripe, gmail, google, slack.
- Photos/media/organize → google, gemini, gmail.
- Pick specialist consumer apps when the request names a real-world task.
Respond with ONLY minified JSON: {"appIds":["gemini","..."],"title":"short 3-7 word title"}`;

function parsePlanJson(text: string, prompt: string, source: PlanResult["source"]): PlanResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed: { appIds?: unknown; title?: unknown };
  try {
    parsed = JSON.parse(match[0]) as { appIds?: unknown; title?: unknown };
  } catch {
    return null;
  }
  const validIds = new Set(ALL_APP_IDS);
  const appIds = Array.isArray(parsed.appIds)
    ? parsed.appIds.filter((id): id is string => typeof id === "string" && validIds.has(id))
    : [];
  if (appIds.length === 0) return null;
  if (!appIds.includes("gemini")) appIds.unshift("gemini");
  const title =
    typeof parsed.title === "string" && parsed.title.trim().length > 0
      ? parsed.title.trim().slice(0, 80)
      : fallbackTitle(prompt);
  return { appIds: [...new Set(appIds)].slice(0, 7), title, source };
}

interface GeminiResponse {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

async function planWithGemini(prompt: string): Promise<PlanResult | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: PLANNER_RULES }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.2,
            thinkingConfig: { thinkingBudget: 256 },
          },
        }),
      },
    );
    if (!resp.ok) {
      console.error(`[GigPlan] Gemini planning failed (${resp.status}), using keyword fallback`);
      return null;
    }
    const data: GeminiResponse = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const plan = parsePlanJson(text, prompt, "gemini");
    if (!plan || text.length === 0) {
      const finishReason = data?.candidates?.[0]?.finishReason;
      const textSnippet = text.slice(0, 120);
      console.warn("[GigPlan] Gemini returned unusable output", { finishReason, textSnippet });
    }
    return plan;
  } catch (err) {
    console.error("[GigPlan] Gemini planning error, using keyword fallback:", err);
    return null;
  }
}

export async function POST(request: Request) {
  let prompt: string;
  try {
    const body = (await request.json()) as { prompt?: unknown };
    prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!prompt) {
    return NextResponse.json({ error: "A prompt is required" }, { status: 400 });
  }

  // Gemini chooses the tools; keyword matching is the offline fallback.
  const plan: PlanResult =
    (await planWithGemini(prompt)) ?? {
      appIds: matchAppsByKeywords(prompt),
      title: fallbackTitle(prompt),
      source: "keywords",
    };

  console.log(`[GigPlan] source=${plan.source} appIds=${plan.appIds.join(",")}`);
  return NextResponse.json(plan);
}
