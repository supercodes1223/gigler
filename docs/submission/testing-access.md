# Testing Access — Judge Instructions

> Paste-ready for the Devpost "testing instructions / access" field. Fill all `{{PLACEHOLDER}}` values before submitting — see `submission-checklist.md`.

---

## 1. Live product

**https://gigler.ai** — production deployment on AWS Amplify Hosting (us-east-2). The landing page shows how Gigler works, example gig categories, and pricing. No login required to browse.

## 2. View a sample deliverable

Every gig produces real, hosted artifacts at short links of the form `gigler.ai/{shortCode}`.

Sample deliverable for judges: **https://gigler.ai/{{SAMPLE_SHORTCODE}}**

- Deliverable links are **OTP-gated** (a one-time code is texted to gig participants) to protect user data.
- For judging we have prepared an open sample: `{{SAMPLE_SHORTCODE}}` is an event invite site generated end-to-end by the agent from a single SMS request (the same gig shown in the demo video). Access note: `{{SAMPLE_OTP_OR_NOTE_IF_UNGATED}}`.

## 3. Try the agent over SMS

The primary interface is SMS. Text the Gigler number:

**`{{GIGLER_PHONE_NUMBER}}`**

Suggested test flow (takes ~3 minutes):

1. Text: `Track the bills for our beach trip`
2. Gigler creates a gig, confirms, and asks who's in.
3. Text a photo of any receipt — Gemini Vision extracts line items.
4. Gigler replies with a link to a live bills dashboard at `gigler.ai/{shortCode}`.

Other things to try: `Make an invite site for a party on Friday`, `Set up a GitHub repo for a recipe app`, `Remind me to call the venue tomorrow at 9am`.

Notes:

- First-time numbers go through a short onboarding (Gigler asks your name).
- US/Canada numbers only (Twilio long code).
- Every reply you receive has already passed our Judge agent (the Quality Loop described in the submission) — this runs in production on every message.

## 4. Try the agent over email

Email **gig@gigler.ai** with a request in the subject or body. The agent routes the email to a gig and replies; attachments are processed (e.g., receipts, photos).

## 5. Code

Repository: **https://github.com/supercodes1223/gigler** (private — it runs our production
infrastructure; we grant read access to any judge same-day on request via **{{CONTACT_EMAIL}}**,
or see the code walkthrough in the demo materials).

Pointers for reviewers:

- Agent orchestrator: `amplify/functions/gigler-gig-processor/` (Gemini function calling, per-gig-type prompts, Quality Loop / Judge agent)
- Inbound routing ("main brain"): `amplify/functions/gigler-inbound-sms/`
- Smart reminders: `amplify/functions/gigler-reminder-scheduler/`
- Tests: 21 Vitest suites under `**/__tests__/` — `npm test`
- Architecture: `ARCHITECTURE.md`

## 6. Judge test access on request

If you'd like a provisioned test account (pre-created gig with sample data, dashboard login, or a dedicated test thread with the agent), contact us at **{{CONTACT_EMAIL}}** and we'll set it up same-day.

---

## Placeholders to fill before submission (tomorrow)

| Placeholder | What it is | Owner |
|---|---|---|
| `{{GIGLER_PHONE_NUMBER}}` | Public Twilio number for the agent | USER |
| `{{SAMPLE_SHORTCODE}}` | Short code of the judge-facing sample deliverable (create a fresh bills-split gig for this) | USER + AGENT |
| `{{SAMPLE_OTP_OR_NOTE_IF_UNGATED}}` | OTP for the sample, or note that the sample is ungated for judging | USER |
| `{{CONTACT_EMAIL}}` | Email judges can use to request access | USER |
