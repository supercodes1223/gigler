# Demo Rotating Scenario Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single hardcoded phone demo in the `#demo` section into a four-scenario rotating showcase: phone on the right, a synced "Gigler can ___" rotating headline with iOS-style page dots on the left, and floating annotations that appear timed to specific messages.

**Architecture:** Scenario data (scripts, headline phrases, annotations) lives in a pure-TS module `demo-scenarios.ts` (unit-testable in vitest's node env). A new client component `DemoShowcase` owns the single source of truth — the active scenario index — and renders the headline stack, the dots, and `IphoneDemo`. `IphoneDemo` is refactored to take the active scenario as a prop, gate annotations on its step cursor, and call `onComplete` when a script finishes so the parent rotates.

**Tech Stack:** Next.js 16 / React 19, Tailwind v4, vitest (node env, `npm test`), existing CSS animation classes (`bubble-in`, `glass`), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-10-demo-rotating-scenarios-design.md`

**File map:**
- Create: `src/components/marketing/demo-scenarios.ts` — `Step`/`Annotation`/`Scenario` types + `SCENARIOS` data (no React imports, so it runs under vitest node env)
- Create: `src/components/marketing/__tests__/demo-scenarios.test.ts` — data-integrity tests
- Create: `src/components/marketing/DemoShowcase.tsx` — scenario state, rotating headline, dots
- Modify: `src/components/marketing/IphoneDemo.tsx` — props-driven script, synced annotations, email card step, `onComplete`
- Modify: `src/app/page.tsx` — render `DemoShowcase`, generalize subtitle

**Important codebase notes for the implementer:**
- Tailwind v4 arbitrary gradient/radial classes don't compile in this project — use inline `style` for gradients (see existing comments in `MeshHero.tsx`). The code below only uses classes already proven in the codebase.
- `bg-spring-mint`, `text-foreground`, `glass`, `bubble-in`, `bubble-tail-*`, `typing-dot` are existing tokens/classes (see `src/app/globals.css`, `UseCases.tsx`).
- `vitest.config.ts` has **no path-alias resolution** — test files must use relative imports (`../demo-scenarios`), not `@/`.
- `globals.css` already disables `bubble-in`/`typing-dot` animation under `prefers-reduced-motion`; the new headline transition uses Tailwind's `motion-reduce:transition-none`.

---

### Task 1: Scenario data module (TDD)

**Files:**
- Test: `src/components/marketing/__tests__/demo-scenarios.test.ts`
- Create: `src/components/marketing/demo-scenarios.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/marketing/__tests__/demo-scenarios.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/marketing/__tests__/demo-scenarios.test.ts`
Expected: FAIL — `Cannot find module '../demo-scenarios'` (or equivalent resolve error).

- [ ] **Step 3: Create the data module**

Create `src/components/marketing/demo-scenarios.ts`:

```ts
// Scenario data for the rotating demo showcase. Pure TS (no React) so the
// vitest node environment can import it directly.

export type Step =
  | { type: "user" | "gigler"; text: string; hold: number }
  | { type: "typing"; hold: number }
  | { type: "map"; place: string; city: string; hold: number }
  | { type: "email"; subject: string; to: string; hold: number };

export type Annotation = {
  /** Script index whose appearance reveals this annotation. */
  afterStep: number;
  side: "left" | "right";
  title: string;
  body: string;
};

export type Scenario = {
  id: "dinner" | "trip" | "calls" | "email";
  /** Second line of the "Gigler can …" headline. */
  phrase: string;
  /** Used in the dot's aria-label: "Show the {label} demo". */
  label: string;
  script: Step[];
  annotations: Annotation[];
};

export const SCENARIOS: Scenario[] = [
  {
    id: "dinner",
    phrase: "book your dinner",
    label: "dinner reservation",
    script: [
      {
        type: "user",
        text: "Can you get us a table for 4 somewhere good Friday at 7?",
        hold: 1300,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "On it. You loved Italian last month, checking a couple of spots near you.",
        hold: 1700,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "Give me one sec to call them and see what tables they have.",
        hold: 1700,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "Via Carota has Friday, 7:15 for 4. Want it?",
        hold: 1400,
      },
      { type: "user", text: "Yes, book it", hold: 1200 },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "Done. Table for 4, Friday 7:15 PM. Confirmation's in your email, and here's the spot:",
        hold: 1400,
      },
      { type: "map", place: "Via Carota", city: "New York, NY", hold: 5200 },
    ],
    annotations: [
      {
        afterStep: 2,
        side: "left",
        title: "It remembers",
        body: "“You loved Italian last month.” No re-explaining.",
      },
      {
        afterStep: 10,
        side: "right",
        title: "Reservation made",
        body: "Real bookings, real confirmations. Not just advice.",
      },
    ],
  },
  {
    id: "trip",
    phrase: "plan your trip",
    label: "trip planning",
    script: [
      {
        type: "user",
        text: "Can you find me a flight to NYC next Friday? Under $300",
        hold: 1300,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "Delta nonstop, LAX to JFK, $284. Leaves 9:30 AM, lands 6:05 PM. Book it?",
        hold: 1700,
      },
      { type: "user", text: "Yes, and a hotel near SoHo", hold: 1200 },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "Flight's booked. The Dominick in SoHo is $219 a night, rated 4.7 stars. Want it?",
        hold: 1700,
      },
      { type: "user", text: "Book it", hold: 1200 },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "Done. Boarding pass coming Thursday, and the whole trip's on your calendar.",
        hold: 4800,
      },
    ],
    annotations: [
      {
        afterStep: 5,
        side: "left",
        title: "One ask, whole trip",
        body: "Flight, hotel, follow-ups. One thread.",
      },
      {
        afterStep: 8,
        side: "right",
        title: "On your calendar",
        body: "Boarding pass, check-in, all of it.",
      },
    ],
  },
  {
    id: "calls",
    phrase: "make your calls",
    label: "phone call",
    script: [
      {
        type: "user",
        text: "My internet bill jumped $30 this month. Can you deal with it?",
        hold: 1300,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "That's not right. On it, calling them now.",
        hold: 1700,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "On hold with billing. You don't have to do a thing.",
        hold: 2200,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "Done. They applied a $30 credit and moved you to a cheaper plan, $42 a month starting next cycle.",
        hold: 1400,
      },
      { type: "user", text: "You're the best", hold: 4800 },
    ],
    annotations: [
      {
        afterStep: 2,
        side: "right",
        title: "It makes the call",
        body: "Waits on hold, talks to a human, texts you the result.",
      },
    ],
  },
  {
    id: "email",
    phrase: "handle your email",
    label: "email",
    script: [
      {
        type: "user",
        text: "The kitchen sink's been leaking since Monday. Can you get the landlord on it?",
        hold: 1300,
      },
      { type: "typing", hold: 1500 },
      {
        type: "gigler",
        text: "On it. Writing to Westside Property now, I'll ask them to send a plumber this week.",
        hold: 1700,
      },
      { type: "typing", hold: 1500 },
      { type: "gigler", text: "Sent. Here's a copy:", hold: 1200 },
      {
        type: "email",
        subject: "Kitchen leak repair request",
        to: "Westside Property",
        hold: 5200,
      },
    ],
    annotations: [
      {
        afterStep: 5,
        side: "left",
        title: "Real emails, actually sent",
        body: "Drafted, sent, and followed up for you.",
      },
    ],
  },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/marketing/__tests__/demo-scenarios.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Run the full suite to confirm nothing else broke**

