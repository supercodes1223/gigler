import { describe, expect, it, vi } from "vitest";
import {
  isValidE164,
  isValidParticipantName,
  userMessageSupportsAddParticipant,
  validateAddParticipant,
  validateAction,
  validateActions,
} from "../action-validator";
import type { GigAction } from "../vision-utils";

// ── isValidE164 ──────────────────────────────────────────────────────────────

describe("isValidE164", () => {
  it("accepts a valid US number", () => {
    expect(isValidE164("+14155551234")).toBe(true);
  });

  it("accepts a valid US number with different area code", () => {
    expect(isValidE164("+12812419268")).toBe(true);
  });

  it("accepts a valid international number (UK)", () => {
    expect(isValidE164("+447911123456")).toBe(true);
  });

  it("accepts minimum length (7 digits after country code)", () => {
    expect(isValidE164("+1234567")).toBe(true);
  });

  it("accepts maximum length (15 digits total)", () => {
    expect(isValidE164("+123456789012345")).toBe(true);
  });

  it("rejects undefined", () => {
    expect(isValidE164(undefined)).toBe(false);
  });

  it("rejects null", () => {
    expect(isValidE164(null)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidE164("")).toBe(false);
  });

  it("rejects number without + prefix", () => {
    expect(isValidE164("14155551234")).toBe(false);
  });

  it("rejects number starting with +0", () => {
    expect(isValidE164("+04155551234")).toBe(false);
  });

  it("rejects too-short number", () => {
    expect(isValidE164("+123")).toBe(false);
  });

  it("rejects number with letters", () => {
    expect(isValidE164("+1415abc1234")).toBe(false);
  });

  it("rejects number with spaces", () => {
    expect(isValidE164("+1 415 555 1234")).toBe(false);
  });

  it("rejects number with dashes", () => {
    expect(isValidE164("+1-415-555-1234")).toBe(false);
  });

  it("rejects a numeric type (not a string)", () => {
    expect(isValidE164(14155551234)).toBe(false);
  });

  it("rejects just a plus sign", () => {
    expect(isValidE164("+")).toBe(false);
  });

  it("rejects number exceeding 15 digits", () => {
    expect(isValidE164("+1234567890123456")).toBe(false);
  });
});

// ── isValidParticipantName ───────────────────────────────────────────────────

describe("isValidParticipantName", () => {
  it("accepts a normal first name", () => {
    expect(isValidParticipantName("Sarah")).toBe(true);
  });

  it("accepts a hyphenated name", () => {
    expect(isValidParticipantName("Mary-Jane")).toBe(true);
  });

  it("accepts a name with apostrophe", () => {
    expect(isValidParticipantName("O'Brien")).toBe(true);
  });

  it("rejects undefined", () => {
    expect(isValidParticipantName(undefined)).toBe(false);
  });

  it("rejects null", () => {
    expect(isValidParticipantName(null)).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidParticipantName("")).toBe(false);
  });

  it("rejects single character", () => {
    expect(isValidParticipantName("A")).toBe(false);
  });

  it("rejects whitespace-only string", () => {
    expect(isValidParticipantName("  ")).toBe(false);
  });

  it("rejects all-digit string", () => {
    expect(isValidParticipantName("12345")).toBe(false);
  });

  it("rejects common relationship words", () => {
    const words = [
      "son", "daughter", "mom", "dad", "mother", "father",
      "brother", "sister", "wife", "husband", "kid", "child",
      "parent", "roommate", "cousin", "uncle", "aunt",
      "friend", "buddy", "pal", "boss", "coworker", "colleague",
      "boyfriend", "girlfriend", "partner", "spouse",
    ];
    for (const word of words) {
      expect(isValidParticipantName(word)).toBe(false);
    }
  });

  it("is case-insensitive for relationship words", () => {
    expect(isValidParticipantName("Son")).toBe(false);
    expect(isValidParticipantName("ROOMMATE")).toBe(false);
    expect(isValidParticipantName("Dad")).toBe(false);
  });

  it("rejects a number type (not a string)", () => {
    expect(isValidParticipantName(42)).toBe(false);
  });

  it("accepts 'Participant' as valid string (validation of placeholder happens elsewhere)", () => {
    expect(isValidParticipantName("Participant")).toBe(true);
  });
});

// ── userMessageSupportsAddParticipant ────────────────────────────────────────

