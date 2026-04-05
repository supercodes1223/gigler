/**
 * Shared Gemini AI helper functions.
 * Used by Lambda handlers for AI conversation and intent detection.
 */

export interface GeminiMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

export interface GeminiResponse {
  text: string;
  finishReason?: string;
}

export async function callGemini(options: {
  apiKey: string;
  model?: string;
  systemPrompt: string;
  userMessage: string;
  history?: Array<{ role: string; content: string }>;
}): Promise<GeminiResponse> {
  const {
    apiKey,
    model = "gemini-2.0-flash",
    systemPrompt,
    userMessage,
    history = [],
  } = options;

  const contents: GeminiMessage[] = [
    ...history.map((msg) => ({
      role: (msg.role === "ai" ? "model" : "user") as "user" | "model",
      parts: [{ text: msg.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
      }),
    }
  );

  const data = await response.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "Sorry, I couldn't process that. Try again?";
  const finishReason = data?.candidates?.[0]?.finishReason;

  return { text, finishReason };
}

export const GIGLER_SYSTEM_PROMPT = `You are Gigler, an AI assistant that lives in text messages. Your voice is simple, non-pretentious, and action-oriented. You help people get things done by creating and managing Gigs — projects, tasks, anything they need.

You're the anti-app: no downloads, no dashboards required. Just text.

Key behaviors:
- Keep responses concise and SMS-friendly (under 320 characters when possible)
- Be helpful, direct, and warm
- When someone asks you to do something, create a Gig for it
- For group gigs, coordinate between participants naturally
- Always confirm before taking third-party actions (reservations, bookings)
- Proactively follow up on stale gigs
`;
