import { describe, expect, it } from "vitest";
import {
  buildDirectPrompt,
  buildGroupPrompt,
  buildParticipantActionHint,
  GIG_TYPE_PROMPTS,
  TOOL_USE_GUIDANCE,
  GIGLER_FUNCTION_DECLARATIONS,
  type Gig,
} from "../prompts";

const makeGig = (overrides: Partial<Gig> = {}): Gig => ({
  id: "gig_test",
  ownerId: "usr_test",
  title: "Test Gig",
  type: "planning",
  status: "active",
  ...overrides,
});

describe("GIG_TYPE_PROMPTS", () => {
  it("has all expected gig types", () => {
    const expected = ["planning", "coding", "business_formation", "creative", "professional", "scheduling", "lifestyle", "education", "reservations", "household"];
    for (const type of expected) {
      expect(GIG_TYPE_PROMPTS[type]).toBeDefined();
    }
  });

  it("each prompt is a non-empty string", () => {
    for (const [type, prompt] of Object.entries(GIG_TYPE_PROMPTS)) {
      expect(typeof prompt).toBe("string");
      expect(prompt.length).toBeGreaterThan(50);
    }
  });

  it("household prompt mentions update_bill_status", () => {
    expect(GIG_TYPE_PROMPTS.household).toContain("update_bill_status");
  });

  it("household prompt mentions create_deliverable", () => {
    expect(GIG_TYPE_PROMPTS.household).toContain("create_deliverable");
  });
});

describe("TOOL_USE_GUIDANCE", () => {
  it("is a non-empty string", () => {
    expect(typeof TOOL_USE_GUIDANCE).toBe("string");
    expect(TOOL_USE_GUIDANCE.length).toBeGreaterThan(50);
  });

  it("mentions create_collage", () => {
    expect(TOOL_USE_GUIDANCE).toContain("create_collage");
  });
});

describe("GIGLER_FUNCTION_DECLARATIONS", () => {
  it("has 8 function declarations", () => {
    expect(GIGLER_FUNCTION_DECLARATIONS).toHaveLength(8);
  });

  it("has all expected function names", () => {
    const names = GIGLER_FUNCTION_DECLARATIONS.map(d => d.name);
    expect(names).toEqual([
      "add_participant", "set_reminder", "generate_image",
      "create_deliverable", "book_reservation", "create_github_repo",
      "create_collage", "update_bill_status",
    ]);
  });

  it("each declaration has name, description, and parameters", () => {
    for (const decl of GIGLER_FUNCTION_DECLARATIONS) {
      expect(decl.name).toBeTruthy();
      expect(decl.description).toBeTruthy();
      expect(decl.parameters).toBeDefined();
      expect(decl.parameters.type).toBe("OBJECT");
      expect(decl.parameters.required).toBeDefined();
      expect(Array.isArray(decl.parameters.required)).toBe(true);
    }
  });

  it("add_participant warns about relationship words in its description", () => {
    const decl = GIGLER_FUNCTION_DECLARATIONS.find(d => d.name === "add_participant");
    expect(decl?.description).toContain("relationship");
  });
});

describe("buildDirectPrompt", () => {
  it("includes gig title", () => {
    const prompt = buildDirectPrompt(makeGig({ title: "Birthday Party" }), {}, "Alice");
    expect(prompt).toContain("Birthday Party");
  });

  it("includes owner name in 1-on-1 context", () => {
    const prompt = buildDirectPrompt(makeGig(), {}, "Alice");
    expect(prompt).toContain("PRIVATE 1-on-1 SMS conversation with Alice");
  });

  it("includes the type-specific prompt for the gig type", () => {
    const prompt = buildDirectPrompt(makeGig({ type: "coding" }), {}, "Bob");
    expect(prompt).toContain("coding/tech gig");
  });

  it("falls back to planning type for unknown gig types", () => {
    const prompt = buildDirectPrompt(makeGig({ type: "nonexistent" }), {}, "Bob");
    expect(prompt).toContain("event planning gig");
  });

  it("uses custom prompt for custom gig type", () => {
    const gig = makeGig({ type: "custom" });
    const metadata = { customPrompt: "You are a custom AI helper." };
    const prompt = buildDirectPrompt(gig, metadata, "Bob");
    expect(prompt).toContain("You are a custom AI helper.");
    expect(prompt).not.toContain("event planning gig");
  });

  it("includes metadata JSON", () => {
    const metadata = { bills: ["power", "water"] };
    const prompt = buildDirectPrompt(makeGig(), metadata, "Bob");
    expect(prompt).toContain('"bills"');
    expect(prompt).toContain("power");
  });

  it("includes PARTICIPANT PRIORITY RULE", () => {
    const prompt = buildDirectPrompt(makeGig(), {}, "Bob");
    expect(prompt).toContain("PARTICIPANT PRIORITY RULE");
  });

  it("includes TOOL_USE_GUIDANCE", () => {
    const prompt = buildDirectPrompt(makeGig(), {}, "Bob");
    expect(prompt).toContain("tools available for taking actions");
  });

  it("instructs not to address absent people", () => {
    const prompt = buildDirectPrompt(makeGig(), {}, "Bob");
    expect(prompt).toContain("Do NOT address other people");
  });
});

