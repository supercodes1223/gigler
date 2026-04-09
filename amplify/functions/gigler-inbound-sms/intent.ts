import {
  isLikelyGigRequest,
  classifyGigTypeFallback,
  repairTruncatedJson,
  type GigType,
} from "./utils";

export type FetchFn = typeof globalThis.fetch;

export interface Intent {
  type: "create_gig" | "list_gigs" | "resume_gig" | "complete_gig" | "pause_gig" | "archive_gig" | "general";
  gigType?: GigType;
  title?: string;
}

export function detectIntentLocal(message: string): Intent | null {
  const lower = message.toLowerCase().trim();

  if (/^(list|my gigs|show gigs|gigs|what.*gigs)/i.test(lower)) {
    return { type: "list_gigs" };
  }
  if (/^(done|finish|complete|close|mark.*done|mark.*complete)\b/i.test(lower)) {
    return { type: "complete_gig" };
  }
  if (/^(pause|hold|freeze|stop)\b/i.test(lower)) {
    return { type: "pause_gig" };
  }
  if (/^(archive|delete|remove|cancel)\b/i.test(lower)) {
    return { type: "archive_gig" };
  }
  return null;
}

export function detectIntentFallback(message: string): Intent {
  const lower = message.toLowerCase().trim();
  return isLikelyGigRequest(lower)
    ? { type: "create_gig", gigType: classifyGigTypeFallback(lower) }
    : { type: "general" };
}

export interface IntentDeps {
  fetch: FetchFn;
  geminiApiKey: string;
  geminiModel: string;
}

export async function detectIntent(message: string, deps: IntentDeps): Promise<Intent> {
  const localResult = detectIntentLocal(message);
  if (localResult) return localResult;

  if (!deps.geminiApiKey) {
    return detectIntentFallback(message);
  }

  try {
    const response = await deps.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${deps.geminiModel}:generateContent?key=${deps.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `You classify user messages for Gigler, an SMS-based AI assistant. Respond with ONLY a JSON object, no markdown.

If the user is asking to DO something (plan, build, create, organize, schedule, book, form, etc.), classify as create_gig.
If they're asking about their gigs or listing them, classify as list_gigs.
Otherwise, classify as general.

Gig types: coding, planning, creative, professional, lifestyle, scheduling, education, business_formation, reservations, household

JSON format: {"type": "create_gig"|"list_gigs"|"general", "gigType": "...", "title": "short title"}`,
            }],
          },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 100, temperature: 0 },
        }),
      }
    );

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (jsonMatch) {
      let parsed: Record<string, unknown> | null = null;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        parsed = repairTruncatedJson(text);
      }
      if (parsed) {
        return {
          type: (parsed.type as Intent["type"]) || "general",
          gigType: parsed.gigType as GigType | undefined,
          title: parsed.title as string | undefined,
        };
      }
    }
  } catch {
    // fall through to fallback
  }

  return detectIntentFallback(message);
}
