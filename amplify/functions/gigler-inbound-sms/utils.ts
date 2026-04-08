export interface TwilioSmsWebhook {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  FromCity?: string;
  FromState?: string;
  [key: string]: string | undefined;
}

export interface AnnotatedGig extends Record<string, unknown> {
  userRole: "owner" | "collaborator";
  invitedByName?: string;
}

export type GigType =
  | "coding"
  | "planning"
  | "creative"
  | "professional"
  | "lifestyle"
  | "scheduling"
  | "education"
  | "business_formation"
  | "reservations"
  | "household"
  | "custom";

export function extractMediaUrls(webhook: TwilioSmsWebhook): string[] {
  const numMedia = parseInt(webhook.NumMedia || "0", 10);
  const urls: string[] = [];
  for (let i = 0; i < numMedia; i++) {
    const url = webhook[`MediaUrl${i}`];
    if (url) urls.push(url);
  }
  return urls;
}

export function hasOtherRecipients(webhook: TwilioSmsWebhook): boolean {
  return Object.keys(webhook).some((key) => /^OtherRecipients\d+$/.test(key));
}

export function buildGigDescriptions(gigs: AnnotatedGig[]): string {
  return gigs
    .map((g, i) => {
      const meta =
        typeof g.metadata === "string"
          ? JSON.parse(g.metadata as string)
          : g.metadata || {};
      const lastActive =
        (meta.lastInteraction as string) ||
        (g.updatedAt as string) ||
        "";
      const role =
        g.userRole === "owner"
          ? "owner"
          : `collaborator${g.invitedByName ? `, invited by ${g.invitedByName}` : ""}`;
      return `${i + 1}. "${g.title}" (${role}) - ${g.type || "general"}, last active: ${lastActive || "unknown"}`;
    })
    .join("\n");
}

export function parseGigSelection(
  text: string,
  gigs: AnnotatedGig[]
): { gig: AnnotatedGig } | { ambiguous: true } {
  const numMatch = text.trim().match(/^(\d+)/);
  if (numMatch) {
    const idx = parseInt(numMatch[1], 10) - 1;
    if (idx >= 0 && idx < gigs.length) {
      return { gig: gigs[idx] };
    }
  }
  return { ambiguous: true };
}

export function buildDisambiguationList(gigs: AnnotatedGig[]): string {
  return gigs
    .map((g, i) => {
      const roleLabel =
        g.userRole === "owner"
          ? ""
          : ` (with ${g.invitedByName || "others"})`;
      return `${i + 1}. ${g.title}${roleLabel}`;
    })
    .join("\n");
}

export function deduplicateGigs(
  ownedGigs: AnnotatedGig[],
  participatedGigs: Array<{ gigId: string; invitedByName?: string; gigData: Record<string, unknown> }>
): AnnotatedGig[] {
  const ownedGigIds = new Set(ownedGigs.map((g) => g.id as string));
  const deduped: AnnotatedGig[] = [...ownedGigs];

  for (const p of participatedGigs) {
    if (ownedGigIds.has(p.gigId)) continue;
    deduped.push({
      ...p.gigData,
      userRole: "collaborator" as const,
      invitedByName: p.invitedByName,
    });
  }

  return deduped;
}

export function getSafeFallbackTitle(gigType: GigType): string {
  switch (gigType) {
    case "coding":
      return "New Coding Gig";
    case "planning":
      return "New Planning Gig";
    case "creative":
      return "New Creative Gig";
    case "professional":
      return "New Professional Gig";
    case "lifestyle":
      return "New Lifestyle Gig";
    case "scheduling":
      return "New Scheduling Gig";
    case "education":
      return "New Education Gig";
    case "business_formation":
      return "New Business Formation Gig";
    case "reservations":
      return "New Reservations Gig";
    case "household":
      return "New Household Gig";
    case "custom":
    default:
      return "New Gig";
  }
}

