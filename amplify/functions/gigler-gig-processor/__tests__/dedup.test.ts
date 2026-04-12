import { describe, expect, it, vi } from "vitest";
import { computeMessageHash, isDuplicateMessage } from "../dedup";

describe("computeMessageHash", () => {
  it("produces a 16-char hex string", () => {
    const hash = computeMessageHash("+1234", "hello", false);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("returns the same hash for identical inputs", () => {
    const a = computeMessageHash("+1234", "hello world", false);
    const b = computeMessageHash("+1234", "hello world", false);
    expect(a).toBe(b);
  });

  it("returns different hash for different sender", () => {
    const a = computeMessageHash("+1234", "hello", false);
    const b = computeMessageHash("+5678", "hello", false);
    expect(a).not.toBe(b);
  });

  it("returns different hash for different body", () => {
    const a = computeMessageHash("+1234", "hello", false);
    const b = computeMessageHash("+1234", "goodbye", false);
    expect(a).not.toBe(b);
  });

  it("returns different hash for different media flag", () => {
    const a = computeMessageHash("+1234", "hello", false);
    const b = computeMessageHash("+1234", "hello", true);
    expect(a).not.toBe(b);
  });

  it("normalizes body to lowercase", () => {
    const a = computeMessageHash("+1234", "HELLO WORLD", false);
    const b = computeMessageHash("+1234", "hello world", false);
    expect(a).toBe(b);
  });

  it("trims whitespace from body", () => {
    const a = computeMessageHash("+1234", "  hello  ", false);
    const b = computeMessageHash("+1234", "hello", false);
    expect(a).toBe(b);
  });

  it("truncates body at 100 characters", () => {
    const longBody = "a".repeat(200);
    const a = computeMessageHash("+1234", longBody, false);
    const shortBody = "a".repeat(100);
    const b = computeMessageHash("+1234", shortBody, false);
    expect(a).toBe(b);
  });

  it("handles empty body", () => {
    const hash = computeMessageHash("+1234", "", false);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("returns different hash for different mediaId", () => {
    const a = computeMessageHash("+1234", "", true, "ME_image_a");
    const b = computeMessageHash("+1234", "", true, "ME_image_b");
    expect(a).not.toBe(b);
  });

  it("returns same hash when mediaId is the same", () => {
    const a = computeMessageHash("+1234", "", true, "ME_image_a");
    const b = computeMessageHash("+1234", "", true, "ME_image_a");
    expect(a).toBe(b);
  });

  it("is backward-compatible when mediaId is omitted", () => {
    const a = computeMessageHash("+1234", "hello", true);
    const b = computeMessageHash("+1234", "hello", true, undefined);
    expect(a).toBe(b);
  });
});

describe("isDuplicateMessage", () => {
  it("returns true when hash matches and within 60s window", () => {
    const metadata = {
      lastProcessedHash: "abc123",
      lastProcessedAt: new Date(Date.now() - 30_000).toISOString(),
    };
    expect(isDuplicateMessage(metadata, "abc123")).toBe(true);
  });

  it("returns false when hash matches but outside 60s window", () => {
    const metadata = {
      lastProcessedHash: "abc123",
      lastProcessedAt: new Date(Date.now() - 90_000).toISOString(),
    };
    expect(isDuplicateMessage(metadata, "abc123")).toBe(false);
  });

  it("returns false when hash does not match", () => {
    const metadata = {
      lastProcessedHash: "abc123",
      lastProcessedAt: new Date().toISOString(),
    };
    expect(isDuplicateMessage(metadata, "different")).toBe(false);
  });

  it("returns false when lastProcessedAt is missing", () => {
    const metadata = { lastProcessedHash: "abc123" };
    expect(isDuplicateMessage(metadata, "abc123")).toBe(false);
  });

  it("returns false when lastProcessedHash is missing", () => {
    const metadata = { lastProcessedAt: new Date().toISOString() };
    expect(isDuplicateMessage(metadata, "abc123")).toBe(false);
  });

  it("returns false for empty metadata", () => {
    expect(isDuplicateMessage({}, "abc123")).toBe(false);
  });

  it("returns true at exactly 59 seconds", () => {
    const metadata = {
      lastProcessedHash: "abc123",
      lastProcessedAt: new Date(Date.now() - 59_000).toISOString(),
    };
    expect(isDuplicateMessage(metadata, "abc123")).toBe(true);
  });
});
