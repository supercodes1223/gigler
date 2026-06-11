import { describe, expect, it } from "vitest";
import { SCENARIOS } from "../demo-scenarios";

describe("SCENARIOS", () => {
  it("has the four scenarios in rotation order", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      "dinner",
      "trip",
      "calls",
      "email",
    ]);
  });

  it("gives every scenario a headline phrase and a dot label", () => {
    for (const s of SCENARIOS) {
      expect(s.phrase.length).toBeGreaterThan(0);
      expect(s.label.length).toBeGreaterThan(0);
    }
  });

  it("never starts or ends a script with a typing indicator", () => {
    for (const s of SCENARIOS) {
      expect(s.script.length).toBeGreaterThan(0);
      expect(s.script[0].type).not.toBe("typing");
      expect(s.script[s.script.length - 1].type).not.toBe("typing");
    }
  });

  it("opens every script with the user asking first", () => {
    for (const s of SCENARIOS) {
      expect(s.script[0].type).toBe("user");
    }
  });

  it("ends every script with a settle hold of at least 4s before rotating", () => {
    for (const s of SCENARIOS) {
      expect(s.script[s.script.length - 1].hold).toBeGreaterThanOrEqual(4000);
    }
  });

  it("has non-empty text on every message step and positive holds everywhere", () => {
    for (const s of SCENARIOS) {
      for (const step of s.script) {
        expect(step.hold).toBeGreaterThan(0);
        if (step.type === "user" || step.type === "gigler") {
          expect(step.text.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("anchors every annotation to a real, non-typing script step", () => {
    for (const s of SCENARIOS) {
      expect(s.annotations.length).toBeGreaterThanOrEqual(1);
      expect(s.annotations.length).toBeLessThanOrEqual(2);
      for (const a of s.annotations) {
        expect(a.afterStep).toBeGreaterThanOrEqual(0);
        expect(a.afterStep).toBeLessThan(s.script.length);
        expect(s.script[a.afterStep].type).not.toBe("typing");
        expect(a.title.length).toBeGreaterThan(0);
        expect(a.body.length).toBeGreaterThan(0);
      }
    }
  });

  it("never puts two annotations in the same slot within a scenario", () => {
    for (const s of SCENARIOS) {
      const sides = s.annotations.map((a) => a.side);
      expect(new Set(sides).size).toBe(sides.length);
    }
  });

  it("keeps the dinner scenario's existing Via Carota arc", () => {
    const dinner = SCENARIOS[0];
    const texts = dinner.script
      .filter((st) => st.type === "gigler")
      .map((st) => (st.type === "gigler" ? st.text : ""))
      .join(" ");
    expect(texts).toContain("Via Carota");
    expect(dinner.script[dinner.script.length - 1].type).toBe("map");
  });

  it("closes the email scenario with the sent-email card", () => {
    const email = SCENARIOS[3];
    expect(email.script[email.script.length - 1].type).toBe("email");
  });
});
