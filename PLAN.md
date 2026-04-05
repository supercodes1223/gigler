---
name: Gigler Platform Architecture
overview: Architectural plan for Gigler -- an AI-powered gig platform where users create and manage projects/tasks conversationally over SMS, voice calls, and email. The AI executes gigs (coding, planning, creative, professional), coordinates group threads, generates deliverables with shareable URLs, and proactively checks in.
todos:
  - id: setup-repo
    content: Create new GitHub repo and initialize Amplify Gen 2 + Next.js project
    status: pending
  - id: data-model
    content: Define DynamoDB tables (User, Gig, GigParticipant, Message, Media, Reminder, Deliverable) in amplify/data/resource.ts
    status: pending
  - id: twilio-setup
    content: Provision Twilio number for Gigler and configure Conversations API + voice
    status: pending
  - id: inbound-sms
    content: Build gigler-inbound-sms Lambda (user identification, onboarding, gig routing, Gemini intent detection)
    status: pending
  - id: gig-processor
    content: Build gigler-gig-processor Lambda (AI execution engine for all gig types)
    status: pending
  - id: voice-bridge
    content: Set up Gigler voice bridge (Pipecat + Gemini Live) for wake-up calls, check-ins, and voice consultations
    status: pending
  - id: deliverable-system
    content: Build deliverable generation system (PDFs, menus, code projects) with public URLs at gigler.ai/gig/[id]
    status: pending
  - id: group-messaging
    content: Implement Twilio Conversations API for true group gig threads
    status: pending
  - id: reminder-scheduler
    content: Build EventBridge-triggered reminder/nudge system for proactive check-ins
    status: pending
  - id: web-landing
    content: Build landing page with brand voice (simple, non-pretentious, just done) and sign-up flow
    status: pending
  - id: web-dashboard
    content: Build user dashboard (gig list, gig detail, conversation history, media gallery, deliverables)
    status: pending
isProject: false
---

# Gigler Platform Architecture

## Brand

- **Name**: Gigler (Gig + doer)
- **Domain**: gigler.ai or giglerai.com
- **Voice**: Simple. Non-pretentious. Just done.
- **Hero tagline direction**: "All over text. Simple. Just done." -- the anti-app. No downloads, no dashboards required. Text it, it gets done.

## Concept

Gigler is an AI that lives in your text messages. You create **Gigs** -- projects, tasks, anything you need done -- by texting. The AI manages, coordinates, and actually executes the work. Gigs can be collaborative (true group threads). Gigler can also call you (wake-up calls, check-ins, voice consultations) and generates deliverables with shareable URLs (PDFs, menus, websites, code projects).

**What Gigler does (gig types):**

- **Coding / Tech**
  - Scaffold a full-stack web app and deploy it
  - Build a landing page for your business and get the live URL
  - Set up a database, API, and hosting
  - Debug code -- paste an error, get a fix
  - Create a GitHub repo with README, CI/CD, and boilerplate

- **Business Formation**
  - Form an LLC step-by-step (name search, articles of organization, EIN)
  - Open a business bank account (guided walkthrough)
  - Set up business email and domain
  - Draft an operating agreement
  - Register for state tax IDs

- **Event Planning**
  - Organize a graduation party (logistics, guest coordination, photo collection, memory collage)
  - Plan a wedding (vendor coordination, timeline, group thread with wedding party)
  - Coordinate a birthday party (invites, venue, cake, reminders)
  - Plan a road trip (itinerary, hotel bookings, group coordination)
  - Organize a family reunion (travel logistics, shared photo album, meal planning)

- **Creative / AI Media**
  - Generate AI images and send them directly in the text thread ("Make me an invite graphic for Austin's graduation")
  - Generate AI videos (short clips, animations, slideshows from photos)
  - Create a photo collage from event photos
  - Design a PDF flyer or invitation
  - Edit and enhance photos
  - Create voice notes and audio messages

- **Professional / Advisory**
  - Legal document review and drafting
  - Business consulting and strategy brainstorming
  - Contract negotiation guidance
  - Resume and cover letter writing
  - Mediation between parties (Gigler mediates in a group thread)

