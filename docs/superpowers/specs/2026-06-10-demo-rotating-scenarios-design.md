# Demo Section: Rotating Scenario Showcase

**Date:** 2026-06-10
**Section:** `#demo` ("See it work") on the marketing page — `src/app/page.tsx`
**Components:** `src/components/marketing/IphoneDemo.tsx`, new `src/components/marketing/DemoShowcase.tsx`

## Goal

Turn the single hardcoded restaurant-booking phone demo into a rotating showcase
of four scenarios. The phone shifts right; the freed left column holds a large
rotating headline ("Gigler can …") that stays in lockstep with the conversation
playing on the phone. The floating glass annotations appear timed to the exact
message they comment on. Must remain responsive on mobile.

## Layout

- The existing centered `SectionHeader` stays on top. Its subtitle generalizes
  from the dinner-specific copy to: "Watch Gigler take a request from
  'can you?' to confirmed, start to finish."
- Below it, a two-column grid at `lg:` and up:
  - **Left column:** rotating headline block, vertically centered.
  - **Right column:** the phone (plus its floating annotations).
- Below `lg`: single column — headline block on top (centered), phone below.
  Annotations remain hidden below `lg` (current behavior).

## Left column: rotating headline + dot indicators

- An `h2` with a fixed first line **"Gigler can"** and a rotating second line:
  1. `book your dinner`
  2. `plan your trip`
  3. `make your calls`
  4. `handle your email`
- Phrase transition: slide-up crossfade (old phrase fades/slides out, new one
  in). CSS keyframes, consistent with the existing `rise-in`/`bubble-in`
  animation language.
- Under the headline: **iOS page-indicator dots** — small, lowkey, neutral
  (`bg-foreground/20`-ish); the active dot darker and slightly elongated
  (Apple home-screen style). Each dot is a `button` with an `aria-label`
  ("Show the dinner demo", etc.). Clicking a dot jumps to that scenario and
  restarts its conversation; auto-rotation continues from there.

## Data model

```ts
type Annotation = {
  afterStep: number;          // script index that triggers it
  side: "left" | "right";
  title: string;
  body: string;
};

type Scenario = {
  id: string;                 // "dinner" | "trip" | "calls" | "email"
  phrase: string;             // headline second line
  label: string;              // aria-label base for its dot
  script: Step[];             // same Step shape as today
  annotations: Annotation[];  // 1–2 per scenario
};
```

`Step` gains one new variant alongside `map`: an `email` card step (compact
"sent email" bubble, adapted from the UseCases email tile) used by the Email
scenario as its closing proof, the way Dinner closes with the map card.

## Component structure & sync

- **`DemoShowcase` (new, client):** owns the active-scenario index. Renders the
  headline block, the dots, and `IphoneDemo`. Single state machine — headline,
  dots, annotations, and conversation can never drift.
- **`IphoneDemo` (refactored):** receives the active `Scenario` and an
  `onComplete` callback. Keeps its internal step cursor, intersection-observer
  play/pause, and reduced-motion handling. Re-keyed by `scenario.id` so a
  scenario change resets the conversation cleanly.
- **Completion:** after the final step's `hold` elapses, `IphoneDemo` calls
  `onComplete`; `DemoShowcase` advances to the next scenario (wrapping).
- **Annotations:** rendered by `IphoneDemo` (they anchor to the phone frame).
  An annotation mounts with the existing bubble-in animation exactly when
  `cursor >= afterStep`. All annotations unmount on scenario change.

## The four scripts

Same voice and pacing values as the existing script (~8–10 steps each,
typing indicators between Gigler messages):

1. **Dinner** (`book your dinner`) — the existing Via Carota script, unchanged.
   - Annotation "It remembers" → fires on the "You loved Italian last month"
     message (left side).
   - Annotation "Reservation made" → fires on the map card (right side).
2. **Trip** (`plan your trip`) — condensed from the UseCases bento tile:
   user asks for a flight to NYC under $300 → Gigler: Delta nonstop $284,
   book it? → "Yes, and a hotel near SoHo" → flight booked, The Dominick
   $219/night → "Book it" → done, boarding pass Thursday, trip on calendar.
   - Annotation "One ask, whole trip" / "Flight, hotel, follow-ups. One
     thread." → fires on the "flight's booked + hotel" message (left side).
   - Annotation "On your calendar" / "Boarding pass, check-in, all of it." →
     fires on the closing message (right side).
3. **Calls** (`make your calls`) — "My internet bill jumped $30, can you deal
   with it?" → Gigler: "On it, calling them now." → "Done. They applied a
   credit and moved you to a cheaper plan — $42/mo starting next cycle."
   - Annotation "It makes the call" / "Waits on hold, talks to a human, texts
     you the result." → fires on the "calling them now" message (right side).
4. **Email** (`handle your email`) — kitchen-leak thread: user asks Gigler to
   get the landlord to fix the sink → Gigler drafts and sends → closing
   "sent email" card bubble (Kitchen leak repair request → Westside Property,
   "Sent" badge).
   - Annotation "Real emails, actually sent" / "Drafted, sent, and followed
     up for you." → fires on the email card (left side).

Each script ends with a long settle hold (~4–5s) before rotation, matching the
existing map step's 5200ms.

## Motion & accessibility

- **`prefers-reduced-motion`:** full conversation of the active scenario
  renders statically (no typing steps), no auto-rotation, headline static.
  Dots still switch scenarios instantly.
- **Off-screen:** the existing intersection observer keeps pausing playback
  when the section scrolls out of view.
- Dots are keyboard-focusable buttons with descriptive `aria-label`s; the
  rotating phrase region uses `aria-live="off"` (purely decorative rotation —
  screen readers shouldn't announce every swap).

## Out of scope

- No changes to MeshHero, UseCases, or any other section.
- No new dependencies; CSS animations only.

## Verification

Manual: run the dev server, watch all four scenarios complete a full loop with
synced headline/annotations, click dots mid-playback, check `lg` and mobile
breakpoints, and verify reduced-motion behavior via macOS accessibility
setting or DevTools emulation.
