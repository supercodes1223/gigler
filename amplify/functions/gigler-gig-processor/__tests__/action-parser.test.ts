import { describe, expect, it } from "vitest";
import {
  extractFromGeminiResponse,
  generateFallbackText,
  buildActionConfirmation,
  mapFunctionCallToAction,
  type GeminiResponse,
} from "../action-parser";

describe("mapFunctionCallToAction", () => {
  it("maps add_participant with name and valid E.164 phone", () => {
    const action = mapFunctionCallToAction("add_participant", { name: "Sarah", phone: "+14155551234" });
    expect(action).toEqual({ type: "add_participant", name: "Sarah", phone: "+14155551234" });
  });

  it("returns null for add_participant with invalid phone", () => {
    const action = mapFunctionCallToAction("add_participant", { name: "Sarah", phone: "+1" });
    expect(action).toBeNull();
  });

  it("returns null for add_participant with missing phone", () => {
    const action = mapFunctionCallToAction("add_participant", { name: "Sarah" });
    expect(action).toBeNull();
  });

  it("returns null for add_participant with undefined phone", () => {
    const action = mapFunctionCallToAction("add_participant", { name: "Sarah", phone: undefined });
    expect(action).toBeNull();
  });

  it("returns null for add_participant with non-string phone", () => {
    const action = mapFunctionCallToAction("add_participant", { name: "Sarah", phone: 14155551234 });
    expect(action).toBeNull();
  });

  it("replaces relationship words with 'Participant'", () => {
    for (const word of ["son", "daughter", "mom", "dad", "mother", "father", "brother", "sister", "wife", "husband", "kid", "child", "parent", "roommate"]) {
      const action = mapFunctionCallToAction("add_participant", { name: word, phone: "+14155551234" });
      expect(action?.name).toBe("Participant");
    }
  });

  it("is case-insensitive for relationship words", () => {
    const action = mapFunctionCallToAction("add_participant", { name: "Son", phone: "+14155551234" });
    expect(action?.name).toBe("Participant");
  });

  it("defaults name to 'Participant' when missing", () => {
    const action = mapFunctionCallToAction("add_participant", { phone: "+14155551234" });
    expect(action?.name).toBe("Participant");
  });

  it("maps set_reminder with all fields", () => {
    const action = mapFunctionCallToAction("set_reminder", {
      scheduledAt: "2026-05-01T09:00:00Z",
      reminderMessage: "Send bills!",
      channel: "sms",
      recurrence: "monthly",
      recurrenceDay: 1,
    });
    expect(action).toEqual({
      type: "set_reminder",
      scheduledAt: "2026-05-01T09:00:00Z",
      reminderMessage: "Send bills!",
      channel: "sms",
      recurrence: "monthly",
      recurrenceDay: 1,
    });
  });

  it("defaults channel to sms for set_reminder", () => {
    const action = mapFunctionCallToAction("set_reminder", {
      scheduledAt: "2026-05-01",
      reminderMessage: "test",
    });
    expect(action?.channel).toBe("sms");
  });

  it("maps generate_image", () => {
    const action = mapFunctionCallToAction("generate_image", { prompt: "a cat" });
    expect(action).toEqual({ type: "generate_image", prompt: "a cat" });
  });

  it("maps create_deliverable", () => {
    const action = mapFunctionCallToAction("create_deliverable", {
      deliverableType: "webpage",
      title: "Dashboard",
      content: "<h1>hi</h1>",
    });
    expect(action).toEqual({
      type: "create_deliverable",
      deliverableType: "webpage",
      title: "Dashboard",
      content: "<h1>hi</h1>",
    });
  });

  it("maps book_reservation", () => {
    const action = mapFunctionCallToAction("book_reservation", {
      platform: "opentable",
      params: { restaurant: "Sushi Bar" },
    });
    expect(action).toEqual({
      type: "book_reservation",
      platform: "opentable",
      params: { restaurant: "Sushi Bar" },
    });
  });

  it("maps create_github_repo", () => {
    const action = mapFunctionCallToAction("create_github_repo", {
      name: "my-repo",
      description: "desc",
      files: [{ path: "README.md", content: "# Hi" }],
    });
    expect(action).toEqual({
      type: "create_github_repo",
      name: "my-repo",
      description: "desc",
      files: [{ path: "README.md", content: "# Hi" }],
    });
  });

  it("maps create_collage", () => {
    const action = mapFunctionCallToAction("create_collage", { title: "Gallery", content: "some content" });
    expect(action).toEqual({ type: "create_collage", title: "Gallery", content: "some content" });
  });

  it("maps update_bill_status", () => {
    const action = mapFunctionCallToAction("update_bill_status", {
      billType: "power",
      vendor: "PG&E",
      amount: 142.5,
      dueDate: "2026-05-01",
      billingPeriod: "April 2026",
      billStatus: "submitted",
    });
    expect(action).toEqual({
      type: "update_bill_status",
      billType: "power",
      vendor: "PG&E",
      amount: 142.5,
      dueDate: "2026-05-01",
      billingPeriod: "April 2026",
      billStatus: "submitted",
    });
  });

  it("returns null for unknown function name", () => {
    const action = mapFunctionCallToAction("unknown_action", {});
    expect(action).toBeNull();
  });
});

