export type UserPlan = "free" | "pro" | "team" | "enterprise";

export type GigType =
  | "coding"
  | "planning"
  | "creative"
  | "professional"
  | "lifestyle"
  | "scheduling"
  | "education"
  | "business_formation"
  | "reservations";

export type GigStatus = "active" | "paused" | "completed" | "archived";

export type ParticipantRole = "owner" | "collaborator" | "viewer";

export type MessageType = "sms" | "mms" | "voice_note" | "system" | "ai";
export type MessageDirection = "inbound" | "outbound";

export type MediaType =
  | "photo"
  | "video"
  | "document"
  | "code"
  | "pdf"
  | "voice_note";

export type DeliverableType =
  | "pdf"
  | "website"
  | "menu"
  | "collage"
  | "code_project";

export type ReminderType =
  | "reminder"
  | "wake_up_call"
  | "check_in"
  | "countdown";

export type ReminderChannel = "sms" | "voice";

export type ThirdPartyPlatform =
  | "opentable"
  | "resy"
  | "evite"
  | "doordash"
  | "instacart"
  | "uber"
  | "yelp";

export type ThirdPartyActionType =
  | "reservation"
  | "event_create"
  | "invite_send"
  | "booking"
  | "order";

export type ThirdPartyActionStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "failed";

export type IntegrationPlatform =
  | "opentable"
  | "resy"
  | "evite"
  | "google"
  | "stripe";

export interface TwilioSmsWebhook {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  FromCity?: string;
  FromState?: string;
  MediaUrl0?: string;
  MediaUrl1?: string;
  MediaUrl2?: string;
  MediaUrl3?: string;
  MediaUrl4?: string;
  MediaContentType0?: string;
  MediaContentType1?: string;
  MediaContentType2?: string;
  MediaContentType3?: string;
  MediaContentType4?: string;
}
