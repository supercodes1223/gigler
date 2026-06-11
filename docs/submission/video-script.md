# Demo Video Script — 2:30, Google for Startups AI Agents Challenge

> Target runtime: **2:30** (hard cap 3:00). One complete gig, request → deliverable, with the Quality Loop as the Track-2 proof point. Founder voiceover: conversational, confident, no hype.
>
> Demo gig: **bills split for a ski trip**, started by SMS, with a receipt photo, ending on the live bills dashboard.

---

## Timed beats

### Beat 1 — The problem (0:00–0:15)

**VOICEOVER:**
> "Everyone has access to AI now. Almost nobody wants to operate it. Picking models, writing prompts, managing the work — that's a job. People don't want a job. They want the thing done."

**ON SCREEN:**
- Quick montage: a crowded grid of AI tool logos / tabs → hard cut to a plain iPhone Messages thread.
- Text overlay: *"People don't want AI tools. They want outcomes."*

### Beat 2 — Introduce Gigler (0:15–0:40)

**VOICEOVER:**
> "This is Gigler. It's live at gigler.ai. You text it — or email it — a request, like you'd text a capable friend. Gigler turns that into a gig: a Gemini-powered agent classifies it, picks the right playbook and tools, does the work, and sends back a finished deliverable. Not a chat transcript. The actual work."

**ON SCREEN:**
- gigler.ai landing page, slow scroll (hero → how it works).
- Cut to the Messages app: contact "Gigler" at the top.
- Text overlay: *"SMS in. Completed work out."*

### Beat 3 — The gig, live (0:40–1:40)

**VOICEOVER (paced over the screen recording):**
> "Here's a real one. I text: 'track the bills for our ski trip.' Gigler spins up a gig, adds the group, and asks for the receipts."
>
> "I text it a photo of a receipt. Gemini Vision reads it — line items, amounts, who paid — no forms, no app."
>
> "And here's the part this challenge is about. Before any reply or action reaches me, it passes a Judge — a second Gemini agent that scores the draft, rewrites weak replies, and vetoes unsafe actions before they execute. We stress-tested our single-pass agent, found the edge cases, and engineered the reliability in."
>
> "Seconds later: a link. That's a live bills dashboard, hosted at a gigler.ai short link, gated with a one-time code, updating as the group texts in more receipts."

**ON SCREEN (in order):**
1. (0:40) Real SMS thread: user sends *"track the bills for our ski trip"* → Gigler's reply creating the gig.
2. (0:55) User texts a **photo of a real receipt** → Gigler replies with the extracted items and amounts.
3. (1:10) **Architecture diagram with the Quality Loop highlighted** (draft → Judge → revise/veto → deliver; outcomes → learning store → next gig's context). Hold 8–10 seconds.
4. (1:20) **CloudWatch log line of a judge verdict** — the production-reliability proof shot. Zoom into the JSON: score, verdict, revision note. Overlay: *"Runs on every message, in production."*
5. (1:30) Tap the link in the SMS thread → the live **gigler.ai bills dashboard** renders: itemized bills, totals, who-owes-who.

### Beat 4 — Deliverable + business case (1:40–2:15)

**VOICEOVER:**
> "Everyone in that group thread just used an AI agent without installing anything or learning anything. That's the business: Gigler meets people in the channels they already use, and charges for completed work, not seats in a chat app."
>
> "And every finished gig writes memory — judge scores, what users accepted, what they came back for — that gets injected into the next gig's context. No fine-tuning. The product literally gets better every time someone uses it."

**ON SCREEN:**
- Dashboard again, then a quick flash of other real deliverables: photo gallery link, generated invite site, a GitHub repo created by the agent.
- Simple loop graphic: *gig completed → signals logged → memory injected → next gig better.*

### Beat 5 — Close (2:15–2:30)

**VOICEOVER:**
> "Gigler. Text a request. Get completed work back. Live today at gigler.ai."

**ON SCREEN:**
- Landing page hero, URL on screen: **gigler.ai**.
- End card: project title + "Built on Gemini" + theme: Optimize (Existing Agents).

---

## Shot-list checklist (record these before editing)

- [ ] Screen recording: gigler.ai landing page scroll (desktop, clean browser profile, no bookmarks bar)
- [ ] Phone screen recording: full SMS thread — gig creation message + Gigler reply (use a **fresh test number** so onboarding doesn't appear, or trim it)
- [ ] Phone screen recording: sending the receipt photo + Gigler's extraction reply
- [ ] Have a real paper receipt ready (legible, 4–6 line items) and good lighting for the photo
- [ ] Phone screen recording: tapping the short link → OTP screen → bills dashboard
- [ ] Desktop capture: the bills dashboard at `gigler.ai/{shortCode}` (wide shot for Beat 4)
- [ ] Architecture diagram export with the Quality Loop visually highlighted (from `architecture/gigler-orca-tech-diagram.html` or the mermaid in `docs/gigler-self-improvement.md`) — PNG, 1920px+
- [ ] CloudWatch screenshot: one judge-verdict log line, zoomed/cropped so the JSON is readable — **redact phone numbers, user IDs, and any PII**
- [ ] Quick captures of secondary deliverables: a photo gallery link, an invite site, an agent-created GitHub repo
- [ ] Voiceover recorded in a quiet room (script above is ~310 words ≈ 2:05 at conversational pace — leaves room for breathing)
- [ ] Background music: low, neutral, ducked under VO (optional — silence is fine)
- [ ] Export: 1080p minimum, MP4, under 3:00
- [ ] Watch it once on a phone speaker before uploading

## Recording notes

- Do a **dry run of the full gig first** so the demo take is smooth and Gigler's replies are warm-cache fast.
- Don't show the real Gigler number on screen if we don't want it public — blur or crop the contact header.
- The Judge/CloudWatch shot is the single most important Track-2 frame. If short on time, cut B-roll, never this.
