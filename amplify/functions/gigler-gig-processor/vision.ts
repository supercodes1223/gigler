import type { DownloadedMedia, ImageAnalysisResult } from "./vision-utils";

export type FetchFn = typeof globalThis.fetch;

export interface VisionDeps {
  fetch: FetchFn;
  accountSid: string;
  authToken: string;
  conversationsServiceSid: string;
  geminiApiKey: string;
  geminiModel: string;
}

export async function downloadConversationMedia(
  mediaSid: string,
  deps: Pick<VisionDeps, "fetch" | "accountSid" | "authToken" | "conversationsServiceSid">
): Promise<DownloadedMedia | null> {
  if (!deps.accountSid || !deps.authToken || !deps.conversationsServiceSid) return null;
  try {
    const contentUrl = `https://mcs.us1.twilio.com/v1/Services/${deps.conversationsServiceSid}/Media/${mediaSid}/Content`;
    const authHeader = `Basic ${Buffer.from(`${deps.accountSid}:${deps.authToken}`).toString("base64")}`;
    const response = await deps.fetch(contentUrl, {
      headers: { Authorization: authHeader },
      redirect: "follow",
    });
    if (!response.ok) {
      console.error(`[Vision] Failed to download conversation media ${mediaSid}: ${response.status} ${response.statusText}`);
      return null;
    }
    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (contentType.includes("application/json") || contentType.includes("text/html")) {
      console.error(`[Vision] MCS returned non-image content-type: ${contentType} for ${mediaSid}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    return {
      base64: Buffer.from(buffer).toString("base64"),
      mimeType: contentType,
    };
  } catch (err) {
    console.error(`[Vision] Error downloading conversation media ${mediaSid}:`, err);
    return null;
  }
}

export async function downloadTwilioMedia(
  mediaUrl: string,
  deps: Pick<VisionDeps, "fetch" | "accountSid" | "authToken">
): Promise<DownloadedMedia | null> {
  if (!deps.accountSid || !deps.authToken) return null;
  try {
    const response = await deps.fetch(mediaUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${deps.accountSid}:${deps.authToken}`).toString("base64")}`,
      },
      redirect: "follow",
    });
    if (!response.ok) {
      console.error(`[Vision] Failed to download Twilio media: ${response.status}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    return {
      base64: Buffer.from(buffer).toString("base64"),
      mimeType: response.headers.get("content-type") || "image/jpeg",
    };
  } catch (err) {
    console.error("[Vision] Error downloading Twilio media:", err);
    return null;
  }
}

export async function analyzeImageWithGemini(
  media: DownloadedMedia,
  gigContext: { type: string; title: string; description?: string },
  deps: Pick<VisionDeps, "fetch" | "geminiApiKey" | "geminiModel">
): Promise<ImageAnalysisResult | null> {
  if (!deps.geminiApiKey) return null;

  const prompt = `Analyze this image sent by a user in a "${gigContext.title}" gig (type: ${gigContext.type}).
${gigContext.description ? `Gig description: ${gigContext.description}` : ""}

Determine what type of image this is and extract all relevant information.

Respond in JSON format ONLY:
{
  "imageType": "bill" | "receipt" | "invoice" | "document" | "photo" | "screenshot" | "other",
  "extractedInfo": {
    "hasAmounts": true/false,
    "hasDates": true/false,
    "totalAmount": "extracted total if visible, e.g., '$142.50'",
    "lineItems": "extracted line items if visible",
    "dueDate": "due date if visible",
    "fromEntity": "who issued this (company name, utility provider, etc.)",
    "billType": "power | water | gas | internet | trash | rent | phone | insurance | other",
    "description": "brief description of what's in the image"
  },
  "suggestedAction": "What to do with this info, e.g., 'Log power bill of $142.50 due May 1'"
}`;

  try {
    const response = await deps.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${deps.geminiModel}:generateContent?key=${deps.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: media.mimeType, data: media.base64 } },
            ],
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.error("[Vision] No text in Gemini Vision response");
      return null;
    }

    const text = rawText.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[Vision] No JSON found in vision response");
      return null;
    }

    try {
      return JSON.parse(jsonMatch[0]) as ImageAnalysisResult;
    } catch {
      const partial = text.match(/\{[\s\S]*/)?.[0] || "";
      const repaired = partial.replace(/,\s*"[^"]*$/, "").replace(/,\s*$/, "");
      const openCount = (repaired.match(/\{/g) || []).length;
      const closeCount = (repaired.match(/\}/g) || []).length;
      const closed = repaired + "}".repeat(Math.max(0, openCount - closeCount));
      try {
        return JSON.parse(closed) as ImageAnalysisResult;
      } catch {
        console.error("[Vision] Could not parse vision JSON even after repair");
        return null;
      }
    }
  } catch (err) {
    console.error("[Vision] Gemini Vision error:", err);
    return null;
  }
}
