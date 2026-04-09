This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