Run: `npm test`
Expected: all suites PASS (the pre-existing amplify/lib suites plus the new one).

- [ ] **Step 6: Commit**

```bash
git add src/components/marketing/demo-scenarios.ts src/components/marketing/__tests__/demo-scenarios.test.ts
git commit -m "Demo: scenario data module with four scripted arcs"
```

---

### Task 2: Refactor IphoneDemo to be scenario-driven

**Files:**
- Modify: `src/components/marketing/IphoneDemo.tsx` (full rewrite of the file)

The component changes from zero-props with a hardcoded `SCRIPT` to
`{ scenario, onComplete }`. The conversation rendering is unchanged except:
a new `email` card step, annotations driven by `scenario.annotations` gated
on the cursor, and `onComplete()` fired after the final step's hold instead
of looping to step 0. The parent re-keys this component per scenario, so the
cursor naturally resets on rotation.

- [ ] **Step 1: Rewrite `src/components/marketing/IphoneDemo.tsx`**

Replace the entire file with:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Apple, ChevronLeft, ChevronRight, Mic, Plus } from "lucide-react";
import { Iphone17Pro } from "@/components/ui/iphone-17-pro";
import { IosStatusBar } from "@/components/ui/ios-status-bar";
import { VideoFill } from "@/components/ui/sf-icons";
import type { Scenario } from "@/components/marketing/demo-scenarios";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

