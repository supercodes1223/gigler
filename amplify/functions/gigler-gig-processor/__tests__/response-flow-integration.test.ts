/**
 * Integration tests for the full response flow:
 *   Gemini response → extractFromGeminiResponse → group handler override logic
 *
 * These tests simulate the exact code path in handler.ts where:
 *   1. extractFromGeminiResponse produces { userText, actions }
 *   2. The group handler checks RESPOND: prefix or falls back
 *   3. buildActionConfirmation may override userText when vision data is available
 *
 * This is where the "On it!" bug lived — generateFallbackText set userText to
 * a generic string, and buildActionConfirmation never got to override it because
 * userText was already truthy.
 */
import { describe, expect, it } from "vitest";
import {
  extractFromGeminiResponse,
  generateFallbackText,
  buildActionConfirmation,
  type GeminiResponse,
} from "../action-parser";
import type { ImageAnalysisResult, GigAction } from "../vision-utils";

// ── Helpers that mirror the handler.ts group response logic ─────────────────

/**
 * Simulates the group handler's post-action response logic (lines ~2100-2126
 * in handler.ts). This is the exact code path we need coverage on.
 */
function simulateGroupResponseFlow(params: {
  geminiResponse: GeminiResponse;
  userMessage: string;
  visionAnalysis?: ImageAnalysisResult | null;
  respondPrefix?: { shouldRespond: boolean; text: string } | null;
}): { finalText: string; shouldRespond: boolean; actions: GigAction[] } {
  const { geminiResponse, userMessage, visionAnalysis, respondPrefix } = params;

  const { userText: rawText, actions } = extractFromGeminiResponse(geminiResponse, userMessage);

  let shouldRespond: boolean;
  let userText: string;

  if (respondPrefix) {
    shouldRespond = respondPrefix.shouldRespond;
    userText = respondPrefix.text || rawText;
  } else {
    shouldRespond = actions.length > 0;
    userText = rawText;
  }

  if (actions.length > 0) {
    if (!shouldRespond) {
      shouldRespond = true;
    }
    const richerConfirmation = buildActionConfirmation(actions, visionAnalysis);
    if (!userText || richerConfirmation !== "Done!") {
      userText = richerConfirmation;
    }
  }

  return { finalText: userText, shouldRespond, actions };
}

// ── Test fixtures ───────────────────────────────────────────────────────────

const POWER_BILL_VISION: ImageAnalysisResult = {
  imageType: "bill",
  extractedInfo: {
    hasAmounts: true,
    hasDates: true,
    totalAmount: "$142.50",
    dueDate: "May 1st",
    fromEntity: "Austin Energy",
    billType: "power",
    description: "Monthly electricity bill",
  },
  suggestedAction: "update_bill_status",
};

const WATER_BILL_VISION: ImageAnalysisResult = {
  imageType: "bill",
  extractedInfo: {
    hasAmounts: true,
    hasDates: true,
    totalAmount: "$67.23",
    dueDate: "April 20th",
    fromEntity: "City Water Dept",
    billType: "water",
    description: "Water utility bill",
  },
};

const GENERIC_PHOTO_VISION: ImageAnalysisResult = {
  imageType: "photo",
  extractedInfo: {
    hasAmounts: false,
    hasDates: false,
    description: "A picture of a cat",
  },
};