- **Scheduling / Productivity**
  - Daily reminders and to-do nudges
  - Morning wake-up calls with a briefing of your day
  - Calendar management ("Schedule dentist for next Tuesday")
  - Habit tracking ("Remind me to work out every day at 6am")
  - Meeting prep ("Brief me before my 2pm meeting with Sarah")

- **Lifestyle / Personal**
  - Meal planning and grocery lists
  - Moving to a new city (checklist: utilities, address change, movers)
  - Home renovation project management
  - Pet care reminders (vet appointments, medication, grooming)
  - Gift shopping ("Find a birthday gift for my wife, she likes hiking and cooking")

- **Education / Learning**
  - Study plan for an exam (scheduled reminders, topic breakdown)
  - Language practice (daily vocab over text)
  - Research assistant (find information, summarize articles, compile notes)
  - College application coordination (deadlines, essays, group thread with parents)
  - Tutoring sessions over voice call

- **Reservations / Third-Party Actions**
  - Make restaurant reservations via OpenTable or Resy
  - Create event pages on Evite and send invites
  - Book hotels, flights, or rentals
  - Order flowers, catering, or supplies from third-party services
  - RSVP tracking synced back into the gig thread

## Tech Stack

- **Amplify Gen 2** -- backend infrastructure, DynamoDB, Lambda, auth
- **Next.js** -- landing page + user dashboard
- **Twilio** -- SMS/MMS (Conversations API for group threads), voice calls
- **Google Gemini** -- AI engine for conversation, intent detection, gig execution
- **Pipecat + Gemini Live** -- real-time voice calls (wake-ups, consultations, check-ins)
- **AI Image/Video Generation** -- Google Imagen / Gemini image gen (or OpenAI DALL-E / Sora as fallback) for generating images and short videos directly in gig threads
- **Third-Party APIs** -- OpenTable / Resy (restaurant reservations), Evite (event creation and invites), and extensible to others (Yelp, DoorDash, Instacart, etc.)
- **DynamoDB** -- all data storage
- **AWS SES** -- outbound email notifications + **inbound email receiving** (`gig@gigler.ai` and `[shortCode]@gigler.ai`) via SES Receipt Rules routing to `gigler-email-handler` Lambda
- **S3** -- media storage (photos, files, generated deliverables, AI-generated images/videos)
- **EventBridge** -- scheduled reminders, wake-up calls, proactive check-ins
- **CloudFront** -- serve deliverable URLs (gigler.ai/gig/[id])

## Data Model (DynamoDB Tables)

### User
- `id` (PK), `phone` (GSI), `email` (GSI), `name`, `plan` (free/pro), `createdAt`, `onboardingComplete`, `preferences`, `timezone`
- Identified primarily by phone number

### Gig
- `id` (PK), `ownerId` (GSI), `title`, `description`, `type` (coding/planning/creative/professional/lifestyle), `status` (active/paused/completed/archived), `conversationSid` (Twilio Conversations ID), `twilioNumber`, `createdAt`, `completedAt`, `metadata` (JSON -- type-specific data like checklist items, deployment URLs, event dates)

### GigParticipant
- `gigId` (PK), `userId` (SK), `role` (owner/collaborator/viewer), `phone`, `name`, `joinedAt`, `invitedBy`
- GSI on `userId` to find all gigs a user participates in

### Message
- `gigId` (PK), `timestamp` (SK), `senderId`, `senderName`, `body`, `mediaUrls`, `messageType` (sms/mms/voice_note/system/ai), `direction` (inbound/outbound)

### Media
- `gigId` (PK), `mediaId` (SK), `s3Key`, `type` (photo/video/document/code/pdf/voice_note), `uploadedBy`, `caption`, `createdAt`

### Deliverable
- `gigId` (PK), `deliverableId` (SK), `type` (pdf/website/menu/collage/code_project), `title`, `s3Key`, `publicUrl`, `createdAt`, `expiresAt`
- Each deliverable gets a public URL like gigler.ai/d/[shortcode]

### Reminder
- `id` (PK), `gigId` (GSI), `userId`, `scheduledAt` (GSI for EventBridge polling), `type` (reminder/wake_up_call/check_in/countdown), `message`, `channel` (sms/voice), `recipients`, `sent`, `createdAt`

