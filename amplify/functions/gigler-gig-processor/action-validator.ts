import type { GigAction } from "./vision-utils";

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export function isValidE164(phone: unknown): phone is string {
  return typeof phone === "string" && E164_REGEX.test(phone);
}

const RELATIONSHIP_WORDS = new Set([
  "son", "daughter", "mom", "dad", "mother", "father",
  "brother", "sister", "wife", "husband", "kid", "child",
  "parent", "roommate", "cousin", "uncle", "aunt",
  "nephew", "niece", "grandma", "grandpa", "partner",
  "boyfriend", "girlfriend", "fiancé", "fiancee", "spouse",
  "coworker", "colleague", "boss", "friend", "buddy", "pal",
]);

export function isValidParticipantName(name: unknown): name is string {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  if (/^\d+$/.test(trimmed)) return false;
  if (RELATIONSHIP_WORDS.has(trimmed.toLowerCase())) return false;
  return true;
}

const ADD_INTENT_WORDS = /\b(add|invite|include|bring|join|group|text|message|contact)\b/i;
const PHONE_PATTERN = /(?:\+?1?\s*[-.(]?\s*\d{3}\s*[-.)]\s*\d{3}\s*[-.]?\s*\d{4}|\b\d{10,11}\b)/;

export function userMessageSupportsAddParticipant(userMessage: string): boolean {
  if (!userMessage) return false;
  if (PHONE_PATTERN.test(userMessage)) return true;
  if (ADD_INTENT_WORDS.test(userMessage)) return true;
  return false;
}

export interface ValidationResult {
  valid: GigAction[];
  dropped: GigAction[];
}

export function validateAddParticipant(action: GigAction, userMessage: string): boolean {
  if (!isValidE164(action.phone)) return false;
  if (!isValidParticipantName(action.name)) return false;
  if (!userMessageSupportsAddParticipant(userMessage)) return false;
  return true;
}

function validateSetReminder(action: GigAction): boolean {
  return typeof action.scheduledAt === "string" && action.scheduledAt.length > 0;
}

function validateGenerateImage(action: GigAction): boolean {
  return typeof action.prompt === "string" && action.prompt.length > 0;
}

function validateCreateDeliverable(action: GigAction): boolean {
  return typeof action.deliverableType === "string" && action.deliverableType.length > 0;
}

export function validateAction(action: GigAction, userMessage: string): boolean {
  switch (action.type) {
    case "add_participant":
      return validateAddParticipant(action, userMessage);
    case "set_reminder":
      return validateSetReminder(action);
    case "generate_image":
      return validateGenerateImage(action);
    case "create_deliverable":
      return validateCreateDeliverable(action);
    case "create_collage":
    case "book_reservation":
    case "create_github_repo":
    case "update_bill_status":
      return true;
    default:
      return true;
  }
}

export function validateActions(actions: GigAction[], userMessage: string): ValidationResult {
  const valid: GigAction[] = [];
  const dropped: GigAction[] = [];

  for (const action of actions) {
    if (validateAction(action, userMessage)) {
      valid.push(action);
    } else {
      dropped.push(action);
    }
  }

  if (dropped.length > 0) {
    console.warn(
      `[ActionValidator] Dropped ${dropped.length} hallucinated action(s): ${dropped.map(a => `${a.type}(phone=${a.phone ?? "??"},name=${a.name ?? "??"})`).join(", ")}`
    );
  }

  return { valid, dropped };
}