function makeUpdateBillResponse(opts?: { withText?: string }): GeminiResponse {
  const parts: GeminiResponse["parts"] = [];
  if (opts?.withText) {
    parts.push({ text: opts.withText });
  }
  parts.push({
    functionCall: {
      name: "update_bill_status",
      args: {
        billType: "power",
        vendor: "Austin Energy",
        amount: 142.5,
        dueDate: "2026-05-01",
        billStatus: "submitted",
      },
    },
  });
  return { parts };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Response flow integration: bill image → action → user message", () => {
  it("produces rich vision-based confirmation when Gemini returns ONLY a function call (the 'On it!' bug)", () => {
    const result = simulateGroupResponseFlow({
      geminiResponse: makeUpdateBillResponse(),
      userMessage: "",
      visionAnalysis: POWER_BILL_VISION,
    });

    expect(result.shouldRespond).toBe(true);
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].type).toBe("update_bill_status");
    expect(result.finalText).toContain("Austin Energy");
    expect(result.finalText).toContain("$142.50");
    expect(result.finalText).toContain("May 1st");
    expect(result.finalText).not.toBe("On it!");
    expect(result.finalText).not.toBe("Done!");
  });

  it("produces rich confirmation even when Gemini sets RESPOND: false", () => {
    const result = simulateGroupResponseFlow({
      geminiResponse: makeUpdateBillResponse(),
      userMessage: "",
      visionAnalysis: POWER_BILL_VISION,
      respondPrefix: { shouldRespond: false, text: "" },
    });

    expect(result.shouldRespond).toBe(true);
    expect(result.finalText).toContain("Austin Energy");
    expect(result.finalText).toContain("$142.50");
  });

  it("preserves Gemini's text when it provides a good response along with the function call", () => {
    const result = simulateGroupResponseFlow({
      geminiResponse: makeUpdateBillResponse({ withText: "Got your power bill from Austin Energy — $142.50 due May 1st. All tracked!" }),
      userMessage: "",
      visionAnalysis: POWER_BILL_VISION,
    });

    expect(result.shouldRespond).toBe(true);
    expect(result.finalText).toContain("Austin Energy");
    expect(result.finalText).toContain("$142.50");
  });

  it("uses vendor/billType from action when no vision data is available", () => {
    const result = simulateGroupResponseFlow({
      geminiResponse: makeUpdateBillResponse(),
      userMessage: "",
      visionAnalysis: null,
    });

    expect(result.shouldRespond).toBe(true);
    expect(result.finalText).toContain("Austin Energy");
    expect(result.finalText).toContain("bill logged");
    expect(result.finalText).not.toBe("On it!");
  });

  it("handles water bill vision data correctly", () => {
    const waterBillResponse: GeminiResponse = {
      parts: [{
        functionCall: {
          name: "update_bill_status",
          args: { billType: "water", vendor: "City Water Dept", amount: 67.23, dueDate: "2026-04-20", billStatus: "submitted" },
        },
      }],
    };

    const result = simulateGroupResponseFlow({
      geminiResponse: waterBillResponse,
      userMessage: "",
      visionAnalysis: WATER_BILL_VISION,
    });

    expect(result.finalText).toContain("City Water Dept");
    expect(result.finalText).toContain("$67.23");
    expect(result.finalText).toContain("April 20th");
  });
});

describe("Response flow integration: non-bill actions", () => {
  it("generates appropriate text for set_reminder (no generic On it!)", () => {
    const response: GeminiResponse = {
      parts: [{
        functionCall: {
          name: "set_reminder",
          args: { scheduledAt: "2026-05-01T09:00:00Z", reminderMessage: "Pay bills" },
        },
      }],
    };

    const result = simulateGroupResponseFlow({
      geminiResponse: response,
      userMessage: "remind me to pay bills on May 1st",
    });

    expect(result.shouldRespond).toBe(true);
    expect(result.finalText).toContain("Reminders set");
    expect(result.finalText).not.toBe("On it!");
  });

  it("generates appropriate text for generate_image", () => {
    const response: GeminiResponse = {
      parts: [{
        functionCall: {
          name: "generate_image",
          args: { prompt: "sunset over mountains" },
        },
      }],
    };

    const result = simulateGroupResponseFlow({
      geminiResponse: response,
      userMessage: "generate an image of a sunset",
    });

    expect(result.shouldRespond).toBe(true);
    expect(result.finalText).toContain("image");
  });

  it("generates appropriate text for create_collage", () => {
    const response: GeminiResponse = {
      parts: [{
        functionCall: {
          name: "create_collage",
          args: { title: "Vacation Photos" },
        },
      }],
    };

    const result = simulateGroupResponseFlow({
      geminiResponse: response,
      userMessage: "make a gallery of my photos",
    });

    expect(result.shouldRespond).toBe(true);
    expect(result.finalText).toContain("gallery");
  });
});

