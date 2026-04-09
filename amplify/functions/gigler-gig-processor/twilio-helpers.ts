export function parseFormBody(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  const parsed = new URLSearchParams(body);
  parsed.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

export function conversationsBase(path: string, serviceSid: string): string {
  return `https://conversations.twilio.com/v1/Services/${serviceSid}${path}`;
}

export function conversationsAuthHeaders(accountSid: string, authToken: string): Record<string, string> {
  return {
    Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

export function maskPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.length > 4 ? `***${phone.slice(-4)}` : phone;
}