function normalizeTitleText(text: string): string {
  return text
    .toLowerCase()
    .replace(/["'`]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isValidGeneratedTitle(title: string, sourceMessage: string): boolean {
  const cleanedTitle = title.trim().replace(/^["']|["']$/g, "").replace(/[.!?]+$/g, "");
  const normalizedTitle = normalizeTitleText(cleanedTitle);
  const normalizedSource = normalizeTitleText(sourceMessage);
  const wordCount = normalizedTitle ? normalizedTitle.split(/\s+/).length : 0;

  if (!normalizedTitle) return false;
  if (wordCount < 2 || wordCount > 7) return false;
  if (cleanedTitle.length >= 80) return false;
  if (/^(i need|need to|help me|please|set up|create|build|plan|organize)\b/i.test(cleanedTitle)) {
    return false;
  }
  if (normalizedTitle === normalizedSource) return false;
  if (normalizedSource.startsWith(normalizedTitle) && wordCount >= 4) return false;
  if (normalizedSource.includes(normalizedTitle) && normalizedTitle.length >= normalizedSource.length * 0.6) {
    return false;
  }

  return true;
}

export function buildKnownParticipantWelcomeMessage(
  participantName: string | undefined,
  gigs: AnnotatedGig[]
): string {
  const greeting = `Hey${participantName ? ` ${participantName}` : ""}!`;

  if (gigs.length === 0) {
    return `${greeting} You're already part of a gig here on Gigler. You can also create your own gigs anytime — just tell me what you need!`;
  }

  if (gigs.length === 1) {
    return `${greeting} You're already part of "${gigs[0].title}" here on Gigler. You can jump back into that anytime, or tell me something new to create your own gig.`;
  }

  const gigList = gigs
    .slice(0, 4)
    .map((gig, index) => `${index + 1}. ${gig.title}`)
    .join("\n");

  return `${greeting} You're already part of Gigler.\n\nYour active gigs:\n${gigList}\n\nReply with a number to jump in, or tell me something new to create your own gig.`;
}

export function repairTruncatedJson(raw: string): Record<string, unknown> | null {
  const partial = raw.match(/\{[\s\S]*/)?.[0];
  if (!partial) return null;
  try {
    const repaired = partial.replace(/,\s*"[^"]*$/, "").replace(/,\s*$/, "");
    const openCount = (repaired.match(/\{/g) || []).length;
    const closeCount = (repaired.match(/\}/g) || []).length;
    const closed = repaired + "}".repeat(Math.max(0, openCount - closeCount));
    return JSON.parse(closed);
  } catch {
    return null;
  }
}

export function isLikelyGigRequest(msg: string): boolean {
  const actionWords = [
    "plan",
    "build",
    "create",
    "organize",
    "schedule",
    "book",
    "form",
    "make",
    "set up",
    "design",
    "draft",
    "prepare",
    "arrange",
    "coordinate",
    "remind",
    "help me",
    "deploy",
    "scaffold",
    "generate",
  ];
  return actionWords.some((w) => msg.includes(w));
}

export function classifyGigTypeFallback(msg: string): GigType {
  if (/code|website|app|deploy|github|debug|api|database/i.test(msg)) return "coding";
  if (/llc|business|ein|operating agreement|tax id|bank account/i.test(msg)) return "business_formation";
  if (/bill|utilit|rent|electric|water|gas bill|expense|household/i.test(msg)) return "household";
  if (/party|wedding|reunion|trip|event|birthday|graduation/i.test(msg)) return "planning";
  if (/image|photo|video|collage|flyer|design|graphic/i.test(msg)) return "creative";
  if (/legal|contract|resume|consult|mediat/i.test(msg)) return "professional";
  if (/remind|wake|schedule|calendar|habit|meeting/i.test(msg)) return "scheduling";
  if (/meal|move|home|pet|gift|grocery/i.test(msg)) return "lifestyle";
  if (/study|learn|tutor|research|college|exam|language/i.test(msg)) return "education";
  if (/reserv|book|restaurant|hotel|flight|evite|resy|opentable/i.test(msg)) return "reservations";
  return "planning";
}

export function isExplicitCommandMessage(message: string): boolean {
  return /^(list|my gigs|show gigs|create|new gig|done|finish|complete|pause|hold|archive|delete|remove|cancel)\b/i.test(message.trim());
}