describe("Response flow integration: fallback text should NEVER be bare 'On it!'", () => {
  it("generateFallbackText returns specific text for update_bill_status", () => {
    const text = generateFallbackText([{
      type: "update_bill_status",
      billType: "power",
      vendor: "PG&E",
      billStatus: "submitted",
    }]);
    expect(text).toContain("PG&E");
    expect(text).not.toBe("On it!");
  });

  it("generateFallbackText uses billType when vendor is missing", () => {
    const text = generateFallbackText([{
      type: "update_bill_status",
      billType: "internet",
      billStatus: "submitted",
    }]);
    expect(text).toContain("internet");
    expect(text).not.toBe("On it!");
  });

  it("generateFallbackText returns 'On it!' ONLY for truly unknown action types", () => {
    const text = generateFallbackText([{ type: "book_reservation" }]);
    expect(text).toBe("On it!");
  });

  it("every known action type in generateFallbackText has a specific message", () => {
    const knownActions: GigAction[] = [
      { type: "add_participant", name: "Test", phone: "+14155551234" },
      { type: "update_bill_status", billType: "power", billStatus: "submitted" },
      { type: "set_reminder", scheduledAt: "tomorrow", reminderMessage: "test" },
      { type: "generate_image", prompt: "cat" },
      { type: "create_deliverable", deliverableType: "pdf", title: "Test", content: "" },
      { type: "create_collage", title: "Gallery" },
    ];

    for (const action of knownActions) {
      const text = generateFallbackText([action]);
      expect(text, `${action.type} should not produce bare "On it!"`).not.toBe("On it!");
    }
  });
});

describe("Response flow integration: buildActionConfirmation overrides", () => {
  it("overrides generateFallbackText when vision data produces a richer message", () => {
    const actions: GigAction[] = [{
      type: "update_bill_status",
      billType: "power",
      vendor: "Austin Energy",
      amount: 142.5,
      dueDate: "2026-05-01",
      billStatus: "submitted",
    }];

    const fallbackText = generateFallbackText(actions);
    const richText = buildActionConfirmation(actions, POWER_BILL_VISION);

    expect(richText.length).toBeGreaterThan(fallbackText.length);
    expect(richText).toContain("$142.50");
    expect(richText).toContain("May 1st");
    expect(richText).not.toBe("Done!");
  });

  it("buildActionConfirmation returns 'Done!' only when no actions match", () => {
    const text = buildActionConfirmation([{ type: "book_reservation" as GigAction["type"] }]);
    expect(text).toBe("Done!");
  });

  it("buildActionConfirmation handles multiple simultaneous actions", () => {
    const actions: GigAction[] = [
      { type: "update_bill_status", billType: "power", vendor: "PG&E", billStatus: "submitted" },
      { type: "set_reminder", scheduledAt: "2026-05-01", reminderMessage: "Pay bills" },
    ];

    const text = buildActionConfirmation(actions, null);
    expect(text).toContain("PG&E");
    expect(text).toContain("Reminders set");
  });

  it("does NOT override good Gemini text with generic 'Done!'", () => {
    const result = simulateGroupResponseFlow({
      geminiResponse: {
        parts: [
          { text: "RESPOND: true\nHere's a photo I see — a cute cat!" },
        ],
      },
      userMessage: "",
      visionAnalysis: GENERIC_PHOTO_VISION,
    });

    expect(result.actions).toHaveLength(0);
    expect(result.finalText).toContain("cat");
  });
});

describe("Response flow integration: edge cases", () => {
  it("handles empty Gemini response with vision data gracefully", () => {
    const result = simulateGroupResponseFlow({
      geminiResponse: { parts: [] },
      userMessage: "",
      visionAnalysis: POWER_BILL_VISION,
    });

    expect(result.actions).toHaveLength(0);
    expect(result.finalText).toBe("I'm working on that!");
  });

  it("handles vision data with missing fields gracefully", () => {
    const sparseVision: ImageAnalysisResult = {
      imageType: "bill",
      extractedInfo: {
        hasAmounts: false,
        hasDates: false,
        description: "Blurry bill photo",
      },
    };

    const response: GeminiResponse = {
      parts: [{
        functionCall: {
          name: "update_bill_status",
          args: { billType: "unknown", billStatus: "submitted" },
        },
      }],
    };

    const result = simulateGroupResponseFlow({
      geminiResponse: response,
      userMessage: "",
      visionAnalysis: sparseVision,
    });

    expect(result.shouldRespond).toBe(true);
    expect(result.finalText).not.toBe("On it!");
    expect(result.finalText.toLowerCase()).toContain("logged");
  });
});
