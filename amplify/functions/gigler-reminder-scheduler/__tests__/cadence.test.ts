import { describe, expect, it } from "vitest";
import {
  getNudgeCadence,
  getParticipantStaleHours,
  KNOWN_GIG_TYPES,
  PARTICIPANT_STALE_HOURS_MULTIPLIER,
} from "../cadence";

describe("getNudgeCadence", () => {
  it("returns household with longest stale window", () => {
    const h = getNudgeCadence("household");
    const p = getNudgeCadence("planning");
    expect(h.staleHours).toBe(168);
    expect(h.staleHours).toBeGreaterThan(p.staleHours);
  });

  it("returns planning and scheduling at 72h", () => {
    expect(getNudgeCadence("planning")).toEqual({ staleHours: 72, cooldownHours: 72 });
    expect(getNudgeCadence("scheduling")).toEqual({ staleHours: 72, cooldownHours: 72 });
  });

  it("returns creative, coding, professional at 120h", () => {
    expect(getNudgeCadence("creative")).toEqual({ staleHours: 120, cooldownHours: 120 });
    expect(getNudgeCadence("coding")).toEqual({ staleHours: 120, cooldownHours: 120 });
    expect(getNudgeCadence("professional")).toEqual({ staleHours: 120, cooldownHours: 120 });
  });

  it("returns default 48h for lifestyle, education, business_formation, reservations, custom", () => {
    for (const t of ["lifestyle", "education", "business_formation", "reservations", "custom"] as const) {
      expect(getNudgeCadence(t)).toEqual({ staleHours: 48, cooldownHours: 48 });
    }
  });

  it("falls back for unknown type", () => {
    expect(getNudgeCadence("unknown_type_xyz")).toEqual({ staleHours: 48, cooldownHours: 48 });
  });

  it("falls back for null and empty", () => {
    expect(getNudgeCadence(null)).toEqual({ staleHours: 48, cooldownHours: 48 });
    expect(getNudgeCadence(undefined)).toEqual({ staleHours: 48, cooldownHours: 48 });
    expect(getNudgeCadence("")).toEqual({ staleHours: 48, cooldownHours: 48 });
  });

  it("every known gig type returns finite positive hours", () => {
    for (const t of KNOWN_GIG_TYPES) {
      const c = getNudgeCadence(t);
      expect(Number.isFinite(c.staleHours)).toBe(true);
      expect(Number.isFinite(c.cooldownHours)).toBe(true);
      expect(c.staleHours).toBeGreaterThan(0);
      expect(c.cooldownHours).toBeGreaterThan(0);
    }
  });
});

describe("getParticipantStaleHours", () => {
  it("scales household cadence by multiplier", () => {
    const h = getNudgeCadence("household").staleHours;
    expect(getParticipantStaleHours("household")).toBe(Math.round(h * PARTICIPANT_STALE_HOURS_MULTIPLIER));
  });

  it("is at least 1 hour", () => {
    expect(getParticipantStaleHours("custom")).toBeGreaterThanOrEqual(1);
  });
});
