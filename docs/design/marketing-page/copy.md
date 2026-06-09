# Copy

> Draft headlines, body copy, and CTAs. Written for the everyman — if a sentence
> needs a tech vocabulary to parse, rewrite it.

## Hero

### H1 — DECIDED

**"Text it. Call it. Email it. Done."**

(Chosen by Charles 2026-06-09. The channel trifecta with Apple cadence; the
subhead carries the literal explanation. Voice channel is represented here and
in the subhead — the use-case cards don't include a call scenario.)

### Subheadline — DECIDED

"Gigler texts, calls, and emails like a real person — it remembers your life
and actually gets things done. No app to download."

### CTA — DECIDED

**"Join the waitlist"** — button opens a frosted-glass modal (shadcn dialog)
with an email field. Prototype shows a success state; no backend wired yet.

## Section copy

### iPhone demo (section 2) — DECIDED scenario

**Dinner reservation**, one complete arc:
user: "Get us a table for 4 somewhere good Friday at 7" → Gigler proposes a
restaurant → user confirms → Gigler returns the confirmation (proof). Exact
bubble-by-bubble script lives with the component; keep it under ~6 bubbles.

### Use cases (section 3) — DECIDED picks

All three pass the chatbot-differentiation rule (see vision.md):

1. **It texts YOU first** — "Remind me to call Mom Sunday" → Sunday 4pm, Gigler
   nudges you. Proactivity.
2. **Works while you live** — ask at lunch; it hunts in the background and texts
   you the result at 3pm with proof. Async background work.
3. **Forward it an email** — forward the confusing insurance email, say "deal
   with this." It replies, schedules, follows up. Email channel.

Note: no call scenario in the cards (Charles's pick); voice is carried by the
H1 + subhead.

### How it works / Trust

Draft lines live in structure.md sections 4–5; finalize during build.

## Banned words

<!-- Words that must not appear on the page. Starting list: -->

agent, orchestration, LLM, model, AI-powered (as a crutch), platform, workflow,
infrastructure, API
