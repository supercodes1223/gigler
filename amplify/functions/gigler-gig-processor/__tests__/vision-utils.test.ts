import { describe, expect, it } from "vitest";
import {
  formatVisionResultForPrompt,
  actionsFromVisionResult,
  type ImageAnalysisResult,
  type GigAction,
} from "../vision-utils";

const baseBillResult: ImageAnalysisResult = {
  imageType: "bill",
  extractedInfo: {
    hasAmounts: true,
    hasDates: true,
    totalAmount: "$142.50",
    dueDate: "May 1, 2026",
    fromEntity: "City Power Co",
    billType: "power",
    description: "Monthly power bill",
  },
  suggestedAction: "Log power bill of $142.50 due May 1",
};

const photoResult: ImageAnalysisResult = {
  imageType: "photo",
  extractedInfo: {
    hasAmounts: false,
    hasDates: false,
    description: "A landscape photo",
  },
};

describe("formatVisionResultForPrompt", () => {
  it("includes all available fields for a bill", () => {
    const text = formatVisionResultForPrompt(baseBillResult);
    expect(text).toContain("Image type: bill");
    expect(text).toContain("Description: Monthly power bill");
    expect(text).toContain("From: City Power Co");
    expect(text).toContain("Bill type: power");
    expect(text).toContain("Amount: $142.50");
    expect(text).toContain("Due: May 1, 2026");
    expect(text).toContain("Suggested action:");
  });

  it("omits missing fields for a photo", () => {
    const text = formatVisionResultForPrompt(photoResult);
    expect(text).toContain("Image type: photo");
    expect(text).toContain("Description: A landscape photo");
    expect(text).not.toContain("From:");
    expect(text).not.toContain("Bill type:");
    expect(text).not.toContain("Amount:");
    expect(text).not.toContain("Due:");
    expect(text).not.toContain("Suggested action:");
  });

  it("includes line items when present", () => {
    const result: ImageAnalysisResult = {
      ...baseBillResult,
      extractedInfo: {
        ...baseBillResult.extractedInfo,
        lineItems: "Electricity: $100, Surcharge: $42.50",
      },
    };
    const text = formatVisionResultForPrompt(result);
    expect(text).toContain("Items: Electricity: $100, Surcharge: $42.50");
  });

  it("separates fields with period-space", () => {
    const text = formatVisionResultForPrompt(baseBillResult);
    expect(text).toMatch(/\. /);
  });
});

describe("actionsFromVisionResult", () => {
  it("generates update_bill_status for household gig with bill image", () => {
    const actions = actionsFromVisionResult(baseBillResult, "household", []);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("update_bill_status");
    expect(actions[0].billType).toBe("power");
    expect(actions[0].vendor).toBe("City Power Co");
    expect(actions[0].amount).toBe(142.50);
    expect(actions[0].dueDate).toBe("May 1, 2026");
    expect(actions[0].billStatus).toBe("submitted");
  });

  it("generates update_bill_status for bills gig type too", () => {
    const actions = actionsFromVisionResult(baseBillResult, "bills", []);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("update_bill_status");
  });

  it("does NOT generate action if existingActions already has update_bill_status", () => {
    const existing: GigAction[] = [{ type: "update_bill_status", billType: "power", billStatus: "submitted" }];
    const actions = actionsFromVisionResult(baseBillResult, "household", existing);
    expect(actions).toHaveLength(0);
  });

  it("does NOT generate action for non-bill gig type", () => {
    const actions = actionsFromVisionResult(baseBillResult, "general", []);
    expect(actions).toHaveLength(0);
  });

  it("does NOT generate action for photo image type in household gig", () => {
    const actions = actionsFromVisionResult(photoResult, "household", []);
    expect(actions).toHaveLength(0);
  });

  it("does NOT generate action if billType is missing from extractedInfo", () => {
    const result: ImageAnalysisResult = {
      imageType: "bill",
      extractedInfo: {
        hasAmounts: true,
        hasDates: false,
        description: "An unclear document",
      },
    };
    const actions = actionsFromVisionResult(result, "household", []);
    expect(actions).toHaveLength(0);
  });

  it("handles totalAmount with currency symbols and commas", () => {
    const result: ImageAnalysisResult = {
      ...baseBillResult,
      extractedInfo: {
        ...baseBillResult.extractedInfo,
        totalAmount: "$1,234.56",
      },
    };
    const actions = actionsFromVisionResult(result, "household", []);
    expect(actions[0].amount).toBe(1234.56);
  });

  it("sets amount to undefined for non-numeric totalAmount", () => {
    const result: ImageAnalysisResult = {
      ...baseBillResult,
      extractedInfo: {
        ...baseBillResult.extractedInfo,
        totalAmount: "not a number",
      },
    };
    const actions = actionsFromVisionResult(result, "household", []);
    expect(actions[0].amount).toBeUndefined();
  });

  it("handles missing totalAmount gracefully", () => {
    const result: ImageAnalysisResult = {
      ...baseBillResult,
      extractedInfo: {
        ...baseBillResult.extractedInfo,
        totalAmount: undefined,
      },
    };
    const actions = actionsFromVisionResult(result, "household", []);
    expect(actions[0].amount).toBeUndefined();
  });

  it("supports receipt imageType for household gig", () => {
    const result: ImageAnalysisResult = {
      imageType: "receipt",
      extractedInfo: {
        hasAmounts: true,
        hasDates: false,
        billType: "internet",
        description: "Internet service receipt",
      },
    };
    const actions = actionsFromVisionResult(result, "household", []);
    expect(actions).toHaveLength(1);
    expect(actions[0].billType).toBe("internet");
  });

  it("supports invoice imageType for household gig", () => {
    const result: ImageAnalysisResult = {
      imageType: "invoice",
      extractedInfo: {
        hasAmounts: true,
        hasDates: true,
        billType: "trash",
        fromEntity: "Waste Mgmt Inc",
        description: "Monthly waste collection invoice",
      },
    };
    const actions = actionsFromVisionResult(result, "household", []);
    expect(actions).toHaveLength(1);
    expect(actions[0].billType).toBe("trash");
    expect(actions[0].vendor).toBe("Waste Mgmt Inc");
  });
});
