import { getSafeFallbackTitle, isValidGeneratedTitle, type GigType } from "./utils";

export type FetchFn = typeof globalThis.fetch;

export interface TitleDeps {
  fetch: FetchFn;
  geminiApiKey: string;
}

export async function generateGigTitle(
  message: string,
  gigType: GigType,
  deps: TitleDeps
): Promise<string> {
  const fallbackTitle = getSafeFallbackTitle(gigType);
  if (!deps.geminiApiKey) {
    return fallbackTitle;
  }

  const titleModel = "gemini-2.5-flash";

  try {
    const response = await deps.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${titleModel}:generateContent?key=${deps.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "Create a short concise title (3-6 words) from this gig description. Rules:\n- Title MUST describe the ACTIVITY or TASK, not a person\n- NEVER start with relationship words (Son's, Mom's, Dad's, etc.)\n- NEVER use just a person reference as the subject\n- Focus on WHAT is being done, not WHO it's for\n- Return ONLY the title text, no quotes, no explanation\n\nGood examples: 'Monthly Utility Bill Tracker', 'Saturday Birthday Party Plan', 'Website Redesign Project', 'College Bills Reminder Setup'\nBad examples: 'Son's Monthly', 'Mom's Birthday', 'Kid's School'",
            }],
          },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.1 },
        }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      return fallbackTitle;
    }
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const title = typeof rawText === "string" ? rawText.trim().replace(/^["']|["']$/g, "") : null;
    if (title && isValidGeneratedTitle(title, message)) {
      return title;
    }
  } catch {
    // fall through to fallback
  }
  return fallbackTitle;
}
