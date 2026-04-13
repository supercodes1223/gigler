import { describe, expect, it } from "vitest";
import {
  buildNudgeContextBlock,
  buildOwnerFallbackSms,
  buildParticipantFallbackSms,
} from "../nudge-context";

describe("buildNudgeContextBlock", () => {
  it("includes title, type, days idle, audience", () => {
    const s = buildNudgeContextBlock({
      audience: "owner",
      recipientFirstName: "Sam",
      gigTitle: "Monthly Bills",
      gigType: "household",
      daysIdle: 5,
      hints: {},
    });
    expect(s).toContain("Monthly Bills");
    expect(s).toContain("household");
    expect(s).toContain("5");
    expect(s).toContain("owner");
    expect(s).toContain("Sam");
  });

  it("includes optional description and hints", () => {
    const s = buildNudgeContextBlock({
      audience: "participant",
      recipientFirstName: "Jordan",
      gigTitle: "Party Plan",
      gigType: "planning",
      gigDescription: "50th birthday",
      daysIdle: 2,
      hints: {
        messageCount: 12,
        hasGroupChat: true,
        shortCode: "ab12cd",
        hasDeliverableHint: true,
      },
      participantDaysSinceMessage: 9,
    });
    expect(s).toContain("50th birthday");
    expect(s).toContain("12");
    expect(s).toContain("group MMS");
    expect(s).toContain("ab12cd");
    expect(s).toContain("deliverable");
    expect(s).toContain("9");
    expect(s).toContain("participant");
  });

  it("includes participant roster with contextLabel", () => {
    const s = buildNudgeContextBlock({
      audience: "participant",
      recipientFirstName: "Charles",
      gigTitle: "Utility Bills",
      gigType: "household",
      daysIdle: 7,
      hints: {},
      participantRoster: [
        { name: "Albert", role: "owner", daysSinceLastMessage: 7, isCurrentRecipient: false },
        { name: "Charles", role: "collaborator", contextLabel: "son - submits utility bills monthly", daysSinceLastMessage: 7, isCurrentRecipient: true },
        { name: "Sabrina", role: "collaborator", contextLabel: "mother - reviews and pays bills", daysSinceLastMessage: 7, isCurrentRecipient: false },
      ],
    });
    expect(s).toContain("Participants in this gig:");
    expect(s).toContain("Albert (owner");
    expect(s).toContain('Charles (collaborator, "son - submits utility bills monthly"');
    expect(s).toContain("<-- current recipient");
    expect(s).toContain('Sabrina (collaborator, "mother - reviews and pays bills"');
  });

  it("renders roster without contextLabel gracefully", () => {
    const s = buildNudgeContextBlock({
      audience: "owner",
      recipientFirstName: "Albert",
      gigTitle: "Utility Bills",
      gigType: "household",
      daysIdle: 7,
      hints: {},
      participantRoster: [
        { name: "Albert", role: "owner", daysSinceLastMessage: 7, isCurrentRecipient: false },
        { name: "Charles", role: "collaborator", isCurrentRecipient: false },
      ],
    });
    expect(s).toContain("Participants in this gig:");
    expect(s).toContain("Charles (collaborator, no messages yet)");
    expect(s).not.toContain("contextLabel");
  });
});

describe("fallback SMS builders", () => {
  it("buildOwnerFallbackSms uses singular day", () => {
    expect(buildOwnerFallbackSms("Pat", "Gig", 1)).toContain("1 day");
  });

  it("buildOwnerFallbackSms uses plural days", () => {
    expect(buildOwnerFallbackSms("Pat", "Gig", 3)).toContain("3 days");
  });

  it("buildParticipantFallbackSms includes name and title", () => {
    const m = buildParticipantFallbackSms("Alex", "Team gig");
    expect(m).toContain("Alex");
    expect(m).toContain("Team gig");
  });
});