describe("userMessageSupportsAddParticipant", () => {
  it("returns true when message contains a 10-digit phone", () => {
    expect(userMessageSupportsAddParticipant("his number is 4155551234")).toBe(true);
  });

  it("returns true when message contains a formatted phone", () => {
    expect(userMessageSupportsAddParticipant("call (415) 555-1234")).toBe(true);
  });

  it("returns true when message contains +1 prefix phone", () => {
    expect(userMessageSupportsAddParticipant("text +14155551234")).toBe(true);
  });

  it("returns true when message contains 'add'", () => {
    expect(userMessageSupportsAddParticipant("add my friend")).toBe(true);
  });

  it("returns true when message contains 'invite'", () => {
    expect(userMessageSupportsAddParticipant("invite Sarah")).toBe(true);
  });

  it("returns true when message contains 'include'", () => {
    expect(userMessageSupportsAddParticipant("include them in the group")).toBe(true);
  });

  it("returns true when message contains 'join'", () => {
    expect(userMessageSupportsAddParticipant("have them join")).toBe(true);
  });

  it("returns true when message contains 'group'", () => {
    expect(userMessageSupportsAddParticipant("create a group text with him")).toBe(true);
  });

  it("returns true when message contains 'text'", () => {
    expect(userMessageSupportsAddParticipant("text him too")).toBe(true);
  });

  it("returns true when message contains 'contact'", () => {
    expect(userMessageSupportsAddParticipant("contact my son")).toBe(true);
  });

  it("returns false for a simple greeting", () => {
    expect(userMessageSupportsAddParticipant("gig")).toBe(false);
  });

  it("returns false for a question about bills", () => {
    expect(userMessageSupportsAddParticipant("what are the bills this month?")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(userMessageSupportsAddParticipant("")).toBe(false);
  });

  it("returns false for status-like messages", () => {
    expect(userMessageSupportsAddParticipant("done")).toBe(false);
  });

  it("returns false for short unrelated messages", () => {
    expect(userMessageSupportsAddParticipant("ok")).toBe(false);
  });
});

// ── validateAddParticipant ───────────────────────────────────────────────────

describe("validateAddParticipant", () => {
  const validAction: GigAction = {
    type: "add_participant",
    name: "Sarah",
    phone: "+14155551234",
  };

  it("passes with valid name, valid phone, and relevant message", () => {
    expect(validateAddParticipant(validAction, "add Sarah 4155551234")).toBe(true);
  });

  it("passes when message mentions adding and has a phone number", () => {
    expect(validateAddParticipant(validAction, "invite her, number is +14155551234")).toBe(true);
  });

  it("fails when phone is invalid", () => {
    const bad: GigAction = { type: "add_participant", name: "Sarah", phone: "not-a-phone" };
    expect(validateAddParticipant(bad, "add Sarah")).toBe(false);
  });

  it("fails when phone is missing", () => {
    const bad: GigAction = { type: "add_participant", name: "Sarah" };
    expect(validateAddParticipant(bad, "add Sarah 4155551234")).toBe(false);
  });

  it("fails when name is a relationship word", () => {
    const bad: GigAction = { type: "add_participant", name: "son", phone: "+14155551234" };
    expect(validateAddParticipant(bad, "add my son 4155551234")).toBe(false);
  });

  it("fails when user message has no add intent or phone (hallucination)", () => {
    expect(validateAddParticipant(validAction, "gig")).toBe(false);
  });

  it("fails when user message is about something else entirely", () => {
    expect(validateAddParticipant(validAction, "what's the power bill this month")).toBe(false);
  });

  it("fails when user message is a simple greeting", () => {
    expect(validateAddParticipant(validAction, "hello")).toBe(false);
  });

  it("passes when user says 'add' even without a phone in the message", () => {
    expect(validateAddParticipant(validAction, "add Sarah to the gig")).toBe(true);
  });
});

// ── validateAction (dispatcher) ──────────────────────────────────────────────

describe("validateAction", () => {
  it("validates add_participant strictly", () => {
    const action: GigAction = { type: "add_participant", name: "Sarah", phone: "+14155551234" };
    expect(validateAction(action, "add Sarah +14155551234")).toBe(true);
    expect(validateAction(action, "gig")).toBe(false);
  });

  it("validates set_reminder: passes with scheduledAt", () => {
    const action: GigAction = { type: "set_reminder", scheduledAt: "2026-05-01T09:00:00Z", reminderMessage: "test" };
    expect(validateAction(action, "set a reminder")).toBe(true);
  });

  it("validates set_reminder: fails with empty scheduledAt", () => {
    const action: GigAction = { type: "set_reminder", scheduledAt: "", reminderMessage: "test" };
    expect(validateAction(action, "set a reminder")).toBe(false);
  });

  it("validates set_reminder: fails with undefined scheduledAt", () => {
    const action: GigAction = { type: "set_reminder", reminderMessage: "test" };
    expect(validateAction(action, "set a reminder")).toBe(false);
  });

  it("validates generate_image: passes with prompt", () => {
    const action: GigAction = { type: "generate_image", prompt: "a sunset" };
    expect(validateAction(action, "generate an image")).toBe(true);
  });

  it("validates generate_image: fails with empty prompt", () => {
    const action: GigAction = { type: "generate_image", prompt: "" };
    expect(validateAction(action, "generate an image")).toBe(false);
  });

  it("validates create_deliverable: passes with deliverableType", () => {
    const action: GigAction = { type: "create_deliverable", deliverableType: "pdf", title: "Report", content: "<p>hi</p>" };
    expect(validateAction(action, "create a report")).toBe(true);
  });

  it("validates create_deliverable: fails with empty deliverableType", () => {
    const action: GigAction = { type: "create_deliverable", deliverableType: "", title: "Report" };
    expect(validateAction(action, "create a report")).toBe(false);
  });

  it("passes through create_collage without strict checks", () => {
    const action: GigAction = { type: "create_collage", title: "Gallery" };
    expect(validateAction(action, "anything")).toBe(true);
  });

  it("passes through book_reservation without strict checks", () => {
    const action: GigAction = { type: "book_reservation", platform: "opentable" };
    expect(validateAction(action, "anything")).toBe(true);
  });

  it("passes through create_github_repo without strict checks", () => {
    const action: GigAction = { type: "create_github_repo", name: "repo" };
    expect(validateAction(action, "anything")).toBe(true);
  });

  it("passes through update_bill_status without strict checks", () => {
    const action: GigAction = { type: "update_bill_status", billType: "power", billStatus: "submitted" };
    expect(validateAction(action, "anything")).toBe(true);
  });
});

// ── validateActions (array filter) ───────────────────────────────────────────

describe("validateActions", () => {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  it("returns all actions when all are valid", () => {
    const actions: GigAction[] = [
      { type: "set_reminder", scheduledAt: "2026-05-01", reminderMessage: "test" },
      { type: "generate_image", prompt: "a cat" },
    ];
    const { valid, dropped } = validateActions(actions, "set a reminder and generate an image");
    expect(valid).toHaveLength(2);
    expect(dropped).toHaveLength(0);
  });

  it("filters out hallucinated add_participant from unrelated message", () => {
    const actions: GigAction[] = [
      { type: "add_participant", name: "Jonny", phone: "+14155551234" },
      { type: "set_reminder", scheduledAt: "2026-05-01", reminderMessage: "test" },
    ];
    const { valid, dropped } = validateActions(actions, "gig");
    expect(valid).toHaveLength(1);
    expect(valid[0].type).toBe("set_reminder");
    expect(dropped).toHaveLength(1);
    expect(dropped[0].type).toBe("add_participant");
  });

  it("keeps valid add_participant when message supports it", () => {
    const actions: GigAction[] = [
      { type: "add_participant", name: "Jonny", phone: "+14155551234" },
    ];
    const { valid, dropped } = validateActions(actions, "add Jonny 4155551234");
    expect(valid).toHaveLength(1);
    expect(dropped).toHaveLength(0);
  });

  it("drops all actions when all are invalid", () => {
    const actions: GigAction[] = [
      { type: "add_participant", name: "son", phone: "+14155551234" },
      { type: "set_reminder", scheduledAt: "", reminderMessage: "test" },
    ];
    const { valid, dropped } = validateActions(actions, "gig");
    expect(valid).toHaveLength(0);
    expect(dropped).toHaveLength(2);
  });

  it("handles empty actions array", () => {
    const { valid, dropped } = validateActions([], "anything");
    expect(valid).toHaveLength(0);
    expect(dropped).toHaveLength(0);
  });

  it("logs a warning when actions are dropped", () => {
    warnSpy.mockClear();
    const actions: GigAction[] = [
      { type: "add_participant", name: "Jonny", phone: "+14155551234" },
    ];
    validateActions(actions, "gig");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[ActionValidator] Dropped 1 hallucinated action(s)")
    );
  });

  it("does not log when no actions are dropped", () => {
    warnSpy.mockClear();
    const actions: GigAction[] = [
      { type: "generate_image", prompt: "a cat" },
    ];
    validateActions(actions, "generate a cat image");
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

// ── Integration: end-to-end hallucination scenario ───────────────────────────

describe("integration: hallucination filtering", () => {
  it("typical hallucination: user says 'gig', Gemini calls add_participant with stale data", () => {
    const hallucinatedAction: GigAction = {
      type: "add_participant",
      name: "Jonny",
      phone: "+14154049816",
    };
    const { valid, dropped } = validateActions([hallucinatedAction], "gig");
    expect(valid).toHaveLength(0);
    expect(dropped).toHaveLength(1);
  });

  it("legitimate add: user provides name and number", () => {
    const realAction: GigAction = {
      type: "add_participant",
      name: "Jonny",
      phone: "+14154049816",
    };
    const { valid, dropped } = validateActions([realAction], "add Jonny 4154049816");
    expect(valid).toHaveLength(1);
    expect(dropped).toHaveLength(0);
  });

  it("mixed: hallucinated add + valid reminder stays as reminder only", () => {
    const actions: GigAction[] = [
      { type: "add_participant", name: "Jonny", phone: "+14154049816" },
      { type: "set_reminder", scheduledAt: "2026-05-30T09:00:00Z", reminderMessage: "Pay power bill" },
    ];
    const { valid } = validateActions(actions, "remind me to pay the power bill on the 30th");
    expect(valid).toHaveLength(1);
    expect(valid[0].type).toBe("set_reminder");
  });

  it("add_participant with undefined phone never makes it through", () => {
    const action: GigAction = { type: "add_participant", name: "Jonny", phone: undefined };
    const { valid } = validateActions([action], "add Jonny to the group");
    expect(valid).toHaveLength(0);
  });

  it("add_participant with garbage phone never makes it through", () => {
    const action: GigAction = { type: "add_participant", name: "Jonny", phone: "Jonny" };
    const { valid } = validateActions([action], "add Jonny to the group");
    expect(valid).toHaveLength(0);
  });
});
