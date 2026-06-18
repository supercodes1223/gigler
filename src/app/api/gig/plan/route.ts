import { NextResponse } from "next/server";
import { ALL_APP_IDS, APPS, matchAppsByKeywords } from "@/lib/apps";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_PLAN_MODEL || "gpt-4o-mini";

interface PlanResult {
  appIds: string[];
  title: string;
  source: "openai" | "gemini" | "keywords";
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

async function planWithOpenAI(prompt: string): Promise<PlanResult | null> {
  if (!OPENAI_API_KEY) return null;
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PLANNER_RULES },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!resp.ok) {
      console.error(`[GigPlan] OpenAI planning failed (${resp.status}), trying next path`);
      return null;
    }
    const data = await resp.json();
    const text: string = data?.choices?.[0]?.message?.content || "";
    return parsePlanJson(text, prompt, "openai");
  } catch (err) {
    console.error("[GigPlan] OpenAI planning error, trying next path:", err);
    return null;
  }
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
          generationConfig: { maxOutputTokens: 200, temperature: 0.2 },
        }),
      },
    );
    if (!resp.ok) {
      console.error(`[GigPlan] Gemini planning failed (${resp.status}), using keyword fallback`);
      return null;
    }
    const data = await resp.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return parsePlanJson(text, prompt, "gemini");
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

  // Order of preference: OpenAI (works without the broken Gemini key) → Gemini → keywords.
  const plan: PlanResult =
    (await planWithOpenAI(prompt)) ??
    (await planWithGemini(prompt)) ?? {
      appIds: matchAppsByKeywords(prompt),
      title: fallbackTitle(prompt),
      source: "keywords",
    };

  console.log(`[GigPlan] source=${plan.source} appIds=${plan.appIds.join(",")}`);
  return NextResponse.json(plan);
}
