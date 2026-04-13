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
  skip?: boolean;
}

export interface NudgeResult {
  sms: string | null;
  skip: boolean;
}

function parseNudgeResponse(raw: string): NudgeResult {
  const trimmed = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      if (obj && typeof obj === "object") {
        const skip = obj.skip === true;
        if (skip) return { sms: null, skip: true };
        if ("sms" in obj) {
          const sms = obj.sms;
          if (typeof sms === "string" && sms.trim().length > 0) return { sms: sms.trim(), skip: false };
        }
      }
    } catch {
      /* fall through to plain text */
    }
  }
  if (trimmed.length > 0 && !trimmed.startsWith("{")) return { sms: trimmed, skip: false };
  return { sms: null, skip: false };
}

function clampSms(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

/**
 * Returns nudge result with sms body and skip flag.
 * If skip is true, the caller should not send a nudge to this recipient.
 * If sms is null and skip is false, caller should use a fallback template.
 */
export async function generateNudgeSms(
  context: NudgeContextInput,
  deps: GeminiNudgeDeps
): Promise<NudgeResult> {
  if (!deps.apiKey) return { sms: null, skip: false };

  const block = buildNudgeContextBlock(context);
  const prompt = `You are Gigler, a friendly AI assistant helping people complete real-world tasks via SMS.

Write ONE short text message (SMS) to nudge the user based on the context below.
Rules:
- Max ${MAX_NUDGE_SMS_CHARS} characters total.
- Warm, concise, actionable. No markdown, no quotes around the whole message.
- If the gig is household/bills and there is no sign of bills shared, suggest snapping a photo of a bill.
- If audience is participant, acknowledge they're in the group and invite them to contribute.
- Do not invent private details not implied by the context.
- Use contextLabel (if present in participant roster) to understand each person's responsibility.
- If this person is NOT the bottleneck (someone else needs to act first for the gig to progress), respond with {"sms":"","skip":true}.
- The owner should always be nudged with a status update, never skipped.

Context:
${block}

Respond with JSON ONLY in this exact shape:
{"sms":"your message here"}
Or if this person should NOT be nudged right now:
{"sms":"","skip":true}`;

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
      return { sms: null, skip: false };
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText || typeof rawText !== "string") return { sms: null, skip: false };

    const result = parseNudgeResponse(rawText);
    if (result.skip) return result;
    if (!result.sms) return { sms: null, skip: false };
    return { sms: clampSms(result.sms, MAX_NUDGE_SMS_CHARS), skip: false };
  } catch (e) {
    console.error("[GeminiNudge] fetch error", e);
    return { sms: null, skip: false };
  }
}