describe("buildGroupPrompt", () => {
  const participants = [
    { name: "Alice", role: "owner", phone: "+1111" },
    { name: "Bob", role: "collaborator", phone: "+2222" },
  ];

  it("includes gig title", () => {
    const prompt = buildGroupPrompt(makeGig({ title: "Household Bills" }), {}, participants, "Bob", "+2222");
    expect(prompt).toContain("Household Bills");
  });

  it("marks the sender in the roster", () => {
    const prompt = buildGroupPrompt(makeGig(), {}, participants, "Bob", "+2222");
    expect(prompt).toContain("Bob (collaborator) [sender of this message]");
    expect(prompt).not.toContain("Alice (owner) [sender of this message]");
  });

  it("includes the sender info", () => {
    const prompt = buildGroupPrompt(makeGig(), {}, participants, "Bob", "+2222");
    expect(prompt).toContain("The latest message was sent by: Bob (+2222)");
  });

  it("includes RESPOND format instructions", () => {
    const prompt = buildGroupPrompt(makeGig(), {}, participants, "Bob", "+2222");
    expect(prompt).toContain("RESPOND: true");
    expect(prompt).toContain("RESPOND: false");
  });

  it("includes setup context when provided", () => {
    const prompt = buildGroupPrompt(makeGig(), {}, participants, "Bob", "+2222", "Bills: power, water. Reminders set for 30th.");
    expect(prompt).toContain("PRIOR 1-ON-1 SETUP CONTEXT");
    expect(prompt).toContain("Bills: power, water");
  });

  it("omits setup section when no context provided", () => {
    const prompt = buildGroupPrompt(makeGig(), {}, participants, "Bob", "+2222");
    expect(prompt).not.toContain("PRIOR 1-ON-1 SETUP CONTEXT");
  });

  it("includes critical rules about silence", () => {
    const prompt = buildGroupPrompt(makeGig(), {}, participants, "Bob", "+2222");
    expect(prompt).toContain("STAY SILENT when humans are talking");
  });

  it("includes image analysis response rule", () => {
    const prompt = buildGroupPrompt(makeGig(), {}, participants, "Bob", "+2222");
    expect(prompt).toContain("image analysis data");
  });

  it("includes duplicate action prevention rule", () => {
    const prompt = buildGroupPrompt(makeGig(), {}, participants, "Bob", "+2222");
    expect(prompt).toContain("Do NOT re-create reminders");
  });

  it("uses correct type prompt for household gig", () => {
    const prompt = buildGroupPrompt(makeGig({ type: "household" }), {}, participants, "Bob", "+2222");
    expect(prompt).toContain("household bills/expenses gig");
  });
});

describe("buildParticipantActionHint", () => {
  it("returns bill hint for household gig type", () => {
    const hint = buildParticipantActionHint("household", "some desc", "Guido");
    expect(hint).toContain("bills");
  });

  it("returns bill hint when description mentions 'bill'", () => {
    const hint = buildParticipantActionHint("general", "track monthly bills", "Guido");
    expect(hint).toContain("bills");
  });

  it("returns planning hint for planning gig", () => {
    const hint = buildParticipantActionHint("planning", "birthday party", "Sarah");
    expect(hint).toContain("coordinated");
  });

  it("returns planning hint for description with 'party'", () => {
    const hint = buildParticipantActionHint("general", "birthday party", "Sarah");
    expect(hint).toContain("coordinated");
  });

  it("returns creative hint for creative gig", () => {
    const hint = buildParticipantActionHint("creative", "photo project", "Kim");
    expect(hint).toContain("photos");
  });

  it("returns coding hint for coding gig", () => {
    const hint = buildParticipantActionHint("coding", "build app", "Dev");
    expect(hint).toContain("project");
  });

  it("returns scheduling hint for scheduling gig", () => {
    const hint = buildParticipantActionHint("scheduling", "weekly reminders", "Pat");
    expect(hint).toContain("reminders");
  });

  it("returns education hint for education gig", () => {
    const hint = buildParticipantActionHint("education", "study plan", "Sam");
    expect(hint).toContain("study");
  });

  it("returns generic hint for unknown gig type", () => {
    const hint = buildParticipantActionHint("unknown", "something", "Someone");
    expect(hint).toContain("organized");
  });

  it("description keyword takes precedence over unknown gig type", () => {
    const hint = buildParticipantActionHint("unknown", "track utility bills", "Someone");
    expect(hint).toContain("bills");
  });
});
