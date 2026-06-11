# Devpost Submission Copy — Google for Startups AI Agents Challenge

> Paste-ready copy for the Devpost form. Theme: **Optimize (Existing Agents)** · Region: **AMERS**
> Deadline: **June 11, 2026, 5:00 PM PDT** (internal target: submitted by 3:00 PM)

---

## Project Name

**Gigler Orca: AI Gig Orchestration for Completed Work**

## Tagline (~140 chars)

> Text a request, get completed work back. Gemini-powered agents that ship real deliverables over SMS and email — and get better every gig.

(137 characters)

---

## Project Description

### Inspiration

Nobody outside our industry wants to "operate an AI tool." They don't want to pick a model, learn a prompt style, or babysit a chat window. They want the bills for the ski trip tracked, the invite site live by Friday, the repo set up. So we built Gigler around the channels people already live in — SMS and email — and made the unit of work a **gig**: a request in, a finished deliverable out.

Gigler has been live at [gigler.ai](https://gigler.ai) for months. This challenge was our forcing function to do the unglamorous part: take an agent that worked impressively *most* of the time and engineer it into one that's reliable in production. That's the Track 2 story — treating AI quality as a rigorous engineering discipline, not a vibe.

### What it does

Text Gigler's number or email gig@gigler.ai with a request — "track the bills for our ski trip," "make an invite site for Friday," "set up a repo for X." Gigler:

1. **Classifies and routes** the request to one of eleven gig types (planning, coding, creative, scheduling, reservations, and more), each with its own system prompt and toolset.
2. **Executes with real tools** via Gemini native function calling: adding participants, setting reminders, generating images with Imagen 3, creating hosted deliverables, creating GitHub repos, extracting bills from receipt photos with Gemini Vision, and more.
3. **Delivers actual artifacts**: hosted bills dashboards, photo galleries, PDFs, and sites at OTP-gated `gigler.ai/{shortCode}` links; GitHub repos; smart contextual reminders.
4. **Coordinates groups**: Gigler joins group MMS threads via Twilio Conversations and knows when to speak and when to stay quiet.
5. **Checks its own work**: every draft reply and every proposed action passes through a **Quality Loop** before anything reaches the user — and the outcome of every gig feeds a learning store that makes the next gig better.

The point is not the conversation. The point is the completed gig.

### How we built it

**Stack**: Next.js 16 frontend on AWS Amplify Hosting (us-east-2), Amplify Gen 2 backend — Lambda, DynamoDB (10 tables, GSI-backed access patterns), S3 + CloudFront for deliverables, EventBridge for scheduling, Twilio for SMS/MMS/group threads, SES for email, all in TypeScript.

**The agent core** is `gigler-gig-processor`, a Lambda orchestrator built on Gemini:

- **Gemini 3.1 Pro** handles intent classification, gig routing, and execution with per-gig-type system prompts.
- **Native function calling** across 8 tools: `add_participant`, `set_reminder`, `generate_image` (Imagen 3), `create_deliverable`, `book_reservation`, `create_github_repo`, `create_collage`, `update_bill_status`.
- **Google Search grounding** for requests that need fresh facts.
- **Gemini Vision** processes inbound MMS photos — text a picture of a receipt and Gigler extracts the line items into the group's bills dashboard.
- **Gemini 2.5 Flash** powers smart reminders: an EventBridge schedule wakes a nudge engine that writes context-aware follow-ups instead of canned pings.

**The Quality Loop (the Track 2 work)**: we stress-tested our single-pass agent against real usage, catalogued the edge cases — overconfident replies, actions fired on ambiguous intent, tone misses in group threads — and engineered reliability in:

- A **Judge agent** (Gemini 2.5 Flash) reviews every draft reply *and every proposed action* before execution. It scores the draft, **revises weak replies**, and **vetoes unsafe actions** pre-execution. Fast, cheap, and in the hot path — not an offline eval.
- **Every verdict is logged per-gig** into a learning store: judge score, what was revised, what the user did next.
- That store is **injected as in-context memory** on the next gig — per-user preferences, winning prompt patterns per gig type, refined playbooks. No fine-tuning: pure in-context learning, so it's fast, cheap, and fully reversible.

**Testing**: 21 Vitest suites cover prompt construction, action parsing and validation, vision extraction, message deduplication, and nudge logic.

### Challenges we ran into

- **A single-pass agent is a demo; production needs a gate.** The hardest engineering call was putting the Judge in the synchronous path. Latency budgets forced us to Gemini 2.5 Flash for judging, with the heavyweight reasoning reserved for the worker.
- **Actions are scarier than words.** A bad sentence is embarrassing; a bad `book_reservation` or `create_github_repo` call is a side effect. We split the Judge's job: revise replies, but hard-veto actions.
- **Group threads are a different game.** An agent in a group MMS thread has to know when *not* to respond. Getting that restraint right took real prompt engineering and dedup logic, all under test.
- **SMS is an unforgiving medium.** No markdown, no retries, carrier filtering, 1600-char segments. Every output path had to be designed for it.

### Accomplishments we're proud of

- A live product, in production, with real deliverables behind real links — not a notebook.
- The Quality Loop runs on **every** message in production today, and we can show the judge verdicts in our CloudWatch logs.
- A learning loop with zero training infrastructure: signals captured at completion, memory injected at gig start.
- Vision-to-dashboard in one text: photo of a receipt in, itemized group bills dashboard out.

### What we learned

Reliability is a feature you build, not a property you hope for. The single biggest quality gain didn't come from a bigger model — it came from a small, fast model checking the big one's work, plus the discipline of logging every outcome and feeding it forward. In-context memory beats fine-tuning at our stage on every axis that matters: cost, speed, debuggability, reversibility.

### What's next

- **Voice via Gemini Live** — the same gigs, started and steered by a phone call.
- **Email-native agent identities** — per-gig email addresses (the Cloudflare email-for-agents pattern) so every gig has its own inbox: forward a confirmation email to the gig, CC the gig on a thread, and the agent has channel-level identity, not just a shared address. We see this as channel infrastructure for the agent economy.
- **Restaurant marketing automation** — our first vertical playbook built on the same orchestration core.
- **Graduating the learning store** — enough volume turns preference data into routing optimization.

### Why this is a business

People don't want to operate AI tools — they want outcomes. The market is moving from chat interfaces to agentic execution, and the winning interface for everyday users isn't a new app: it's the thread they already have open. Gigler meets users in SMS and email, charges for completed work (free and pro tiers), and has a structural compounding edge: **every completed gig writes memory that makes the next one better**. Group gigs are also our distribution — every participant in a bills split or event thread meets Gigler inside a gig that's already useful, and guest participants convert to users in place.

---

## Built With

```
gemini
imagen
google-search-grounding
typescript
nextjs
aws-lambda
dynamodb
amazon-s3
cloudfront
eventbridge
amazon-ses
aws-amplify
twilio
vitest
tailwindcss
github-api
```

## Links

- Live product: https://gigler.ai
- Code: https://github.com/supercodes1223/gigler
- Demo video: `{{YOUTUBE_UNLISTED_LINK}}` (see `submission-checklist.md`)

## Category Selections

- **Theme**: Optimize (Existing Agents)
- **Region**: AMERS
