/**
 * Gemini-powered SMS nudge text (injectable fetch for tests).
 */

import { buildNudgeContextBlock, type NudgeContextInput } from "./nudge-context";

export type FetchFn = typeof globalThis.fetch;

export interface GeminiNudgeDeps {
  fetch: FetchFn;
  apiKey: string;
  model: string;
}

export const MAX_NUDGE_SMS_CHARS = 320;

export interface GeminiNudgeJson {
  sms: string;
}

function parseSmsFromResponse(raw: string): string | null {
  const trimmed = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]) as unknown;
      if (obj && typeof obj === "object" && "sms" in obj) {
        const sms = (obj as GeminiNudgeJson).sms;
        if (typeof sms === "string" && sms.trim().length > 0) return sms.trim();
      }
    } catch {
      /* fall through to plain text */
    }
  }
  if (trimmed.length > 0 && !trimmed.startsWith("{")) return trimmed;
  return null;
}

function clampSms(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/**
 * Returns a single SMS body, or null if generation failed (caller should use fallback).
 */
export async function generateNudgeSms(
  context: NudgeContextInput,
  deps: GeminiNudgeDeps
): Promise<string | null> {
  if (!deps.apiKey) return null;

  const block = buildNudgeContextBlock(context);
  const prompt = `You are Gigler, a friendly AI assistant helping people complete real-world tasks via SMS.

Write ONE short text message (SMS) to nudge the user based on the context below.
Rules:
- Max ${MAX_NUDGE_SMS_CHARS} characters total.
- Warm, concise, actionable. No markdown, no quotes around the whole message.
- If the gig is household/bills and there is no sign of bills shared, suggest snapping a photo of a bill.
- If audience is participant, acknowledge they're in the group and invite them to contribute.
- Do not invent private details not implied by the context.

Context:
${block}

Respond with JSON ONLY in this exact shape:
{"sms":"your message here"}`;

  try {
    const response = await deps.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${deps.model}:generateContent?key=${deps.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 256,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error("[GeminiNudge] API error", data?.error?.message || response.status);
      return null;
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== "string") return null;

    const sms = parseSmsFromResponse(rawText);
    if (!sms) return null;
    return clampSms(sms, MAX_NUDGE_SMS_CHARS);
  } catch (e) {
    console.error("[GeminiNudge] fetch error", e);
    return null;
  }
}
