/**
 * Viral growth loop helpers.
 * Manages guest-to-user conversion triggers and tracking.
 *
 * Three conversion triggers (soft prompts, never blocking):
 * 1. Gig completes -> post-gig CTA to guests
 * 2. Guest texts main Gigler number -> recognition + signup prompt
 * 3. Guest tries to create gig in group thread -> redirect
 */

export function buildPostGigCta(guestName: string): string {
  return `Hey ${guestName}! That was a great gig. Want your own Gigler? Reply with your name to get started, or "SKIP" for now.`;
}

export function buildDirectTextWelcome(guestName: string, gigTitle: string): string {
  return `Hey ${guestName}! I see you were part of "${gigTitle}". Want to set up your own Gigler? What's your name?`;
}

export function buildGigCreationRedirect(): string {
  return "Love the initiative! To create your own gig, just text me at the main Gigler number or reply with your name to get set up right now.";
}

export function buildGuestWelcomeToGig(
  guestName: string,
  inviterName: string,
  gigTitle: string
): string {
  return `Hi ${guestName}! ${inviterName} invited you to:\n"${gigTitle}"\nI'll be helping complete all the tasks and coordinate everything.\nText here anytime! You can create a different Gig anytime at Gigler.ai`;
}

export interface ViralMetrics {
  totalGuests: number;
  convertedGuests: number;
  conversionRate: number;
  averageGigsBeforeConversion: number;
}

/**
 * Tracks viral loop metrics for analytics.
 * In production, this would query DynamoDB for:
 * - Total GigParticipant records with isGuest=true
 * - GigParticipant records where isGuest changed from true to false
 */
export function calculateViralMetrics(
  totalGuests: number,
  convertedGuests: number,
  totalGigsWithGuests: number
): ViralMetrics {
  return {
    totalGuests,
    convertedGuests,
    conversionRate: totalGuests > 0 ? convertedGuests / totalGuests : 0,
    averageGigsBeforeConversion:
      convertedGuests > 0 ? totalGigsWithGuests / convertedGuests : 0,
  };
}
