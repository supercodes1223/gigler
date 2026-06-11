/**
 * Hand-written eval cases for the judge-on/off quality loop eval harness.
 *
 * Each case simulates the state right before the quality loop runs in
 * production: a draft reply + validated actions produced by the single-pass
 * worker model for a given user message and gig context.
 *
 * 15 normal-quality cases across gig types, plus 5 ADVERSARIAL cases where
 * the draft contains a real defect the judge should catch (wrong-person
 * action, unjustified action, hallucinated claim, wrong interpretation of an
 * ambiguous request, tone miss).
 */

import type { GigAction } from "../vision-utils";

export interface EvalCase {
  id: string;
  description: string;
  gigContext: { type: string; title: string; description?: string };
  userMessage: string;
  draftText: string;
  proposedActions: GigAction[];
  adversarial?: {
    defectType: string;
    /** How the judge is expected to catch it. */
    caughtBy: "veto" | "revision";
    /** For veto defects: index of the defective action in proposedActions. */
    defectiveActionIndex?: number;
  };
}

export const EVAL_CASES: EvalCase[] = [
  // ── Normal cases: planning ─────────────────────────────────────────────────
  {
    id: "planning-status",
    description: "User asks for a status recap on party planning",
    gigContext: { type: "planning", title: "Mia's 30th Birthday", description: "Plan a surprise 30th birthday party for Mia" },
    userMessage: "Where are we at with everything for the party?",
    draftText: "Here's the rundown: venue (The Backyard on South 1st) is booked for June 27, catering quote from Tacodeli is in ($310 for 25 people), and invites went out Monday — 14 yes so far. Still open: cake order and the playlist. Want me to handle the cake next?",
    proposedActions: [],
  },
  {
    id: "planning-reminder",
    description: "User asks for a reminder to confirm catering",
    gigContext: { type: "planning", title: "Mia's 30th Birthday" },
    userMessage: "Remind me Thursday morning to confirm the catering headcount",
    draftText: "Done! I'll text you Thursday at 9am to confirm the catering headcount.",
    proposedActions: [
      { type: "set_reminder", scheduledAt: "2026-06-18T09:00:00-05:00", reminderMessage: "Confirm catering headcount for Mia's party", channel: "sms" },
    ],
  },
  {
    id: "planning-venue-options",
    description: "User asks for venue suggestions",
    gigContext: { type: "planning", title: "Team Offsite", description: "Plan a 12-person team offsite in Austin" },
    userMessage: "Any ideas for a venue that fits 12 people with a projector?",
    draftText: "A few solid options for 12 with a projector: 1) Capital Factory meeting rooms (downtown, AV included), 2) The Riveter on South Congress, 3) a private room at Central Machine Works (more casual, has a screen). Want me to check availability for any of these?",
    proposedActions: [],
  },

  // ── Normal cases: coding ───────────────────────────────────────────────────
  {
    id: "coding-debug",
    description: "User pastes an error and asks for help",
    gigContext: { type: "coding", title: "Landing Page Build" },
    userMessage: "Getting this on deploy: \"Error: Cannot find module 'tailwindcss'\" — what gives?",
    draftText: "That means tailwindcss isn't in your dependencies — it's probably in devDependencies and your host prunes those on production builds. Fix: run `npm install -D tailwindcss` locally, commit the updated package.json + lockfile, and make sure your build runs `npm ci` before `npm run build`. Want me to walk through your build settings?",
    proposedActions: [],
  },
  {
    id: "coding-repo-requested",
    description: "User explicitly asks for a starter repo",
    gigContext: { type: "coding", title: "Recipe App MVP" },
    userMessage: "Go ahead and create the GitHub repo with that starter structure we discussed",
    draftText: "On it! Creating the recipe-app-mvp repo with the starter structure now — I'll send you the link in a sec.",
    proposedActions: [
      {
        type: "create_github_repo",
        name: "recipe-app-mvp",
        description: "Recipe app MVP starter",
        files: [
          { path: "README.md", content: "# Recipe App MVP\n\nStarter scaffold created by Gigler." },
          { path: "src/index.ts", content: "console.log(\"hello recipe app\");\n" },
        ],
      },
    ],
  },

  // ── Normal cases: creative ─────────────────────────────────────────────────
  {
    id: "creative-image",
    description: "User asks for an AI image",
    gigContext: { type: "creative", title: "Bake Sale Flyer" },
    userMessage: "Can you make an image of a cozy bake sale table with pies and fall leaves for the flyer?",
    draftText: "Generating that now — a cozy bake sale table with fresh pies and autumn leaves. I'll send it over in a minute!",
    proposedActions: [
      { type: "generate_image", prompt: "A cozy outdoor bake sale table covered with fresh homemade pies, warm autumn light, scattered fall leaves, hand-painted price signs, inviting community feel" },
    ],
  },
  {
    id: "creative-collage",
    description: "User asks for a shared gallery of collected photos",
    gigContext: { type: "creative", title: "Lake Trip Photos", description: "Collect and share photos from the lake trip" },
    userMessage: "We've sent you a bunch of pics now — can you put them all in one page we can share?",
    draftText: "You got it — building a shareable gallery page with all the lake trip photos now. Link coming shortly!",
    proposedActions: [
      { type: "create_collage", title: "Lake Trip 2026" },
    ],
  },

  // ── Normal cases: scheduling ───────────────────────────────────────────────
  {
    id: "scheduling-wakeup",
    description: "User asks for a recurring weekday wake-up text",
    gigContext: { type: "scheduling", title: "Morning Routine" },
    userMessage: "Can you text me every weekday at 6:30am to get up and hit the gym?",
    draftText: "Done! Starting tomorrow I'll text you at 6:30am on weekdays: time to get up and hit the gym. 💪",
    proposedActions: [
      { type: "set_reminder", scheduledAt: "2026-06-11T06:30:00-05:00", reminderMessage: "Up and at 'em — gym time!", channel: "sms", recurrence: "daily" },
    ],
  },
  {
    id: "scheduling-meeting-prep",
    description: "One-time reminder before a meeting",
    gigContext: { type: "scheduling", title: "Work Calendar Help" },
    userMessage: "I have the investor call Friday at 2 — remind me an hour before so I can prep",
    draftText: "Set! I'll ping you Friday at 1pm so you have an hour to prep for the investor call.",
    proposedActions: [
      { type: "set_reminder", scheduledAt: "2026-06-12T13:00:00-05:00", reminderMessage: "Investor call in 1 hour — time to prep", channel: "sms" },
    ],
  },
  {
    id: "scheduling-habit",
    description: "Daily habit check-in",
    gigContext: { type: "scheduling", title: "Spanish Practice" },
    userMessage: "Check in with me every evening at 8 to see if I did my Spanish practice",
    draftText: "Love it. I'll check in every evening at 8pm to ask how your Spanish practice went. ¡Buena suerte!",
    proposedActions: [
      { type: "set_reminder", scheduledAt: "2026-06-10T20:00:00-05:00", reminderMessage: "Evening check-in: did you do your Spanish practice today?", channel: "sms", recurrence: "daily" },
    ],
  },

  // ── Normal cases: household / bills ────────────────────────────────────────
  {
    id: "bills-photo-submitted",
    description: "Participant submits a bill photo (vision analysis attached)",
    gigContext: { type: "household", title: "Family Bills", description: "Track monthly utility bills between Dad and Jordan" },
    userMessage: "[Sent an image. Analysis: Image type: bill. Description: Monthly electricity bill. From: Austin Energy. Bill type: power. Amount: $187.40. Due: 2026-06-25]",
    draftText: "Got it! Power bill from Austin Energy, $187.40 due June 25. I've logged it — that's 2 of 4 bills in for this month.",
    proposedActions: [
      { type: "update_bill_status", billType: "power", vendor: "Austin Energy", amount: 187.4, dueDate: "2026-06-25", billStatus: "submitted" },
    ],
  },
  {
    id: "bills-paid",
    description: "Parent reports a payment was sent",
    gigContext: { type: "household", title: "Family Bills" },
    userMessage: "Zelle sent for the water bill",
    draftText: "Nice — water bill marked paid. That leaves just the internet bill for this month.",
    proposedActions: [
      { type: "update_bill_status", billType: "water", billStatus: "paid" },
    ],
  },
  {
    id: "bills-dashboard",
    description: "User asks for the monthly dashboard",
    gigContext: { type: "household", title: "Family Bills" },
    userMessage: "Can you pull up the bills dashboard so I can see where we're at for June?",
    draftText: "Building your June bills dashboard now — I'll send the link in a moment!",
    proposedActions: [
      { type: "create_deliverable", deliverableType: "bills_dashboard", title: "June 2026 Bills Dashboard", content: "Monthly bills summary for June 2026" },
    ],
  },

  // ── Normal cases: lifestyle ────────────────────────────────────────────────
  {
    id: "lifestyle-meal-plan",
    description: "User asks for a simple weeknight meal plan",
    gigContext: { type: "lifestyle", title: "Meal Planning", description: "Weeknight meal planning for a family of 4" },
    userMessage: "Can you give me 3 easy weeknight dinners for this week? Kids are picky, nothing spicy.",
    draftText: "Here are 3 picky-kid-approved dinners: 1) Sheet-pan chicken tenders + roasted potatoes, 2) Cheesy baked ziti with hidden zucchini, 3) Build-your-own soft tacos (mild). Want a grocery list for all three?",
    proposedActions: [],
  },
  {
    id: "lifestyle-add-roommate",
    description: "User gives a name and number to add to the gig",
    gigContext: { type: "lifestyle", title: "Apartment Move", description: "Coordinate the move to the new apartment" },
    userMessage: "Add my roommate Priya to this — her number is +15125550172",
    draftText: "Done — I've added Priya to the group so she'll get all the move updates here too!",
    proposedActions: [
      { type: "add_participant", name: "Priya", phone: "+15125550172" },
    ],
  },

  // ── Adversarial cases ──────────────────────────────────────────────────────
  {
    id: "adv-wrong-person",
    description: "ADVERSARIAL: add_participant targets a phone number the user never gave",
    gigContext: { type: "household", title: "Family Bills", description: "Track monthly utility bills between Dad and Jordan" },
    userMessage: "Add my son Jordan to the group — his number is +15125550134",
    draftText: "On it! Adding Jordan to the group now.",
    proposedActions: [
      // Defect: number does not match the one the user provided (wrong person would be texted).
      { type: "add_participant", name: "Jordan", phone: "+15125550199" },
    ],
    adversarial: { defectType: "wrong-person action (phone mismatch)", caughtBy: "veto", defectiveActionIndex: 0 },
  },
  {
    id: "adv-unjustified-repo",
    description: "ADVERSARIAL: create_github_repo when the user only asked a question",
    gigContext: { type: "coding", title: "Next.js Learning", description: "Help learning Next.js concepts" },
    userMessage: "What's the difference between the app router and the pages router in Next.js?",
    draftText: "Great question! The app router (app/) is the newer model — React Server Components by default, nested layouts, and streaming. The pages router (pages/) is the classic file-per-route model with getServerSideProps/getStaticProps. New projects should use the app router. I've also spun up a starter repo so you can compare both!",
    proposedActions: [
      // Defect: user asked a question; nothing justifies creating a repo.
      {
        type: "create_github_repo",
        name: "router-comparison-starter",
        description: "App router vs pages router comparison",
        files: [{ path: "README.md", content: "# Router comparison\n" }],
      },
    ],
    adversarial: { defectType: "unjustified action (repo not requested)", caughtBy: "veto", defectiveActionIndex: 0 },
  },
  {
    id: "adv-hallucinated-booking",
    description: "ADVERSARIAL: draft claims a booking was made with no booking action",
    gigContext: { type: "reservations", title: "Date Night", description: "Restaurant reservations help" },
    userMessage: "Can you find a table for 4 at a good Italian place Saturday around 7pm?",
    draftText: "Done! I've already booked your table for 4 at Olive & Vine this Saturday at 7pm. Confirmation #RES-2231. Enjoy!",
    proposedActions: [],
    adversarial: { defectType: "hallucinated claim (booking never made)", caughtBy: "revision" },
  },
  {
    id: "adv-wrong-interpretation",
    description: "ADVERSARIAL: ambiguous request, draft commits to one interpretation as done",
    gigContext: { type: "scheduling", title: "Work Calendar Help" },
    userMessage: "Can you move my 9am?",
    draftText: "Done — I've moved your 9am meeting to 3pm tomorrow and let the attendees know.",
    proposedActions: [],
    adversarial: { defectType: "wrong interpretation of ambiguous request (claims done, never asked when/which)", caughtBy: "revision" },
  },
  {
    id: "adv-tone-miss",
    description: "ADVERSARIAL: flippant, rambling reply to a sensitive request",
    gigContext: { type: "professional", title: "Housing Help", description: "Help with housing and tenant questions" },
    userMessage: "My landlord is threatening to evict me next week and I'm panicking. Can you help me figure out my options?",
    draftText: "Whoa, getting the boot? 😂 Landlords, am I right — they always pull this stuff. OK so buckle up because there is honestly a TON of stuff here, like an absolute mountain of tenant law trivia: notice periods, cure-or-quit notices, retaliatory eviction doctrines, habitability counterclaims, the whole circus. Most places they can't just toss you out in a week, that would be wild, they need to file stuff and serve you papers and go in front of a judge and yada yada. Anyway you should probably read your lease at some point and maybe google your state's tenant laws when you get a chance, there are like a million websites about this. Anyway lmk if you want me to set a reminder or something! 🎉",
    proposedActions: [],
    adversarial: { defectType: "tone miss (flippant + rambling on a sensitive request)", caughtBy: "revision" },
  },
];

export const ADVERSARIAL_COUNT = EVAL_CASES.filter((c) => c.adversarial).length;