describe("generateFallbackText", () => {
  it("mentions participant name for add_participant", () => {
    const text = generateFallbackText([{ type: "add_participant", name: "Sarah", phone: "+14155551234" }]);
    expect(text).toContain("Sarah");
  });

  it("uses 'them' when participant name is missing", () => {
    const text = generateFallbackText([{ type: "add_participant", phone: "+14155551234" }]);
    expect(text).toContain("them");
  });

  it("returns reminder text for set_reminder", () => {
    const text = generateFallbackText([{ type: "set_reminder", scheduledAt: "tomorrow", reminderMessage: "test" }]);
    expect(text).toContain("reminders");
  });

  it("returns image text for generate_image", () => {
    const text = generateFallbackText([{ type: "generate_image", prompt: "cat" }]);
    expect(text).toContain("image");
  });

  it("returns deliverable text for create_deliverable", () => {
    const text = generateFallbackText([{ type: "create_deliverable", deliverableType: "pdf" }]);
    expect(text).toContain("Creating");
  });

  it("returns collage text for create_collage", () => {
    const text = generateFallbackText([{ type: "create_collage", title: "Gallery" }]);
    expect(text).toContain("gallery");
  });

  it("returns bill-specific text for update_bill_status with vendor", () => {
    const text = generateFallbackText([{ type: "update_bill_status", billType: "power", vendor: "PG&E", billStatus: "submitted" }]);
    expect(text).toContain("PG&E");
    expect(text).not.toBe("On it!");
  });

  it("returns bill-specific text for update_bill_status without vendor", () => {
    const text = generateFallbackText([{ type: "update_bill_status", billType: "water", billStatus: "submitted" }]);
    expect(text).toContain("water");
    expect(text).not.toBe("On it!");
  });

  it("returns generic 'On it!' for other action types", () => {
    const text = generateFallbackText([{ type: "book_reservation" }]);
    expect(text).toBe("On it!");
  });

  it("prioritizes add_participant over other actions", () => {
    const text = generateFallbackText([
      { type: "set_reminder", scheduledAt: "tomorrow", reminderMessage: "test" },
      { type: "add_participant", name: "Bob", phone: "+14155551234" },
    ]);
    expect(text).toContain("Bob");
  });
});