### ThirdPartyAction
- `id` (PK), `gigId` (GSI), `userId`, `platform` (opentable/resy/evite/etc.), `actionType` (reservation/event_create/invite_send), `status` (pending/confirmed/cancelled/failed), `requestPayload` (JSON of what was requested), `responsePayload` (JSON of confirmation details), `externalId` (booking ID, event URL, etc.), `createdAt`, `confirmedAt`

### UserIntegration
- `id` (PK), `userId` (GSI), `platform` (opentable/resy/evite/google/etc.), `oauthToken` (encrypted), `refreshToken` (encrypted), `expiresAt`, `scopes`, `createdAt`

## Core Lambda Functions

### 1. `gigler-inbound-sms` (the main brain)

Pattern: mirrors [`amplify/functions/sales-onboarding-sms/handler.ts`](amplify/functions/sales-onboarding-sms/handler.ts)

```
Inbound SMS/MMS --> Identify User (by phone, GSI lookup)
  --> New user? --> Onboarding flow (create account, welcome message)
  --> Existing user?
    --> Is this a gig thread? (match by Twilio Conversation SID)
      --> Yes --> Route to gigler-gig-processor with gig context
      --> No (main Gigler number) --> Intent detection:
          - "Create a gig..." --> Create gig, start Conversation
          - "List my gigs" --> Return active gigs
          - "Resume [gig name]" --> Switch to gig context
          - General question --> Respond as general assistant
```

### 2. `gigler-gig-processor`

The AI execution engine. Receives a message + gig context, uses Gemini to understand and act:

- **All gig types**: Gemini gets the full conversation history + gig metadata as context
- **Planning gigs**: Manages checklists, coordinates participants, sets reminders, collects photos
- **Coding gigs**: Generates code, calls GitHub/Vercel APIs, deploys, returns deliverable URLs
- **Creative gigs**: Triggers image generation, PDF creation, collage assembly
- **Professional gigs**: Provides advice, drafts documents, creates deliverable PDFs
- **Lifecycle**: AI can mark questions as answered, suggest next steps, proactively check in

### 3. `gigler-voice-bridge`

Reuses the Pipecat + Gemini Live pattern from Carmen AI ([`services/voice-bridge`](services/voice-bridge)):

- **Wake-up calls**: EventBridge triggers at scheduled time, Lambda initiates Twilio call, voice bridge connects with Gemini Live
- **Check-in calls**: "Hey John, just checking in on the graduation planning. Did Sabrina confirm the hotel?"
- **Voice consultations**: User requests a call, Gigler calls them and they talk through a gig
- **Voice notes**: Gigler can send voice messages via MMS (TTS from Gemini response)

### 4. `gigler-deliverable-generator`

Creates tangible outputs and hosts them at public URLs:

- **PDFs**: Event itineraries, legal documents, business plans (generated via a PDF library like `pdf-lib`)
- **Menus/Pages**: Simple web pages hosted on S3 + CloudFront (like DishRoll-style menu pages)
- **Code projects**: Scaffold and deploy to Vercel/Amplify, return the live URL
- **Photo collages**: Aggregate photos from a gig, generate a collage page at gigler.ai/d/[id]
- **Short URLs**: Each deliverable gets a human-friendly URL like gigler.ai/d/abc123

### 5. `gigler-reminder-scheduler`

EventBridge-triggered Lambda that runs on a schedule (every 5-15 min):

- Queries Reminder table for due items
- Sends SMS reminders or initiates voice calls (wake-ups)
- Event countdowns ("Austin's graduation is tomorrow! Here's the plan...")
- Proactive check-ins on stale gigs ("Hey, haven't heard from you on the website project in 3 days. Need anything?")

### 6. `gigler-media-processor`

Handles inbound media from MMS and AI-generated media:

- Downloads media from Twilio URLs, stores in S3
- Tags media by gig
- For photo-collection gigs: aggregates all photos, can trigger collage generation
- For code gigs: processes screenshots, mockups
- **AI Image Generation**: When a user requests an image ("Make me an invite graphic for the party"), calls Gemini Imagen / DALL-E to generate the image, stores it in S3, and sends it back in the gig thread via MMS
- **AI Video Generation**: Short clips, slideshows from collected gig photos, animated graphics -- generated and sent via MMS or as a shareable link in the thread

### 8. `gigler-third-party-actions`

