/**
 * Live Gemini Vision Integration Tests
 *
 * These tests call the REAL Gemini Vision API with actual images.
 * They auto-skip when GEMINI_API_KEY is not set.
 *
 * Run manually:
 *   npx vitest run vision-live
 *
 * Or with explicit key:
 *   GEMINI_API_KEY=your-key npx vitest run vision-live
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { analyzeImageWithGemini } from "../vision";
import { formatVisionResultForPrompt, actionsFromVisionResult } from "../vision-utils";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-pro-preview";

const shouldRun = !!GEMINI_API_KEY;
const describeIf = shouldRun ? describe : describe.skip;

function loadFixture(filename: string): { base64: string; mimeType: string } {
  const filePath = join(__dirname, "fixtures", filename);
  const buffer = readFileSync(filePath);
  return {
    base64: buffer.toString("base64"),
    mimeType: "image/png",
  };
}

const realDeps = {
  fetch: globalThis.fetch,
  geminiApiKey: GEMINI_API_KEY,
  geminiModel: GEMINI_MODEL,
};

describeIf("Live Gemini Vision — Power Bill Screenshot", () => {
  it("identifies the image as a bill", async () => {
    const media = loadFixture("power-bill.png");
    const result = await analyzeImageWithGemini(
      media,
      { type: "household", title: "Monthly Utility Bills", description: "Track household utility bills" },
      realDeps
    );

    expect(result).not.toBeNull();
    console.log("[Vision Live] Power bill result:", JSON.stringify(result, null, 2));

    expect(result!.imageType).toBe("bill");
  }, 30_000);

  it("extracts the correct amount ($528.93)", async () => {
    const media = loadFixture("power-bill.png");
    const result = await analyzeImageWithGemini(
      media,
      { type: "household", title: "Monthly Utility Bills" },
      realDeps
    );

    expect(result).not.toBeNull();
    expect(result!.extractedInfo.hasAmounts).toBe(true);
    expect(result!.extractedInfo.totalAmount).toBeDefined();
    expect(result!.extractedInfo.totalAmount).toContain("528");
  }, 30_000);

  it("identifies bill type as power/electric", async () => {
    const media = loadFixture("power-bill.png");
    const result = await analyzeImageWithGemini(
      media,
      { type: "household", title: "Monthly Utility Bills" },
      realDeps
    );

    expect(result).not.toBeNull();
    expect(result!.extractedInfo.billType).toBeDefined();
    const billType = result!.extractedInfo.billType!.toLowerCase();
    expect(billType === "power" || billType === "electric" || billType === "electricity").toBe(true);
  }, 30_000);

  it("detects February billing period", async () => {
    const media = loadFixture("power-bill.png");
    const result = await analyzeImageWithGemini(
      media,
      { type: "household", title: "Monthly Utility Bills" },
      realDeps
    );

    expect(result).not.toBeNull();
    const description = (result!.extractedInfo.description || "").toLowerCase();
    const billingPeriod = (result!.extractedInfo.dueDate || "").toLowerCase();
    const suggested = (result!.suggestedAction || "").toLowerCase();
    const allText = `${description} ${billingPeriod} ${suggested}`;
    expect(allText).toContain("february");
  }, 30_000);

  it("generates update_bill_status action for household gig", async () => {
    const media = loadFixture("power-bill.png");
    const result = await analyzeImageWithGemini(
      media,
      { type: "household", title: "Monthly Utility Bills" },
      realDeps
    );

    expect(result).not.toBeNull();
    const actions = actionsFromVisionResult(result!, "household", []);
    expect(actions.length).toBeGreaterThanOrEqual(1);
    expect(actions[0].type).toBe("update_bill_status");
    expect(actions[0].amount).toBeCloseTo(528.93, 0);
  }, 30_000);

  it("formats vision result into readable prompt text", async () => {
    const media = loadFixture("power-bill.png");
    const result = await analyzeImageWithGemini(
      media,
      { type: "household", title: "Monthly Utility Bills" },
      realDeps
    );

    expect(result).not.toBeNull();
    const promptText = formatVisionResultForPrompt(result!);
    console.log("[Vision Live] Formatted prompt:", promptText);
    expect(promptText).toContain("bill");
    expect(promptText).toContain("528");
  }, 30_000);
});

describeIf("Live Gemini Vision — Handwritten Menu", () => {
  it("identifies the image as a document or menu (not a photo)", async () => {
    const media = loadFixture("handwritten-menu.png");
    const result = await analyzeImageWithGemini(
      media,
      { type: "planning", title: "Catering Planning", description: "Planning catering for an event" },
      realDeps
    );

    expect(result).not.toBeNull();
    console.log("[Vision Live] Menu result:", JSON.stringify(result, null, 2));

    expect(["document", "other", "receipt", "invoice"]).toContain(result!.imageType);
  }, 30_000);

  it("detects that the menu contains pricing amounts", async () => {
    const media = loadFixture("handwritten-menu.png");
    const result = await analyzeImageWithGemini(
      media,
      { type: "planning", title: "Catering Planning" },
      realDeps
    );

    expect(result).not.toBeNull();
    expect(result!.extractedInfo.hasAmounts).toBe(true);
  }, 30_000);

  it("extracts menu items or line items", async () => {
    const media = loadFixture("handwritten-menu.png");
    const result = await analyzeImageWithGemini(
      media,
      { type: "planning", title: "Catering Planning" },
      realDeps
    );

    expect(result).not.toBeNull();
    const allText = JSON.stringify(result).toLowerCase();
    expect(allText).toContain("chicken");
  }, 30_000);

  it("does NOT generate update_bill_status for a planning gig", async () => {
    const media = loadFixture("handwritten-menu.png");
    const result = await analyzeImageWithGemini(
      media,
      { type: "planning", title: "Catering Planning" },
      realDeps
    );

    expect(result).not.toBeNull();
    const actions = actionsFromVisionResult(result!, "planning", []);
    expect(actions).toHaveLength(0);
  }, 30_000);
});

describeIf("Live Gemini Vision — Food Photo (Salad)", () => {
  it("identifies the image as a photo", async () => {
    const media = loadFixture("food-photo.png");
    const result = await analyzeImageWithGemini(
      media,
      { type: "creative", title: "Food Photography", description: "Collecting photos for a gallery" },
      realDeps
    );

    expect(result).not.toBeNull();
    console.log("[Vision Live] Food photo result:", JSON.stringify(result, null, 2));

    expect(result!.imageType).toBe("photo");
  }, 30_000);

  it("does not detect bill amounts in a food photo", async () => {
    const media = loadFixture("food-photo.png");
    const result = await analyzeImageWithGemini(
      media,
      { type: "creative", title: "Food Photography" },
      realDeps
    );

    expect(result).not.toBeNull();
    expect(result!.extractedInfo.hasAmounts).toBe(false);
  }, 30_000);

  it("provides a meaningful description of the food", async () => {
    const media = loadFixture("food-photo.png");
    const result = await analyzeImageWithGemini(
      media,
      { type: "creative", title: "Food Photography" },
      realDeps
    );

    expect(result).not.toBeNull();
    expect(result!.extractedInfo.description.length).toBeGreaterThan(10);
    const desc = result!.extractedInfo.description.toLowerCase();
    expect(desc.includes("salad") || desc.includes("food") || desc.includes("vegetable") || desc.includes("bread")).toBe(true);
  }, 30_000);

  it("does NOT generate update_bill_status for a food photo in any gig type", async () => {
    const media = loadFixture("food-photo.png");
    const result = await analyzeImageWithGemini(
      media,
      { type: "household", title: "Bills Tracker" },
      realDeps
    );

    expect(result).not.toBeNull();
    const actions = actionsFromVisionResult(result!, "household", []);
    expect(actions).toHaveLength(0);
  }, 30_000);
});
