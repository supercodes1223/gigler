import { describe, expect, it } from "vitest";
import {
  buildDisambiguationList,
  buildGigDescriptions,
  buildKnownParticipantWelcomeMessage,
  classifyGigTypeFallback,
  deduplicateGigs,
  extractMediaUrls,
  getSafeFallbackTitle,
  hasOtherRecipients,
  isExplicitCommandMessage,
  isLikelyGigRequest,
  isValidGeneratedTitle,
  parseGigSelection,
  repairTruncatedJson,
  type AnnotatedGig,
  type TwilioSmsWebhook,
} from "../utils";

// ── Test Data ─────────────────────────────────────────────────────────────────

function makeGig(overrides: Partial<AnnotatedGig> & { id: string; title: string }): AnnotatedGig {
  return {
    status: "active",
    type: "general",
    userRole: "owner",
    createdAt: "2026-04-06T00:00:00Z",
    updatedAt: "2026-04-06T00:00:00Z",
    ...overrides,
  };
}

const PARTY_GIG = makeGig({
  id: "gig_party_001",
  title: "Birthday Party Planning",
  type: "event",
  userRole: "owner",
  metadata: JSON.stringify({ lastInteraction: "2026-04-06T22:00:00Z" }),
});

const WEBSITE_GIG = makeGig({
  id: "gig_website_002",
  title: "Website Redesign Project",
  type: "project",
  userRole: "owner",
  metadata: JSON.stringify({ lastInteraction: "2026-04-05T18:00:00Z" }),
});

