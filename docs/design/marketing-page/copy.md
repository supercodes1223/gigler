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

### Use cases (section 3) — DECIDED picks (rev. 2: action-forward bento)

Layout: **bento grid, Stripe.com-inspired** — one large hero tile + two stacked
tiles. Every tile must show Gigler *taking action* a chatbot can't, with an
explicit ask-→-approve-→-done arc where possible ("Should I book it for you
now?" → "Booked ✓").

1. **It books it (large tile)** — "Find me a flight to NYC under $300 next
   Friday" → "Found you this one — Delta nonstop, $284, lands 9:40 AM. Should I
   book it for you now?" → "Yes" → "Booked ✓ confirmation's in your email."
   Async background work + real action + confirm-first, in one arc.
2. **It thinks ahead** — replaces the old reminder card. Gigler texts first
   *with the move already planned*: "Mom's birthday is Thursday. Want me to
   send the peonies she liked? $45, arrives Wednesday." → "yes" → "Ordered ✓".
   Proactivity with action attached, not a bare reminder.
3. **Forward it an email** — forward the confusing insurance email, say "deal
   with this." It replies, schedules, follows up. Email channel.

Note: no call scenario in the cards (Charles's pick); voice is carried by the
H1 + subhead. The confirm-before-acting beat in tiles 1–2 doubles as trust
messaging and matches the product's confirm-first policy.

### How it works / Trust

Draft lines live in structure.md sections 4–5; finalize during build.

## Banned words

<!-- Words that must not appear on the page. Starting list: -->

agent, orchestration, LLM, model, AI-powered (as a crutch), platform, workflow,
infrastructure, API