Executes actions on external platforms on behalf of users:

- **OpenTable / Resy**: Search for restaurants, check availability, make reservations. Confirmation details are posted back into the gig thread
- **Evite**: Create event pages, customize invitations, send invites to guest lists, track RSVPs. RSVP updates are synced back to the gig thread
- **Extensible pattern**: Each third-party integration follows a standard adapter interface (search, action, confirm) so new integrations (DoorDash, Instacart, Uber, etc.) can be added without changing the core gig processor
- **User authorization**: For platforms requiring login, Gigler stores OAuth tokens per user (encrypted in DynamoDB) or uses a service account where allowed
- **Confirmation loop**: After every third-party action, Gigler confirms with the user in the text thread before finalizing ("I found a table at Uchi for 8 people at 7pm on Saturday. Want me to book it?")

### 7. `gigler-email-handler`

Inbound email processing via `gig@gigler.ai`:

- **Universal gig inbox**: Anything emailed to `gig@gigler.ai` is automatically added to the user's active gig thread (matched by sender's email to their account)
- **Per-gig email**: Each gig can also have a unique email like `sk23k@gigler.ai` (using the short code) for gig-specific routing
- **Forward anything**: Forward a hotel confirmation, a receipt, a document -- Gigler adds it to the gig and notifies the group thread via SMS ("Sabrina just shared a hotel confirmation via email")
- **AI extraction**: Gigler reads the email and extracts relevant info (dates, addresses, confirmation numbers, attachments) and summarizes it in the text thread
- **Attachments**: PDFs, images, and documents from emails are stored in S3 and linked to the gig's media gallery

## Group Messaging Architecture

**Twilio Conversations API** -- not raw group MMS

- True multi-party threads with persistent history
- Works across SMS, MMS, WhatsApp, and web chat
- Gigler AI is a participant in every conversation
- Each gig gets its own Conversation
- Supports media sharing natively
- No 10-participant limit (unlike group MMS)

Flow:
```
John: "Add Sabrina 555-123-4567 to this gig"
  --> Lambda: detect "add participant" intent, extract phone
  --> Create GigParticipant record
  --> Add Sabrina's phone to Twilio Conversation
  --> Gigler sends in thread: "Hi Sabrina! John invited you to:
      'Organize Austin's graduation party'
      I'll be helping complete all the tasks and coordinate everything.
      Text here anytime! You can create a different Gig anytime at Gigler.ai"
  --> All future messages in this thread are visible to everyone
```

## Onboarding Flows (Three Paths)

### Path 1: Direct SMS
```
User texts Gigler: "Hey"
  --> No user found
  --> "Welcome to Gigler! Lets create your first Gig.
       What's your name?"
  --> "John"
  --> "Hey John! To start your first Gig, just tell me what you need.
       Anything goes:
       - 'Plan a birthday party for next Saturday'
       - 'Build me a website for my business'
       - 'Remind me to call mom every Sunday at 10am'
       What can I help with?"
```

### Path 2: Website
```
gigler.ai --> Sign up (email + phone) --> SMS verification
  --> Welcome SMS: "Hey John! Gigler here. Text me anytime to
       create a Gig. Or check your dashboard at gigler.ai/dashboard"
```

### Path 3: Guest-to-User (viral path -- most new users will come from here)

When someone is added to a gig but has no Gigler account, they participate as a **guest** with full access -- no sign-up friction.

```
John: "Add Sabrina 555-123-4567 to this gig"
  --> Sabrina has no Gigler account
  --> GigParticipant created with isGuest: true, phone only
  --> Sabrina receives in group thread:
      "Hi Sabrina! John invited you to:
       'Organize Austin's graduation party'
       I'll be helping complete all the tasks and coordinate everything.
       Text here anytime! You can create a different Gig anytime at Gigler.ai"
  --> Sabrina participates fully: texting, photos, reminders, everything
  --> No sign-up wall. Zero friction.
```

Conversion triggers (soft prompts, never blocking):
- **Gig completes**: "Hey Sabrina! That was a great gig. Want your own Gigler? Reply with your name to get started, or 'SKIP' for now."
- **Sabrina texts main Gigler number directly** (not the gig thread): "Hey! I see you were part of John's gig. Want to set up your own Gigler account? What's your name?"
- **Sabrina tries to create a gig in the group thread**: "Love the initiative! To create your own gig, just text me at [main Gigler number] or reply with your name to get set up right now."

