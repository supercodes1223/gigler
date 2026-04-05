/**
 * Twilio Conversations API helpers for group gig threads.
 * Each gig gets its own Conversation for multi-party messaging.
 */

const TWILIO_API_BASE = "https://conversations.twilio.com/v1";

interface ConversationsConfig {
  accountSid: string;
  authToken: string;
  serviceSid?: string;
}

function authHeaders(config: ConversationsConfig) {
  return {
    Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

export async function createConversation(
  config: ConversationsConfig,
  friendlyName: string
): Promise<{ sid: string; friendlyName: string }> {
  const base = config.serviceSid
    ? `${TWILIO_API_BASE}/Services/${config.serviceSid}/Conversations`
    : `${TWILIO_API_BASE}/Conversations`;

  const response = await fetch(base, {
    method: "POST",
    headers: authHeaders(config),
    body: new URLSearchParams({ FriendlyName: friendlyName }).toString(),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to create conversation: ${data.message || response.statusText}`);
  }

  return { sid: data.sid, friendlyName: data.friendly_name };
}

export async function addSmsParticipant(
  config: ConversationsConfig,
  conversationSid: string,
  phone: string,
  proxyPhone: string
): Promise<{ sid: string }> {
  const base = config.serviceSid
    ? `${TWILIO_API_BASE}/Services/${config.serviceSid}/Conversations/${conversationSid}/Participants`
    : `${TWILIO_API_BASE}/Conversations/${conversationSid}/Participants`;

  const response = await fetch(base, {
    method: "POST",
    headers: authHeaders(config),
    body: new URLSearchParams({
      "MessagingBinding.Address": phone,
      "MessagingBinding.ProxyAddress": proxyPhone,
    }).toString(),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to add participant: ${data.message || response.statusText}`);
  }

  return { sid: data.sid };
}

export async function removeParticipant(
  config: ConversationsConfig,
  conversationSid: string,
  participantSid: string
): Promise<void> {
  const base = config.serviceSid
    ? `${TWILIO_API_BASE}/Services/${config.serviceSid}/Conversations/${conversationSid}/Participants/${participantSid}`
    : `${TWILIO_API_BASE}/Conversations/${conversationSid}/Participants/${participantSid}`;

  const response = await fetch(base, {
    method: "DELETE",
    headers: authHeaders(config),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(`Failed to remove participant: ${data.message || response.statusText}`);
  }
}

export async function sendConversationMessage(
  config: ConversationsConfig,
  conversationSid: string,
  body: string,
  author?: string
): Promise<{ sid: string }> {
  const base = config.serviceSid
    ? `${TWILIO_API_BASE}/Services/${config.serviceSid}/Conversations/${conversationSid}/Messages`
    : `${TWILIO_API_BASE}/Conversations/${conversationSid}/Messages`;

  const params = new URLSearchParams({ Body: body });
  if (author) params.set("Author", author);

  const response = await fetch(base, {
    method: "POST",
    headers: authHeaders(config),
    body: params.toString(),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to send message: ${data.message || response.statusText}`);
  }

  return { sid: data.sid };
}

export async function listParticipants(
  config: ConversationsConfig,
  conversationSid: string
): Promise<Array<{ sid: string; identity?: string; messagingBinding?: { address?: string } }>> {
  const base = config.serviceSid
    ? `${TWILIO_API_BASE}/Services/${config.serviceSid}/Conversations/${conversationSid}/Participants`
    : `${TWILIO_API_BASE}/Conversations/${conversationSid}/Participants`;

  const response = await fetch(base, {
    method: "GET",
    headers: authHeaders(config),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to list participants: ${data.message || response.statusText}`);
  }

  return data.participants || [];
}
