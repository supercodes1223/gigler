import {
  buildGigDescriptions,
  buildDisambiguationList,
  parseGigSelection,
  type AnnotatedGig,
} from "./utils";

export type FetchFn = typeof globalThis.fetch;

export interface RoutingDeps {
  fetch: FetchFn;
  geminiApiKey: string;
  geminiModel: string;
}

export async function selectGigByContext(
  message: string,
  gigs: AnnotatedGig[],
  deps: RoutingDeps
): Promise<{ gig: AnnotatedGig } | { ambiguous: true; prompt: string }> {
  const gigDescriptions = buildGigDescriptions(gigs);

  const prompt = `Given the user's message and their active gigs, which gig is this message most likely about?
If the message clearly relates to one gig, respond with ONLY the gig number.
If you cannot determine which gig, respond with ONLY the word "ambiguous".

User message: "${message}"

Active gigs:
${gigDescriptions}

Respond with ONLY a single number (1, 2, etc.) or "ambiguous".`;

  try {
    const response = await deps.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${deps.geminiModel}:generateContent?key=${deps.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 10, temperature: 0 },
        }),
      }
    );
    const data = await response.json();
    const text = (data?.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();

    const parsed = parseGigSelection(text, gigs);
    if ("gig" in parsed) {
      return parsed;
    }
  } catch {
    // fall through to disambiguation
  }

  const disambiguationList = buildDisambiguationList(gigs);

  return {
    ambiguous: true,
    prompt: `Which gig is this for?\n\n${disambiguationList}\n\nReply with the number, or tell me something new to create a fresh gig.`,
  };
}

export function guessTimezone(state?: string): string {
  if (!state) return "America/Chicago";
  const eastern = ["NY", "NJ", "PA", "CT", "MA", "MD", "VA", "NC", "SC", "GA", "FL", "OH", "MI", "IN", "ME", "NH", "VT", "RI", "DE", "WV", "KY", "TN", "AL", "DC"];
  const mountain = ["MT", "WY", "CO", "NM", "AZ", "UT", "ID"];
  const pacific = ["WA", "OR", "CA", "NV"];
  const alaska = ["AK"];
  const hawaii = ["HI"];

  const st = state.toUpperCase().trim();
  if (eastern.includes(st)) return "America/New_York";
  if (mountain.includes(st)) return "America/Denver";
  if (pacific.includes(st)) return "America/Los_Angeles";
  if (alaska.includes(st)) return "America/Anchorage";
  if (hawaii.includes(st)) return "Pacific/Honolulu";
  return "America/Chicago";
}
