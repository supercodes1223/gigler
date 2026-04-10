import type { GigAction } from "./vision-utils";
import { isValidE164, validateActions } from "./action-validator";

export type { GigAction };

export interface GeminiPart {
  text?: string;
  functionCall?: {
    name: string;
    args: Record<string, unknown>;
  };
}

export interface GeminiResponse {
  parts: GeminiPart[];
  finishReason?: string;
}

export function extractFromGeminiResponse(
  response: GeminiResponse,
  userMessage?: string,
): { userText: string; actions: GigAction[] } {
  const textParts: string[] = [];
  const rawActions: GigAction[] = [];

  for (const part of response.parts) {
    if (part.text) {
      textParts.push(part.text);
    }
    if (part.functionCall) {
      const fc = part.functionCall;
      const action = mapFunctionCallToAction(fc.name, fc.args);
      if (action) {
        rawActions.push(action);
      }
    }
  }

  const { valid: actions } = validateActions(rawActions, userMessage || "");

  let userText = textParts.join("").trim();

  if (!userText && actions.length > 0) {
    userText = generateFallbackText(actions);
  } else if (!userText) {
    userText = "I'm working on that!";
  }

  return { userText, actions };
}

export function generateFallbackText(actions: GigAction[]): string {
  const types = actions.map(a => a.type);
  if (types.includes("add_participant")) {
    const p = actions.find(a => a.type === "add_participant");
    return `On it! Adding ${p?.name || "them"} to the group now.`;
  }
  if (types.includes("set_reminder")) {
    return "Done! I've set up the reminders for you.";
  }
  if (types.includes("generate_image")) {
    return "Generating that image for you now!";
  }
  if (types.includes("create_deliverable")) {
    return "Creating that for you now!";
  }
  if (types.includes("create_collage")) {
    return "Building your gallery page now!";
  }
  return "On it!";
}

const RELATIONSHIP_WORDS = ["son", "daughter", "mom", "dad", "mother", "father", "brother", "sister", "wife", "husband", "kid", "child", "parent", "roommate"];

export function mapFunctionCallToAction(name: string, args: Record<string, unknown>): GigAction | null {
  switch (name) {
    case "add_participant": {
      if (!isValidE164(args.phone)) {
        console.warn(`[ActionParser] add_participant rejected: invalid phone "${String(args.phone ?? "")}"`);
        return null;
      }
      let participantName = (args.name as string) || "Participant";
      if (RELATIONSHIP_WORDS.includes(participantName.toLowerCase())) {
        participantName = "Participant";
      }
      return { type: "add_participant", name: participantName, phone: args.phone };
    }
    case "set_reminder":
      return {
        type: "set_reminder",
        scheduledAt: args.scheduledAt as string,
        reminderMessage: args.reminderMessage as string,
        channel: (args.channel as string) || "sms",
        recurrence: args.recurrence as string | undefined,
        recurrenceDay: args.recurrenceDay as number | undefined,
      };
    case "generate_image":
      return { type: "generate_image", prompt: args.prompt as string };
    case "create_deliverable":
      return {
        type: "create_deliverable",
        deliverableType: args.deliverableType as string,
        title: args.title as string,
        content: args.content as string,
      };
    case "book_reservation":
      return {
        type: "book_reservation",
        platform: args.platform as string,
        params: args.params as Record<string, unknown>,
      };
    case "create_github_repo":
      return {
        type: "create_github_repo",
        name: args.name as string,
        description: args.description as string | undefined,
        files: args.files as Array<{ path: string; content: string }>,
      };
    case "create_collage":
      return {
        type: "create_collage",
        title: args.title as string,
        content: args.content as string | undefined,
      };
    case "update_bill_status":
      return {
        type: "update_bill_status",
        billType: args.billType as string,
        vendor: args.vendor as string | undefined,
        amount: args.amount as number | undefined,
        dueDate: args.dueDate as string | undefined,
        billingPeriod: args.billingPeriod as string | undefined,
        billStatus: args.billStatus as string,
      };
    default:
      return null;
  }
}