describe("extractFromGeminiResponse", () => {
  it("extracts text from text parts", () => {
    const response: GeminiResponse = {
      parts: [{ text: "Hello there!" }],
    };
    const { userText, actions } = extractFromGeminiResponse(response);
    expect(userText).toBe("Hello there!");
    expect(actions).toHaveLength(0);
  });

  it("concatenates multiple text parts", () => {
    const response: GeminiResponse = {
      parts: [{ text: "Hello " }, { text: "world!" }],
    };
    const { userText } = extractFromGeminiResponse(response);
    expect(userText).toBe("Hello world!");
  });

  it("extracts actions from functionCall parts", () => {
    const response: GeminiResponse = {
      parts: [{
        functionCall: {
          name: "set_reminder",
          args: { scheduledAt: "2026-05-01", reminderMessage: "test" },
        },
      }],
    };
    const { actions } = extractFromGeminiResponse(response);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("set_reminder");
  });

  it("handles mixed text and function call parts", () => {
    const response: GeminiResponse = {
      parts: [
        { text: "I'll add them now!" },
        { functionCall: { name: "add_participant", args: { name: "Sarah", phone: "+14155551234" } } },
      ],
    };
    const { userText, actions } = extractFromGeminiResponse(response, "add Sarah 4155551234");
    expect(userText).toBe("I'll add them now!");
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("add_participant");
  });

  it("uses fallback text when no text but has actions", () => {
    const response: GeminiResponse = {
      parts: [{
        functionCall: { name: "generate_image", args: { prompt: "cat" } },
      }],
    };
    const { userText } = extractFromGeminiResponse(response);
    expect(userText).toContain("image");
  });

  it("uses generic fallback when no text and no actions", () => {
    const response: GeminiResponse = { parts: [] };
    const { userText } = extractFromGeminiResponse(response);
    expect(userText).toBe("I'm working on that!");
  });

  it("skips unknown function calls without crashing", () => {
    const response: GeminiResponse = {
      parts: [
        { text: "Some text" },
        { functionCall: { name: "unknown_thing", args: {} } },
      ],
    };
    const { userText, actions } = extractFromGeminiResponse(response);
    expect(userText).toBe("Some text");
    expect(actions).toHaveLength(0);
  });

  it("handles multiple function calls", () => {
    const response: GeminiResponse = {
      parts: [
        { functionCall: { name: "set_reminder", args: { scheduledAt: "d1", reminderMessage: "m1" } } },
        { functionCall: { name: "set_reminder", args: { scheduledAt: "d2", reminderMessage: "m2" } } },
        { functionCall: { name: "add_participant", args: { name: "Alice", phone: "+14155551234" } } },
      ],
    };
    const { actions } = extractFromGeminiResponse(response, "add Alice 4155551234 and set two reminders");
    expect(actions).toHaveLength(3);
    expect(actions.filter(a => a.type === "set_reminder")).toHaveLength(2);
    expect(actions.filter(a => a.type === "add_participant")).toHaveLength(1);
  });

  it("filters hallucinated add_participant when userMessage is unrelated", () => {
    const response: GeminiResponse = {
      parts: [
        { text: "On it! Adding Jonny to the group now." },
        { functionCall: { name: "add_participant", args: { name: "Jonny", phone: "+14154049816" } } },
      ],
    };
    const { userText, actions } = extractFromGeminiResponse(response, "gig");
    expect(userText).toBe("On it! Adding Jonny to the group now.");
    expect(actions).toHaveLength(0);
  });

  it("keeps add_participant when userMessage explicitly mentions adding", () => {
    const response: GeminiResponse = {
      parts: [
        { functionCall: { name: "add_participant", args: { name: "Jonny", phone: "+14154049816" } } },
      ],
    };
    const { actions } = extractFromGeminiResponse(response, "add Jonny 4154049816");
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("add_participant");
  });

  it("drops add_participant with invalid phone at mapFunctionCallToAction level", () => {
    const response: GeminiResponse = {
      parts: [
        { functionCall: { name: "add_participant", args: { name: "Jonny", phone: "Jonny" } } },
      ],
    };
    const { actions } = extractFromGeminiResponse(response, "add Jonny");
    expect(actions).toHaveLength(0);
  });

  it("falls back to 'I'm working on that!' when hallucinated action is only action and no text", () => {
    const response: GeminiResponse = {
      parts: [
        { functionCall: { name: "add_participant", args: { name: "Jonny", phone: "+14154049816" } } },
      ],
    };
    const { userText, actions } = extractFromGeminiResponse(response, "what's the status?");
    expect(actions).toHaveLength(0);
    expect(userText).toBe("I'm working on that!");
  });

  it("uses bill-specific fallback (not On it!) when Gemini returns only update_bill_status function call", () => {
    const response: GeminiResponse = {
      parts: [{
        functionCall: {
          name: "update_bill_status",
          args: { billType: "power", vendor: "PG&E", billStatus: "submitted" },
        },
      }],
    };
    const { userText, actions } = extractFromGeminiResponse(response);
    expect(actions).toHaveLength(1);
    expect(userText).toContain("PG&E");
    expect(userText).not.toBe("On it!");
  });
});

describe("buildActionConfirmation", () => {
  it("includes vision data (vendor, amount, due date) for update_bill_status", () => {
    const actions = [{ type: "update_bill_status" as const, billType: "power", vendor: "Austin Energy", amount: 142.5, billStatus: "submitted" }];
    const vision = {
      imageType: "bill" as const,
      extractedInfo: {
        hasAmounts: true, hasDates: true,
        totalAmount: "$142.50", dueDate: "May 1st", fromEntity: "Austin Energy", billType: "power", description: "Power bill",
      },
    };
    const text = buildActionConfirmation(actions, vision);
    expect(text).toContain("Austin Energy");
    expect(text).toContain("$142.50");
    expect(text).toContain("May 1st");
    expect(text).toContain("Logged!");
  });

  it("falls back to vendor from action when no vision data", () => {
    const actions = [{ type: "update_bill_status" as const, billType: "gas", vendor: "SoCalGas", billStatus: "submitted" }];
    const text = buildActionConfirmation(actions, null);
    expect(text).toContain("SoCalGas");
    expect(text).toContain("bill logged");
  });

  it("returns 'Done!' for unknown action types", () => {
    const text = buildActionConfirmation([{ type: "book_reservation" as const }]);
    expect(text).toBe("Done!");
  });

  it("combines multiple action confirmations", () => {
    const actions = [
      { type: "update_bill_status" as const, billType: "power", vendor: "PG&E", billStatus: "submitted" },
      { type: "set_reminder" as const, scheduledAt: "tomorrow", reminderMessage: "test" },
    ];
    const text = buildActionConfirmation(actions);
    expect(text).toContain("PG&E");
    expect(text).toContain("Reminders set");
  });
});