// Rendered with the first message — iMessage never shows a timestamp alone.
const TIMESTAMP = "Tuesday 2:14 PM";

export function IphoneDemo({
  scenario,
  onComplete,
}: {
  scenario: Scenario;
  onComplete: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const script = scenario.script;

  // Play while in view; pause (and later resume) when scrolled away.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || reducedMotion) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPlaying(entry.isIntersecting),
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    const step = script[cursor];
    const timer = setTimeout(() => {
      if (cursor + 1 < script.length) {
        setCursor(cursor + 1);
      } else {
        // Script finished its settle hold — hand control back to the
        // showcase, which advances to the next scenario and re-keys us.
        onComplete();
      }
    }, step.hold);
    return () => clearTimeout(timer);
  }, [playing, cursor, reducedMotion, script, onComplete]);

  const visible = reducedMotion
    ? script.filter((s) => s.type !== "typing")
    : script.slice(0, cursor + 1).filter(
        (s, i) => s.type !== "typing" || i === cursor
      );

  const lastUserIndex = visible.reduce(
    (acc, s, i) => (s.type === "user" ? i : acc),
    -1
  );
  const giglerReplied = visible.some(
    (s, i) => s.type === "gigler" && i > lastUserIndex
  );

  return (
    <div ref={frameRef} className="relative mx-auto w-[300px] sm:w-[340px]">
      {/* Device frame */}
      <Iphone17Pro className="w-full">
        <div className="font-ios relative h-full bg-white">
          {/* iOS status bar (Dynamic Island renders above this, in the frame) */}
          <IosStatusBar className="text-black" />

          {/* Top scrim: content fades out beneath the status/nav area */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[112px] bg-[linear-gradient(to_bottom,#fff_0px,#fff_40px,rgba(255,255,255,0.9)_72px,transparent_112px)]"
          />

          {/* Floating nav — iOS 26 liquid glass capsules over the content.
              Percentage top so it tracks the island (bottom at 5.62% of
              screen height) at every frame width, unlike a px offset. */}
          <div className="absolute inset-x-0 top-[6.8%] z-20 flex items-start justify-between px-2.5">
            <div
              aria-hidden
              className="glass mt-0.5 flex size-8 items-center justify-center rounded-full"
            >
              <ChevronLeft className="size-[18px] -translate-x-px text-[#0a7cff]" />
            </div>
            <div className="flex flex-col items-center">
              {/* Same saturated avatar green as the call/email tiles — the
                  spring pastels read as a white wash at this size */}
              <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-b from-[#6cc197] to-[#2f8f63] text-[13px] font-semibold text-white ring-1 ring-black/5">
                G
              </span>
              <span className="glass-strong mt-[5px] flex items-center rounded-full py-[3px] pl-2.5 pr-1.5 text-[11px] font-semibold text-foreground">
                Gigler
                <ChevronRight
                  className="size-2.5 text-black/35"
                  aria-hidden
                />
              </span>
            </div>
            <div
              aria-hidden
              className="glass mt-0.5 flex size-8 items-center justify-center rounded-full"
            >
              <VideoFill className="size-4 text-[#0a7cff]" />
            </div>
          </div>

          {/* Conversation — runs edge to edge, under the floating chrome */}
          <div className="absolute inset-0 flex flex-col justify-end gap-1.5 overflow-hidden px-3 pb-[58px] pt-[106px]">
            {visible.map((step, i) => {
              if (step.type === "typing") {
                return (
                  <div
                    key={i}
                    className="bubble-in bubble-tail-gigler flex w-fit items-center gap-1 rounded-[18px] bg-[#e9e9eb] px-3.5 py-2.5"
                  >
                    <span className="typing-dot size-1.5 rounded-full bg-black/40" />
                    <span className="typing-dot size-1.5 rounded-full bg-black/40" />
                    <span className="typing-dot size-1.5 rounded-full bg-black/40" />
                  </div>
                );
              }
              if (step.type === "map") {
                return (
                  <div key={i} className="bubble-in flex flex-col items-start">
                    <div className="w-[210px] overflow-hidden rounded-[18px] bg-[#e9e9eb]">
                      {/* Faux Apple Maps tile */}
                      <div className="relative h-28 overflow-hidden bg-[#eaf3ea]">
                        {/* parkland */}
                        <div className="absolute -left-2 top-3 h-16 w-24 rotate-[12deg] rounded-lg bg-[#cfe7cf]" />
                        <div className="absolute bottom-2 right-1 h-12 w-16 -rotate-6 rounded-lg bg-[#cfe7cf]" />
                        {/* roads */}
                        <div className="absolute -left-4 top-10 h-2 w-[140%] -rotate-[18deg] bg-white" />
                        <div className="absolute left-1/2 -top-4 h-[150%] w-2 rotate-[24deg] bg-white" />
                        <div className="absolute -left-4 bottom-3 h-1.5 w-[140%] -rotate-[8deg] bg-white/80" />
                        {/* location pin — tip lands on the road junction */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
                          <svg
                            viewBox="0 0 24 32"
                            className="h-[22px] w-auto drop-shadow-md"
                            aria-hidden
                          >
                            <path
                              fill="#0a7cff"
                              stroke="#fff"
                              strokeWidth="2"
                              d="M12 1C5.9 1 1 5.9 1 12c0 8.25 11 19 11 19s11-10.75 11-19C23 5.9 18.1 1 12 1Z"
                            />
                            <circle cx="12" cy="12" r="4" fill="#fff" />
                          </svg>
                        </div>
                      </div>
                      {/* footer */}
                      <div className="bg-white px-3 py-2">
                        <p className="text-[13px] font-semibold leading-tight text-black">
                          {step.place}
                        </p>
                        <p className="text-[11px] text-black/45">{step.city}</p>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-black/45">
                          <Apple className="size-3 fill-current" aria-hidden />
                          <span>Maps</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              if (step.type === "email") {
                return (
                  <div key={i} className="bubble-in flex flex-col items-start">
                    {/* Compact sent-email card — same visual family as the
                        UseCases email tile, sized like the map card */}
                    <div className="w-[230px] rounded-[18px] border border-black/[0.06] bg-white p-3 shadow-sm">
                      <p className="text-[13px] font-semibold leading-tight text-black">
                        {step.subject}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#6cc197] to-[#2f8f63] text-[10px] font-semibold text-white">
                          G
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-medium text-black">
                            Gigler
                          </p>
                          <p className="truncate text-[10px] text-black/45">
                            to {step.to}
                          </p>
                        </div>
                        <span className="rounded-full bg-spring-mint/70 px-2 py-0.5 text-[9px] font-medium text-[#2f8f63]">
                          Sent
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }
              const isUser = step.type === "user";
              // iOS tails only the last bubble of a same-sender run
              const next = visible[i + 1];
              const hasTail = !next || next.type !== step.type;
              return (
                <div key={i} className={cn("bubble-in flex flex-col", isUser && "items-end")}>
                  {i === 0 && (
                    <p className="self-center py-1 text-center text-[10px] font-medium text-black/35">
                      {TIMESTAMP}
                    </p>
                  )}
                  <p
                    className={cn(
                      "w-fit max-w-[78%] rounded-[18px] px-3.5 py-2 text-[13px] leading-snug",
                      isUser
                        ? "bg-[#0a7cff] text-white"
                        : "bg-[#e9e9eb] text-black",
                      hasTail && (isUser ? "bubble-tail-user" : "bubble-tail-gigler")
                    )}
                  >
                    {step.text}
                  </p>
                  {isUser && i === lastUserIndex && giglerReplied && (
                    <span className="mt-0.5 pr-1 text-[9px] font-medium text-black/35">
                      Delivered
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Floating compose bar — liquid glass */}
          <div className="absolute inset-x-0 bottom-[14px] z-20 flex items-center gap-1.5 px-2.5">
            <div
              aria-hidden
              className="glass flex size-9 shrink-0 items-center justify-center rounded-full"
            >
              <Plus className="size-[18px] text-black/55" />
            </div>
            <div className="glass flex h-9 flex-1 items-center justify-between rounded-full pl-4 pr-2.5">
              <span className="text-[12px] text-black/35">iMessage</span>
              <Mic className="size-4 text-black/35" aria-hidden />
            </div>
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-1.5 left-1/2 z-30 h-1 w-28 -translate-x-1/2 rounded-full bg-black/80" />
        </div>
      </Iphone17Pro>

      {/* Floating glass annotations (desktop only) — each appears the moment
          its anchor step lands in the conversation. Two fixed slots: right →
          upper right, left → lower left. Padding >= corner radius so text
          clears the corner curves. */}
      {scenario.annotations.map((a) => {
        const shown = reducedMotion || cursor >= a.afterStep;
        if (!shown) return null;
        return (
          <div
            key={a.title}
            className={cn(
              "bubble-in absolute hidden w-48 rounded-2xl bg-white/55 px-4 py-3.5 shadow-[0_8px_24px_-12px_rgba(20,30,40,0.15)] backdrop-blur-xl lg:block",
              a.side === "right" ? "-right-36 top-24" : "-left-36 bottom-32"
            )}
          >
            <p className="text-xs font-medium text-foreground">{a.title}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {a.body}
            </p>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Lint and typecheck**

Run: `npm run lint && npx tsc --noEmit`
Expected: lint passes for the file; `tsc` reports errors **only** in `src/app/page.tsx` (it still renders `<IphoneDemo />` without props — fixed in Task 4). If `tsc` flags anything inside `IphoneDemo.tsx` or `demo-scenarios.ts`, fix that now.

Note: do NOT commit yet — the page is broken until `DemoShowcase` exists and `page.tsx` is updated. Tasks 2–4 land as one commit in Task 4.

---

### Task 3: DemoShowcase component

**Files:**
- Create: `src/components/marketing/DemoShowcase.tsx`

- [ ] **Step 1: Create `src/components/marketing/DemoShowcase.tsx`**

```tsx
"use client";

import { useCallback, useState } from "react";
import { IphoneDemo } from "@/components/marketing/IphoneDemo";
import { SCENARIOS } from "@/components/marketing/demo-scenarios";
import { cn } from "@/lib/utils";

// Rotating scenario showcase: headline + dots on the left, phone on the
// right. One state machine (the active index) drives the headline, the dots,
// the phone script, and the annotations, so they can never drift apart.
export function DemoShowcase() {
  const [active, setActive] = useState(0);

  // Stable identity so IphoneDemo's step-timer effect doesn't restart on
  // every parent render.
  const advance = useCallback(
    () => setActive((i) => (i + 1) % SCENARIOS.length),
    []
  );

  const scenario = SCENARIOS[active];

  return (
    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        <h2 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          Gigler can
          {/* All phrases stacked in one grid cell: the cell sizes to the
              widest phrase, so swaps never shift layout. Decorative rotation
              — inactive phrases are aria-hidden, nothing is announced. */}
          <span className="mt-1 grid">
            {SCENARIOS.map((s, i) => (
              <span
                key={s.id}
                aria-hidden={i !== active}
                className={cn(
                  "col-start-1 row-start-1 transition-all duration-500 ease-out motion-reduce:transition-none",
                  i === active
                    ? "translate-y-0 opacity-100"
                    : i < active
                      ? "-translate-y-3 opacity-0"
                      : "translate-y-3 opacity-0"
                )}
              >
                {s.phrase}
              </span>
            ))}
          </span>
        </h2>

        {/* iOS page-indicator dots: lowkey, active one elongated */}
        <div className="mt-8 flex items-center gap-2">
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show the ${s.label} demo`}
              aria-current={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "h-[7px] rounded-full transition-all duration-300 motion-reduce:transition-none",
                i === active
                  ? "w-5 bg-foreground/70"
                  : "w-[7px] bg-foreground/20 hover:bg-foreground/40"
              )}
            />
          ))}
        </div>
      </div>

      {/* Re-key per scenario: the conversation cursor and intersection
          observer reset cleanly on every rotation or dot click. */}
      <IphoneDemo key={scenario.id} scenario={scenario} onComplete={advance} />
    </div>
  );
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: PASS (page.tsx still type-broken until Task 4; that's expected).

---

### Task 4: Wire into the page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update the demo section**

In `src/app/page.tsx`, replace the `IphoneDemo` import with `DemoShowcase`:

```tsx
import { DemoShowcase } from "@/components/marketing/DemoShowcase";
```

(remove the now-unused `IphoneDemo` import), and replace the `#demo` section body:

```tsx
<section id="demo" className="px-6 py-24 md:py-32">
  <div className="mx-auto max-w-6xl">
    <SectionHeader
      eyebrow="See it work"
      title="Like texting a very capable friend."
      subtitle="Watch Gigler take a request from “can you?” to confirmed, start to finish."
    />
    <div className="mt-14">
      <DemoShowcase />
    </div>
  </div>
</section>
```

- [ ] **Step 2: Full verification suite**

Run: `npm run lint && npx tsc --noEmit && npm test && npm run build`
Expected: all PASS, build completes with no type errors.

- [ ] **Step 3: Commit Tasks 2–4 together (first state where the page works)**

```bash
git add src/components/marketing/IphoneDemo.tsx src/components/marketing/DemoShowcase.tsx src/app/page.tsx
git commit -m "Demo: rotating scenario showcase with synced headline and annotations"
```

---

### Task 5: Visual verification

**Files:** none (manual pass; fix-ups allowed)

- [ ] **Step 1: Run the dev server and watch a full loop**

Run: `npm run dev`, open `http://localhost:3000`, scroll to the demo section. Verify:
- Dinner plays first; "It remembers" pops exactly when the "You loved Italian" bubble lands; "Reservation made" pops with the map card.
- After the map's settle hold, the headline slides to "plan your trip", the active dot moves, and the trip conversation starts fresh.
- All four scenarios complete and the loop wraps back to dinner.
- Headline swap causes no layout shift (phrases are grid-stacked).

- [ ] **Step 2: Dot interaction**

Click the email dot mid-dinner: conversation resets to the email script immediately, headline and annotations follow. Auto-rotation continues from email afterward.

- [ ] **Step 3: Responsive check**

In DevTools, check ~1280px (two columns, annotations visible and not colliding with the headline column), ~1024px (lg boundary), and 390px (single column: header → headline+dots → phone; annotations hidden).

- [ ] **Step 4: Reduced motion**

Emulate `prefers-reduced-motion: reduce` (DevTools Rendering tab): full conversation renders statically with both annotations, no auto-rotation, no phrase animation; dots still switch scenarios instantly.

- [ ] **Step 5: Scroll pause**

Scroll the section out of view mid-script and back: playback pauses and resumes (no rotation while off-screen).

- [ ] **Step 6: Fix-ups, if any**

If spacing/overlap needs tuning (likely candidates: annotation offsets `-left-36`/`-right-36` vs the headline column, grid `gap`, headline size), adjust and commit:

```bash
git add -A && git commit -m "Demo: visual polish after rotating showcase pass"
```