const COLLAB_GIG = makeGig({
  id: "gig_offsite_003",
  title: "Team Offsite Logistics",
  type: "event",
  userRole: "collaborator",
  invitedByName: "Albert",
  ownerId: "usr_other_001",
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe("buildGigDescriptions", () => {
  it("formats owned gig with role and last-active", () => {
    const result = buildGigDescriptions([PARTY_GIG]);
    expect(result).toContain("Birthday Party Planning");
    expect(result).toContain("(owner)");
    expect(result).toContain("2026-04-06T22:00:00Z");
  });

  it("formats collaborator gig with inviter name", () => {
    const result = buildGigDescriptions([COLLAB_GIG]);
    expect(result).toContain("Team Offsite Logistics");
    expect(result).toContain("collaborator, invited by Albert");
  });

  it("numbers multiple gigs sequentially", () => {
    const result = buildGigDescriptions([PARTY_GIG, WEBSITE_GIG, COLLAB_GIG]);
    expect(result).toMatch(/^1\./);
    expect(result).toContain("2.");
    expect(result).toContain("3.");
  });

  it("handles gigs with no metadata gracefully", () => {
    const gig: AnnotatedGig = {
      id: "gig_no_meta",
      title: "No Meta Gig",
      status: "active",
      type: "general",
      userRole: "owner",
    };
    const result = buildGigDescriptions([gig]);
    expect(result).toContain("unknown");
  });

  it("handles gigs with metadata as object (not string)", () => {
    const gig = makeGig({
      id: "gig_obj_meta",
      title: "Obj Meta Gig",
      metadata: { lastInteraction: "2026-04-01T00:00:00Z" } as unknown as string,
    });
    const result = buildGigDescriptions([gig]);
    expect(result).toContain("2026-04-01T00:00:00Z");
  });
});

describe("parseGigSelection", () => {
  const gigs = [PARTY_GIG, WEBSITE_GIG, COLLAB_GIG];

  it("selects gig 1 when AI responds '1'", () => {
    const result = parseGigSelection("1", gigs);
    expect("gig" in result).toBe(true);
    if ("gig" in result) {
      expect(result.gig.id).toBe("gig_party_001");
    }
  });

  it("selects gig 2 when AI responds '2'", () => {
    const result = parseGigSelection("2", gigs);
    expect("gig" in result).toBe(true);
    if ("gig" in result) {
      expect(result.gig.id).toBe("gig_website_002");
    }
  });

  it("selects gig 3 when AI responds '3'", () => {
    const result = parseGigSelection("3", gigs);
    expect("gig" in result).toBe(true);
    if ("gig" in result) {
      expect(result.gig.id).toBe("gig_offsite_003");
    }
  });

  it("returns ambiguous when AI responds 'ambiguous'", () => {
    const result = parseGigSelection("ambiguous", gigs);
    expect("ambiguous" in result).toBe(true);
  });

  it("returns ambiguous for empty string", () => {
    const result = parseGigSelection("", gigs);
    expect("ambiguous" in result).toBe(true);
  });

  it("returns ambiguous for out-of-range number", () => {
    const result = parseGigSelection("5", gigs);
    expect("ambiguous" in result).toBe(true);
  });

  it("returns ambiguous for negative number", () => {
    const result = parseGigSelection("0", gigs);
    expect("ambiguous" in result).toBe(true);
  });

  it("handles number with trailing text (e.g. '2 - Website')", () => {
    const result = parseGigSelection("2 - Website Redesign", gigs);
    expect("gig" in result).toBe(true);
    if ("gig" in result) {
      expect(result.gig.id).toBe("gig_website_002");
    }
  });

  it("handles leading whitespace", () => {
    const result = parseGigSelection("  1  ", gigs);
    expect("gig" in result).toBe(true);
    if ("gig" in result) {
      expect(result.gig.id).toBe("gig_party_001");
    }
  });
});

describe("buildDisambiguationList", () => {
  it("lists owned gigs without role suffix", () => {
    const result = buildDisambiguationList([PARTY_GIG]);
    expect(result).toBe('1. Birthday Party Planning');
  });

  it("lists collaborator gigs with inviter name", () => {
    const result = buildDisambiguationList([COLLAB_GIG]);
    expect(result).toBe("1. Team Offsite Logistics (with Albert)");
  });

  it("lists collaborator gigs with 'others' when no inviter name", () => {
    const noInviter = makeGig({
      id: "gig_noinv",
      title: "Anonymous Collab",
      userRole: "collaborator",
    });
    const result = buildDisambiguationList([noInviter]);
    expect(result).toBe("1. Anonymous Collab (with others)");
  });

  it("numbers mixed gigs correctly", () => {
    const result = buildDisambiguationList([PARTY_GIG, COLLAB_GIG, WEBSITE_GIG]);
    const lines = result.split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatch(/^1\./);
    expect(lines[1]).toMatch(/^2\./);
    expect(lines[2]).toMatch(/^3\./);
  });
});

describe("deduplicateGigs", () => {
  it("removes participated gigs that are already owned", () => {
    const owned = [PARTY_GIG];
    const participated = [
      {
        gigId: "gig_party_001",
        gigData: { id: "gig_party_001", title: "Birthday Party Planning", status: "active" },
      },
    ];
    const result = deduplicateGigs(owned, participated);
    expect(result).toHaveLength(1);
    expect(result[0].userRole).toBe("owner");
  });

  it("includes participated gigs not in owned set", () => {
    const owned = [PARTY_GIG];
    const participated = [
      {
        gigId: "gig_offsite_003",
        invitedByName: "Albert",
        gigData: { id: "gig_offsite_003", title: "Team Offsite Logistics", status: "active" },
      },
    ];
    const result = deduplicateGigs(owned, participated);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("gig_party_001");
    expect(result[1].id).toBe("gig_offsite_003");
    expect(result[1].userRole).toBe("collaborator");
    expect(result[1].invitedByName).toBe("Albert");
  });

  it("returns empty when no gigs", () => {
    const result = deduplicateGigs([], []);
    expect(result).toHaveLength(0);
  });

  it("returns only owned when no participations", () => {
    const result = deduplicateGigs([PARTY_GIG, WEBSITE_GIG], []);
    expect(result).toHaveLength(2);
  });
});

describe("single-gig auto-routing", () => {
  it("returns the gig directly when only one active gig", () => {
    const gigs = [PARTY_GIG];
    expect(gigs.length).toBe(1);
    expect(gigs[0].id).toBe("gig_party_001");
  });
});

describe("multi-gig routing scenarios", () => {
  it("two owned gigs + one collab = 3 gigs for selection", () => {
    const gigs = [PARTY_GIG, WEBSITE_GIG, COLLAB_GIG];
    expect(gigs.length).toBe(3);

    const descriptions = buildGigDescriptions(gigs);
    expect(descriptions).toContain("Birthday Party");
    expect(descriptions).toContain("Website Redesign");
    expect(descriptions).toContain("Team Offsite");
  });

  it("party-related message selects party gig (simulated AI response '1')", () => {
    const gigs = [PARTY_GIG, WEBSITE_GIG, COLLAB_GIG];
    const result = parseGigSelection("1", gigs);
    expect("gig" in result).toBe(true);
    if ("gig" in result) {
      expect(result.gig.title).toBe("Birthday Party Planning");
    }
  });

  it("website-related message selects website gig (simulated AI response '2')", () => {
    const gigs = [PARTY_GIG, WEBSITE_GIG, COLLAB_GIG];
    const result = parseGigSelection("2", gigs);
    expect("gig" in result).toBe(true);
    if ("gig" in result) {
      expect(result.gig.title).toBe("Website Redesign Project");
    }
  });

  it("ambiguous message triggers disambiguation list", () => {
    const gigs = [PARTY_GIG, WEBSITE_GIG, COLLAB_GIG];
    const result = parseGigSelection("ambiguous", gigs);
    expect("ambiguous" in result).toBe(true);

    const list = buildDisambiguationList(gigs);
    expect(list).toContain("Birthday Party");
    expect(list).toContain("Website Redesign");
    expect(list).toContain("Team Offsite");
  });
});

describe("title fallback helpers", () => {
  it("maps household gigs to a safe fallback title", () => {
    expect(getSafeFallbackTitle("household")).toBe("New Household Gig");
  });

  it("maps custom gigs to the generic fallback title", () => {
    expect(getSafeFallbackTitle("custom")).toBe("New Gig");
  });

  it("accepts a concise generated title", () => {
    expect(
      isValidGeneratedTitle(
        "Track Monthly Utility Bills",
        "I need to track my son's monthly utility bills and reminders."
      )
    ).toBe(true);
  });

  it("rejects a generated title that mirrors the original sentence", () => {
    expect(
      isValidGeneratedTitle(
        "I need to track my son's monthly utility bills",
        "I need to track my son's monthly utility bills"
      )
    ).toBe(false);
  });

  it("rejects imperative prompt-like titles", () => {
    expect(
      isValidGeneratedTitle(
        "Set up reminders for bills",
        "Set up reminders for bills and dashboard"
      )
    ).toBe(false);
  });
});

describe("twilio webhook helpers", () => {
  it("extracts media urls in order", () => {
    const webhook: TwilioSmsWebhook = {
      MessageSid: "SM123",
      AccountSid: "AC123",
      From: "+15550000001",
      To: "+15550000002",
      Body: "photo",
      NumMedia: "2",
      MediaUrl0: "https://example.com/0.jpg",
      MediaUrl1: "https://example.com/1.jpg",
    };

    expect(extractMediaUrls(webhook)).toEqual([
      "https://example.com/0.jpg",
      "https://example.com/1.jpg",
    ]);
  });

  it("detects other recipients on mirrored group mms webhooks", () => {
    const webhook: TwilioSmsWebhook = {
      MessageSid: "SM123",
      AccountSid: "AC123",
      From: "+15550000001",
      To: "+15550000002",
      Body: "hello",
      NumMedia: "0",
      OtherRecipients0: "+15550000003",
    };

    expect(hasOtherRecipients(webhook)).toBe(true);
  });

  it("does not flag normal sms webhooks as group mirrors", () => {
    const webhook: TwilioSmsWebhook = {
      MessageSid: "SM123",
      AccountSid: "AC123",
      From: "+15550000001",
      To: "+15550000002",
      Body: "hello",
      NumMedia: "0",
    };

    expect(hasOtherRecipients(webhook)).toBe(false);
  });
});

describe("participant onboarding-lite messaging", () => {
  it("mentions the single active gig by title", () => {
    const message = buildKnownParticipantWelcomeMessage("Guido", [PARTY_GIG]);
    expect(message).toContain("Guido");
    expect(message).toContain("Birthday Party Planning");
  });

  it("lists multiple active gigs for known participants", () => {
    const message = buildKnownParticipantWelcomeMessage("Guido", [PARTY_GIG, WEBSITE_GIG, COLLAB_GIG]);
    expect(message).toContain("Your active gigs:");
    expect(message).toContain("1. Birthday Party Planning");
    expect(message).toContain("2. Website Redesign Project");
  });
});

describe("intent and command helpers", () => {
  it("detects explicit command messages", () => {
    expect(isExplicitCommandMessage("done 1")).toBe(true);
    expect(isExplicitCommandMessage("my gigs")).toBe(true);
    expect(isExplicitCommandMessage("can you help with the menu")).toBe(false);
  });

  it("detects likely gig creation requests", () => {
    expect(isLikelyGigRequest("please build me a website")).toBe(true);
    expect(isLikelyGigRequest("hello there")).toBe(false);
  });

  it("classifies household fallback requests", () => {
    expect(classifyGigTypeFallback("track utility bills and rent reminders")).toBe("household");
  });
});

describe("json repair helper", () => {
  it("repairs truncated json with missing closing braces", () => {
    expect(repairTruncatedJson('{"type":"create_gig","gigType":"household"')).toEqual({
      type: "create_gig",
      gigType: "household",
    });
  });

  it("returns null when repair is impossible", () => {
    expect(repairTruncatedJson("not json at all")).toBeNull();
  });
});