Guests have full access within gig threads they're invited to. The only thing they can't do is create their own gigs -- that requires an account.

## Pricing Tiers (modeled after Claude.ai)

### Free -- $0
- 5 active gigs at a time
- SMS only (no voice calls)
- Basic AI responses (rate-limited Gemini)
- 1 deliverable per gig
- No group gigs (single-user only)
- Gigler branding on deliverable pages

### Pro -- $20/month
- Unlimited active gigs
- Voice calls (wake-up calls, check-ins, consultations)
- Full Gemini AI (no rate limits)
- Unlimited deliverables
- Group gigs (up to 5 participants per gig)
- No branding on deliverable pages
- Priority AI response time

### Team -- $50/month (up to 10 users)
- Everything in Pro
- Group gigs with up to 20 participants
- Shared gig workspace across team members
- Team admin dashboard
- Usage analytics

### Enterprise -- custom pricing
- Unlimited everything
- SSO, audit logs, compliance
- Custom integrations
- Dedicated support

**Implementation**: `plan` field on User table (free/pro/team/enterprise). Lambda checks plan before executing premium features (voice calls, group adds, deliverable generation). Stripe for billing, managed via web dashboard settings page.

## Viral Growth Loop

Gigler has a built-in viral mechanism through group gigs:

```
John (Pro user) creates gig --> adds Sabrina (not a Gigler user)
  --> Sabrina gets SMS: "Hi Sabrina! John invited you to:
      'Organize Austin's graduation party'
      I'll be helping complete all the tasks and coordinate everything.
      Text here anytime! You can create a different Gig anytime at Gigler.ai"
  --> Sabrina participates in the gig thread for free (as a guest)
  --> After the gig, Sabrina gets: "Hey Sabrina! You were part of a great
      Gig. Want your own Gigler? Text 'JOIN' to start free."
  --> Sabrina signs up --> creates her own gigs --> invites her friends
```

Key viral mechanics:
- Every group gig exposes new people to Gigler organically
- Guests participate for free (no friction) but see the value firsthand
- Post-gig CTA converts guests to users
- The more useful the gig was, the higher the conversion
- Each new user invites more people to their gigs --> exponential loop

**Guest model**: Non-users can participate in group gigs as guests (identified by phone only, no account). They get a `GigParticipant` record with `userId: null` and `isGuest: true`. After the gig, they get a conversion nudge.

## Gig Review Pages (short URLs)

Pattern: mirrors the DishRoll catering proposal review page ([`app/tenant/templates/catering-proposal/[id]/page.tsx`](app/tenant/templates/catering-proposal/[id]/page.tsx))

Every gig gets a **public review page** at a short URL like `gigler.ai/sk23k`:

- **For planning gigs**: Shows event details, checklist, participant list, photo gallery, timeline
- **For coding gigs**: Shows project overview, live site link, tech stack, code repo
- **For creative gigs**: Photo collage, generated assets, downloadable files
- **For professional gigs**: Summary of advice, generated documents, action items

The review page is:
- Generated/updated as the gig progresses (AI builds it incrementally)
- Shareable -- anyone with the link can view (read-only)
- Interactive -- gig owner can chat with AI on the page to refine (like the catering proposal page has an AI chat sidebar)
- Has an AI chat widget where the owner can say "change the hero image" or "add a section about parking"

**Short URL system**: `Deliverable` table gets a `shortCode` field (6-char alphanumeric). Route: `gigler.ai/[shortCode]` resolves to the gig review page. Reserved paths (`/dashboard`, `/settings`, `/pricing`, `/login`, `/signup`, `/api`) are excluded from short code generation to avoid collisions.

## Web Dashboard (Next.js)

