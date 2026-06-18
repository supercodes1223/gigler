import { NextResponse } from "next/server";
import { ALL_APP_IDS, matchAppsByKeywords } from "@/lib/apps";

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

async function planWithGemini(prompt: string): Promise<PlanResult | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const instruction = `You are Gigler's orchestration planner. Given a user's request, choose which apps/tools Gigler should use to complete it.

Choose ONLY from this exact list of ids: ${ALL_APP_IDS.join(", ")}

Rules:
- Always include "gemini" (the routing engine).
- Pick 2-6 ids total that are genuinely relevant to the request.
- For coding/build/deploy requests include coding + cloud ids.
- For reservations/events/food include the matching consumer apps.

Respond with ONLY minified JSON, no markdown, in this shape:
{"appIds":["gemini","..."],"title":"short 3-7 word title of the gig"}`;

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instruction }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.2 },
        }),
      },
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as { appIds?: unknown; title?: unknown };
    const validIds = new Set(ALL_APP_IDS);
    const appIds = Array.isArray(parsed.appIds)
      ? (parsed.appIds.filter((id): id is string => typeof id === "string" && validIds.has(id)))
      : [];
    if (appIds.length === 0) return null;
    if (!appIds.includes("gemini")) appIds.unshift("gemini");
    const title = typeof parsed.title === "string" && parsed.title.trim().length > 0
      ? parsed.title.trim().slice(0, 80)
      : fallbackTitle(prompt);
    return { appIds: appIds.slice(0, 7), title, source: "gemini" };
  } catch (err) {
    console.error("[GigPlan] Gemini planning failed, using fallback:", err);
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

  const gemini = await planWithGemini(prompt);
  const plan: PlanResult = gemini ?? {
    appIds: matchAppsByKeywords(prompt),
    title: fallbackTitle(prompt),
    source: "keywords",
  };

  return NextResponse.json(plan);
}
