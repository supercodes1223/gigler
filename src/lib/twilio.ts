/**
 * Shared Twilio helper functions.
 * Used by Lambda handlers for SMS/MMS/voice operations.
 */

export async function sendSms(
  to: string,
  body: string,
  options: {
    from: string;
    accountSid: string;
    authToken: string;
    mediaUrl?: string;
  }
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  const { from, accountSid, authToken, mediaUrl } = options;

  const params = new URLSearchParams({ From: from, To: to, Body: body });
  if (mediaUrl) params.set("MediaUrl", mediaUrl);

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    const data = await response.json();
    if (response.ok) {
      return { success: true, messageSid: data.sid };
    }
    console.error("[Twilio] Error:", data);
    return { success: false, error: data.message || "Failed to send SMS" };
  } catch (error) {
    console.error("[Twilio] Network error:", error);
    return { success: false, error: "Network error sending SMS" };
  }
}

export function twimlResponse(message?: string): string {
  if (!message) return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function parseTwilioWebhookBody(body: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(body).entries());
}

export function extractMediaUrls(webhook: Record<string, string>): string[] {
  const numMedia = parseInt(webhook.NumMedia || "0", 10);
  const urls: string[] = [];
  for (let i = 0; i < numMedia; i++) {
    const url = webhook[`MediaUrl${i}`];
    if (url) urls.push(url);
  }
  return urls;
}
