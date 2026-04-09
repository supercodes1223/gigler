/**
 * Build prompt context for Gemini nudge generation.
 */

export type NudgeAudience = "owner" | "participant";

export interface NudgeContextInput {
  audience: NudgeAudience;
  recipientFirstName: string;
  gigTitle: string;
  gigType: string;
  gigDescription?: string;
  daysIdle: number;
  /** Parsed gig metadata (subset) */
  hints: {
    messageCount?: number;
    hasGroupChat?: boolean;
    shortCode?: string;
    hasDeliverableHint?: boolean;
  };
  /** For participants: days since they last sent inbound in thread */
  participantDaysSinceMessage?: number;
}

export function buildNudgeContextBlock(input: NudgeContextInput): string {
  const lines: string[] = [
    `Audience: ${input.audience}`,
    `Recipient first name: ${input.recipientFirstName}`,
    `Gig title: ${input.gigTitle}`,
    `Gig type: ${input.gigType}`,
    `Days since last gig activity: ${input.daysIdle}`,
  ];
  if (input.gigDescription) {
    lines.push(`Gig description: ${input.gigDescription}`);
  }
  if (input.hints.messageCount != null) {
    lines.push(`Approx message count (from metadata): ${input.hints.messageCount}`);
  }
  if (input.hints.hasGroupChat) {
    lines.push("This gig has a group MMS thread.");
  }
  if (input.hints.shortCode) {
    lines.push(`Short link / deliverable code present: ${input.hints.shortCode}`);
  }
  if (input.hints.hasDeliverableHint) {
    lines.push("A deliverable or dashboard may exist for this gig.");
  }
  if (input.audience === "participant" && input.participantDaysSinceMessage != null) {
    lines.push(`Days since this person last messaged in the thread: ${input.participantDaysSinceMessage}`);
  }
  return lines.join("\n");
}

export function buildOwnerFallbackSms(name: string, title: string, daysIdle: number): string {
  const dayWord = daysIdle === 1 ? "day" : "days";
  return `Hey ${name}! Your gig "${title}" hasn't had activity in ${daysIdle} ${dayWord}. Need help? Just text back!`;
}

export function buildParticipantFallbackSms(name: string, title: string): string {
  return `Hi ${name}! The group for "${title}" hasn't heard from you in a while — reply with an update or share a photo (e.g. a bill) when you can.`;
}
