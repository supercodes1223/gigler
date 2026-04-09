import { describe, expect, it } from "vitest";
import {
  extractFromGeminiResponse,
  generateFallbackText,
  mapFunctionCallToAction,
  type GeminiResponse,
} from "../action-parser";

describe("mapFunctionCallToAction", () => {
  it("maps add_participant with name and phone", () => {
    const action = mapFunctionCallToAction("add_participant", { name: "Sarah", phone: "+14155551234" });
    expect(action).toEqual({ type: "add_participant", name: "Sarah", phone: "+14155551234" });
  });

  it("replaces relationship words with 'Participant'", () => {
    for (const word of ["son", "daughter", "mom", "dad", "mother", "father", "brother", "sister", "wife", "husband", "kid", "child", "parent", "roommate"]) {
      const action = mapFunctionCallToAction("add_participant", { name: word, phone: "+1" });
      expect(action?.name).toBe("Participant");
    }
  });

  it("is case-insensitive for relationship words", () => {
    const action = mapFunctionCallToAction("add_participant", { name: "Son", phone: "+1" });
    expect(action?.name).toBe("Participant");
  });

  it("defaults name to 'Participant' when missing", () => {
    const action = mapFunctionCallToAction("add_participant", { phone: "+1" });
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
    const text = generateFallbackText([{ type: "add_participant", name: "Sarah", phone: "+1" }]);
    expect(text).toContain("Sarah");
  });

  it("uses 'them' when participant name is missing", () => {
    const text = generateFallbackText([{ type: "add_participant", phone: "+1" }]);
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

  it("returns generic 'On it!' for other action types", () => {
    const text = generateFallbackText([{ type: "book_reservation" }]);
    expect(text).toBe("On it!");
  });

  it("prioritizes add_participant over other actions", () => {
    const text = generateFallbackText([
      { type: "set_reminder", scheduledAt: "tomorrow", reminderMessage: "test" },
      { type: "add_participant", name: "Bob", phone: "+1" },
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
        { functionCall: { name: "add_participant", args: { name: "Sarah", phone: "+1" } } },
      ],
    };
    const { userText, actions } = extractFromGeminiResponse(response);
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
        { functionCall: { name: "add_participant", args: { name: "Alice", phone: "+1" } } },
      ],
    };
    const { actions } = extractFromGeminiResponse(response);
    expect(actions).toHaveLength(3);
    expect(actions.filter(a => a.type === "set_reminder")).toHaveLength(2);
    expect(actions.filter(a => a.type === "add_participant")).toHaveLength(1);
  });
});
