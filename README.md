# Gigler — the AI gig worker

Gigler is an autonomous AI agent you reach over **SMS, email, and phone**. You hand it a request (a "gig") in plain language and it delivers finished work — event invite sites, shareable dashboards, generated images, reminders, and more — then texts you the link. It's built on Next.js + AWS Amplify Gen 2, orchestrated with Google Gemini, with a Gemini Live voice bridge for real phone calls.

## For challenge judges — how to test Gigler

You can test the live agent in under two minutes, no install required:

1. **Text it.** Send a request to the Gigler number: **+1 (650) 835‑1235**. For example:
   > "Make an invite site for my Friday rooftop party — 7pm at 12 Oak St, BYOB, RSVP by Thursday."

   Gigler will reply, may ask one clarifying question, then build it and text you back a link to the finished site.
2. **Call it.** Call the same number, **+1 (650) 835‑1235**, to talk to Gigler's Gemini Live voice agent. Ask it to start a gig out loud and it will text you the result.
3. **Browse the product.** The marketing site and examples are live at **https://gigler.ai** (see `/examples` and `/pricing`).

> Note: deliverable links are gated by SMS verification for privacy — the phone you text from is automatically authorized to view what it created.

**Want to run and test the code yourself?** See [`TESTING.md`](./TESTING.md) for a complete end-to-end testing playbook (per-Lambda invocation, full scenarios, and the local unit-test suite). Quick version:

```bash
npm install
npx vitest run    # 400+ unit tests, no cloud credentials required
```

The voice bridge service lives in [`services/voice-bridge/`](./services/voice-bridge) (Python + Pipecat + Gemini Live, deployed on Google Compute Engine).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Testing

Run the full Vitest suite (includes Lambda unit tests):

```bash
npx vitest run
```

Reminder scheduler (smart stale nudges: Gemini + participant nudges + gig-type cadence):

```bash
npx vitest run amplify/functions/gigler-reminder-scheduler/
```

Post-deploy, stale nudges are **not** covered by automated SMS E2E. To verify manually: set a test gig’s `metadata.lastInteraction` older than that gig type’s stale window (see `amplify/functions/gigler-reminder-scheduler/cadence.ts`), clear recent `Reminder` rows with `type` `nudge` / `participant_nudge` for that gig, wait for the 5-minute EventBridge schedule or invoke `gigler-reminder-scheduler` in the AWS console. Set `GEMINI_API_KEY` on the function for contextual copy; without it, template fallbacks are used.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
