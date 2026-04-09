/**
 * Gig-type-specific stale thresholds and nudge cooldowns (hours).
 * Aligns with amplify/data/resource.ts Gig.type enum.
 */

export interface NudgeCadence {
  staleHours: number;
  cooldownHours: number;
}

const DEFAULT_CADENCE: NudgeCadence = { staleHours: 48, cooldownHours: 48 };

/** Multiplier applied to staleHours for "participant hasn't messaged" threshold. */
export const PARTICIPANT_STALE_HOURS_MULTIPLIER = 0.75;

const CADENCE_BY_TYPE: Record<string, NudgeCadence> = {
  /** Bills / utilities — monthly rhythm; avoid nagging every 2 days */
  household: { staleHours: 168, cooldownHours: 168 },
  /** Events and calendars — medium urgency */
  planning: { staleHours: 72, cooldownHours: 72 },
  scheduling: { staleHours: 72, cooldownHours: 72 },
  /** Project-style work */
  creative: { staleHours: 120, cooldownHours: 120 },
  coding: { staleHours: 120, cooldownHours: 120 },
  professional: { staleHours: 120, cooldownHours: 120 },
  /** Default shorter cadence */
  lifestyle: DEFAULT_CADENCE,
  education: DEFAULT_CADENCE,
  business_formation: DEFAULT_CADENCE,
  reservations: DEFAULT_CADENCE,
  custom: DEFAULT_CADENCE,
};

export function getNudgeCadence(gigType: string | undefined | null): NudgeCadence {
  if (!gigType) return DEFAULT_CADENCE;
  return CADENCE_BY_TYPE[gigType] ?? DEFAULT_CADENCE;
}

export function getParticipantStaleHours(gigType: string | undefined | null): number {
  const { staleHours } = getNudgeCadence(gigType);
  return Math.max(1, Math.round(staleHours * PARTICIPANT_STALE_HOURS_MULTIPLIER));
}

/** All Gig.type values from schema (for tests). */
export const KNOWN_GIG_TYPES = [
  "coding",
  "planning",
  "creative",
  "professional",
  "lifestyle",
  "scheduling",
  "education",
  "business_formation",
  "reservations",
  "household",
  "custom",
] as const;