- **Landing page**: Hero with brand voice, pricing tiers, product demo, sign-up
- **Gig examples page** (gigler.ai/examples): Categorized showcase of everything Gigler can do, with real example conversations and deliverables. Primary SEO content page targeting long-tail keywords like "AI that plans birthday parties", "form LLC over text", "AI coding assistant SMS", etc. Each category gets its own section with anchor links.
- **Dashboard**: Active gigs (cards with status, last message, participant count)
- **Gig detail**: Full conversation thread, media gallery, deliverables, participant list, reminders
- **Gig review page**: Public shareable page at gigler.ai/[shortCode] with AI chat
- **Deliverable viewer**: Hosted pages for PDFs, collages, menus, code project links
- **Settings**: Profile, phone, timezone, notification preferences, billing/plan management
- **Billing**: Stripe integration, plan upgrade/downgrade, usage dashboard

## SEO and Meta (World-Class)

Every public-facing page must have best-in-class SEO from day one:

- **Favicon**: Custom Gigler icon in all formats (ico, png 16/32/180/192/512, SVG, apple-touch-icon)
- **Meta tags**: title, description, keywords, canonical URL, robots
- **Open Graph**: og:title, og:description, og:image, og:url, og:type for rich link previews on social/iMessage/SMS
- **Twitter Card**: twitter:card, twitter:title, twitter:description, twitter:image
- **Structured data**: JSON-LD for Organization, WebApplication, and Product schemas
- **Sitemap**: Auto-generated sitemap.xml with all public pages and gig review pages
- **robots.txt**: Proper crawl directives
- **Performance**: Core Web Vitals optimized (LCP, CLS, INP) -- Next.js Image, font optimization, lazy loading
- **Semantic HTML**: Proper heading hierarchy, landmarks, alt text
- **Dynamic OG images**: Gig review pages (gigler.ai/[shortCode]) generate custom OG images so shared links look great in iMessage, Slack, Twitter, etc.

Pages that need SEO:
- Landing page (gigler.ai) -- primary SEO target, keywords: "AI assistant", "gig work", "text AI", "SMS assistant"
- Gig examples page (gigler.ai/examples) -- long-form content page showcasing all gig categories with example conversations. Targets long-tail keywords: "AI event planner", "form LLC over text", "AI coding over SMS", "AI wedding planner", "AI business consultant", "AI wake-up call", "AI study planner". Each category section can also be a standalone page (gigler.ai/examples/business, gigler.ai/examples/planning, etc.) for deeper SEO.
- Pricing page (gigler.ai/pricing)
- Gig review pages (gigler.ai/[shortCode]) -- each gets unique title/description/OG image based on gig content

## What Carries Over from Carmen AI

- Inbound SMS processing pattern (`sales-onboarding-sms/handler.ts` --> `gigler-inbound-sms`)
- Gemini intent detection (`extractInfoFromMessage()` --> gig intent classifier)
- Twilio send/receive (`sendSms()`, webhook handling --> same pattern)
- DynamoDB CRUD (`UpdateCommand`, `QueryCommand` --> same pattern)
- Conversation history (`fetchConversationHistory()` --> per-gig message history)
- Scheduled nudges (`sales-onboarding-nudge` --> `gigler-reminder-scheduler`)
- Email processing (`google-review-email-processor` --> `gigler-email-handler`)
- Voice bridge (`services/voice-bridge` Pipecat + Gemini Live --> `gigler-voice-bridge`)
- SES notifications (alert emails --> gig notifications)
- Unknown SMS handling (`handleUnknownInboundSms()` --> new user onboarding)

## MVP Build Order

1. **Project scaffold**: Amplify Gen 2 + Next.js repo, DynamoDB schema, Twilio number
2. **Core SMS loop**: Inbound SMS --> user lookup --> Gemini response (single-user, no gigs yet)
3. **User accounts**: Create/identify users by phone, SMS + web onboarding
4. **Gig CRUD**: Create gigs from natural language, list gigs, switch between gigs
5. **Voice calls**: Wake-up calls, check-ins, voice consultations via Pipecat + Gemini Live
6. **Deliverable URLs**: PDF generation, hosted pages at gigler.ai/d/[id], link sent via SMS
7. **Group gigs**: Twilio Conversations for multi-participant threads
8. **Reminders and check-ins**: EventBridge scheduler, proactive nudges, countdowns
9. **Media handling**: Photo collection via MMS, collage generation
10. **Web dashboard**: Gig list, conversation view, deliverable viewer, settings
11. **Technical gigs**: GitHub/Vercel integration for code projects
12. **Landing page**: Product marketing with brand voice

