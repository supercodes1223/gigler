import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const CATEGORY_DATA: Record<
  string,
  {
    title: string;
    icon: string;
    description: string;
    longDescription: string;
    examples: Array<{ title: string; conversation: Array<{ from: string; text: string }> }>;
    seoTitle: string;
    seoDescription: string;
    keywords: string[];
  }
> = {
  coding: {
    title: "Coding & Tech",
    icon: "💻",
    description: "Build, deploy, and debug — all from a text message.",
    longDescription:
      "Gigler can scaffold full-stack applications, deploy them to the cloud, set up databases and APIs, debug code, and create GitHub repos with CI/CD — all from a simple text conversation. Send Gigler your requirements, and it builds. Paste an error, and it fixes.",
    seoTitle: "AI Coding Assistant Over Text — Build & Deploy Apps via SMS",
    seoDescription:
      "Scaffold web apps, deploy to Vercel, debug code, and create GitHub repos — all by texting Gigler AI. No IDE required.",
    keywords: ["AI coding assistant", "deploy app over text", "AI debugging", "SMS coding"],
    examples: [
      {
        title: "Deploy a Landing Page",
        conversation: [
          { from: "user", text: "Build me a landing page for my coffee shop" },
          { from: "gigler", text: "On it! What's the shop name and any must-haves? (menu, hours, location, online ordering?)" },
          { from: "user", text: "Drip & Co. Menu, hours, and a map to our Austin location" },
          { from: "gigler", text: "Building your landing page now... I'll have a live URL for you in a few minutes." },
        ],
      },
    ],
  },
  business: {
    title: "Business Formation",
    icon: "🏢",
    description: "Form an LLC, get your EIN, set up email — guided step-by-step.",
    longDescription:
      "Gigler walks you through forming a business entity over text. From name availability searches to articles of organization, EIN applications, operating agreements, and state tax registrations — each step delivered as a text conversation.",
    seoTitle: "Form an LLC Over Text — AI Business Formation Assistant",
    seoDescription:
      "Form an LLC, draft operating agreements, get an EIN, and set up business infrastructure — all by texting Gigler AI.",
    keywords: ["form LLC over text", "AI business assistant", "LLC formation AI", "start a business AI"],
    examples: [
      {
        title: "Form an LLC",
        conversation: [
          { from: "user", text: "I want to form an LLC for my consulting business in Texas" },
          { from: "gigler", text: "Let's do it! Step 1: Name search. What name are you thinking? I'll check if it's available with the TX Secretary of State." },
          { from: "user", text: "Apex Strategy Group LLC" },
          { from: "gigler", text: "Checking availability... ✅ \"Apex Strategy Group LLC\" is available in Texas! Ready for Step 2: filing the Certificate of Formation?" },
        ],
      },
    ],
  },
  planning: {
    title: "Event Planning",
    icon: "🎉",
    description: "Plan events with group coordination, invites, and reminders.",
    longDescription:
      "From graduation parties to weddings and family reunions, Gigler coordinates everything over text. Add participants to a group thread, manage guest lists, send invites via Evite, track RSVPs, set reminders, and collect photos — all in one text conversation.",
    seoTitle: "AI Event Planner Over Text — Plan Parties, Weddings & More via SMS",
    seoDescription:
      "Plan graduation parties, weddings, birthday parties, road trips, and reunions by texting Gigler AI. Group coordination, invites, and reminders included.",
    keywords: ["AI event planner", "plan party over text", "AI wedding planner", "SMS event coordination"],
    examples: [
      {
        title: "Graduation Party",
        conversation: [
          { from: "user", text: "Plan Austin's graduation party for June 14, backyard, 40 people, $2000 budget" },
          { from: "gigler", text: "I created a gig: \"Austin's Graduation Party\" 🎓\n\nHere's your starter plan:\n📋 Catering for 40 ($800-1000)\n🎵 Speaker/playlist\n📸 Photo area + collage page\n🎂 Cake ($80-150)\n✉️ Evite invitations\n\nWant me to start on invites? Who should I add to the planning thread?" },
        ],
      },
    ],
  },
  creative: {
    title: "Creative & AI Media",
    icon: "🎨",
    description: "Generate images, videos, collages, and flyers with AI.",
    longDescription:
      "Gigler generates AI images, short videos, photo collages, and PDF designs directly in your text thread. Request an invite graphic, a promotional flyer, or a video slideshow — Gigler creates it and sends it right back via MMS.",
    seoTitle: "AI Image & Video Generation Over Text — Creative Media via SMS",
    seoDescription:
      "Generate AI images, videos, photo collages, and PDF flyers by texting Gigler. Get creative media delivered right to your phone.",
    keywords: ["AI image generation text", "AI video generation SMS", "creative AI assistant"],
    examples: [
      {
        title: "Event Invite Graphic",
        conversation: [
          { from: "user", text: "Make me an invite graphic for Austin's graduation party — navy and gold theme, June 14" },
          { from: "gigler", text: "Generating your invite graphic... Here's a navy & gold design with the date and details. Want any changes?" },
        ],
      },
    ],
  },
  professional: {
    title: "Professional & Advisory",
    icon: "📋",
    description: "Legal review, business consulting, resume writing, and more.",
    longDescription:
      "Gigler provides expert-level AI advice over text. Review legal documents, brainstorm business strategy, get contract negotiation guidance, write resumes and cover letters, or even mediate between parties in a group text thread.",
    seoTitle: "AI Professional Advisor Over Text — Legal, Business & Career via SMS",
    seoDescription:
      "Get legal document review, business consulting, contract guidance, and resume writing by texting Gigler AI.",
    keywords: ["AI legal assistant", "AI business consultant text", "AI resume writer SMS"],
    examples: [
      {
        title: "Contract Review",
        conversation: [
          { from: "user", text: "Review this freelance contract for me (forwarded email with PDF)" },
          { from: "gigler", text: "I've reviewed the contract. Key points:\n\n⚠️ Section 4: IP clause assigns ALL work to the client, including pre-existing IP\n✅ Payment terms: Net 30 — standard\n⚠️ Non-compete: 2 years, overly broad\n\nI'd recommend negotiating the IP clause and non-compete. Want me to draft alternative language?" },
        ],
      },
    ],
  },
  scheduling: {
    title: "Scheduling & Productivity",
    icon: "⏰",
    description: "Reminders, wake-up calls, habit tracking, and calendar management.",
    longDescription:
      "Gigler manages your schedule over text. Set daily reminders, get morning wake-up calls with your day's briefing, track habits with daily check-ins, manage your calendar, and get prepped before meetings — all via text and voice.",
    seoTitle: "AI Scheduling Assistant Over Text — Reminders, Wake-Up Calls & Habits",
    seoDescription:
      "Daily reminders, morning wake-up calls, habit tracking, and calendar management — all by texting Gigler AI.",
    keywords: ["AI reminder assistant", "AI wake-up call", "habit tracker text", "AI calendar manager"],
    examples: [
      {
        title: "Morning Wake-Up Calls",
        conversation: [
          { from: "user", text: "Give me a wake-up call every weekday at 6:30am with my day's schedule" },
          { from: "gigler", text: "Done! You'll get a wake-up call every weekday at 6:30am. I'll brief you on your schedule, weather, and any gig updates. Sweet dreams!" },
        ],
      },
    ],
  },
  lifestyle: {
    title: "Lifestyle & Personal",
    icon: "🏠",
    description: "Meal planning, moving checklists, pet care, and gift shopping.",
    longDescription:
      "Gigler helps with life's logistics over text. Plan meals and generate grocery lists, manage a move to a new city, track home renovation projects, set pet care reminders, and find personalized gift recommendations.",
    seoTitle: "AI Personal Assistant Over Text — Meal Plans, Moving, Gifts & More",
    seoDescription:
      "Meal planning, moving checklists, home renovation management, pet reminders, and gift shopping — all by texting Gigler AI.",
    keywords: ["AI personal assistant text", "meal planner SMS", "AI moving assistant", "gift finder AI"],
    examples: [
      {
        title: "Meal Planning",
        conversation: [
          { from: "user", text: "Plan meals for this week, 2 people, we like Mediterranean food, budget $120" },
          { from: "gigler", text: "Here's your Mediterranean week:\n\n🍽️ Mon: Shakshuka + pita\n🍽️ Tue: Greek chicken bowls\n🍽️ Wed: Lemon herb salmon\n🍽️ Thu: Falafel wraps\n🍽️ Fri: Pasta alla Norma\n🍽️ Sat: Lamb kofta\n🍽️ Sun: Leftovers night\n\nWant the grocery list? Estimated total: ~$105" },
        ],
      },
    ],
  },
  education: {
    title: "Education & Learning",
    icon: "📚",
    description: "Study plans, language practice, research, and tutoring.",
    longDescription:
      "Gigler helps you learn over text. Create structured study plans with scheduled reminders, practice languages with daily vocab drills, use AI as a research assistant, coordinate college applications with parents in a group thread, and do tutoring over voice calls.",
    seoTitle: "AI Study & Learning Assistant Over Text — Exam Prep, Language, Research",
    seoDescription:
      "Study plans, language practice, research assistance, and tutoring — all by texting Gigler AI.",
    keywords: ["AI study assistant", "AI tutor text", "language learning SMS", "AI research assistant"],
    examples: [
      {
        title: "Bar Exam Study Plan",
        conversation: [
          { from: "user", text: "Create a study plan for the bar exam, I have 10 weeks" },
          { from: "gigler", text: "Your 10-week bar prep plan:\n\nWeeks 1-3: Core subjects (Civ Pro, Contracts, Torts)\nWeeks 4-6: MBE-heavy subjects (Con Law, Evidence, Crim)\nWeeks 7-8: Full practice exams\nWeeks 9-10: Weak areas + review\n\nI'll send daily reminders with your topic for the day. Starting Monday?" },
        ],
      },
    ],
  },
  reservations: {
    title: "Reservations & Bookings",
    icon: "🍽️",
    description: "Restaurant reservations, event pages, hotel and flight bookings.",
    longDescription:
      "Gigler books things for you over text. Make restaurant reservations on OpenTable or Resy, create Evite event pages, book hotels and flights, order catering and supplies, and track RSVPs — with confirmation in your text thread before anything is finalized.",
    seoTitle: "AI Booking Assistant Over Text — Restaurants, Hotels, Events & More",
    seoDescription:
      "Restaurant reservations, Evite events, hotel bookings, and catering orders — all by texting Gigler AI. Confirmation before every action.",
    keywords: ["AI reservation assistant", "book restaurant text", "AI booking SMS", "Evite AI"],
    examples: [
      {
        title: "Restaurant Reservation",
        conversation: [
          { from: "user", text: "Make a reservation at Uchi for 8 people Saturday at 7pm" },
          { from: "gigler", text: "Searching OpenTable for Uchi, Saturday, 8 people, 7pm...\n\n✅ Found availability!\n📍 Uchi Austin\n📅 Saturday, 7:00 PM\n👥 Party of 8\n\nWant me to book it?" },
          { from: "user", text: "Yes!" },
          { from: "gigler", text: "Booked! ✅ Confirmation #UCH-84729\n\nUchi Austin\nSaturday at 7:00 PM, party of 8\n\nI'll send a reminder Saturday at 5pm." },
        ],
      },
    ],
  },
};

const VALID_CATEGORIES = Object.keys(CATEGORY_DATA);

interface PageProps {
  params: Promise<{ category: string }>;
}

export async function generateStaticParams() {
  return VALID_CATEGORIES.map((category) => ({ category }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category } = await params;
  const data = CATEGORY_DATA[category];
  if (!data) return {};
  return {
    title: data.seoTitle,
    description: data.seoDescription,
    keywords: data.keywords,
    alternates: { canonical: `/examples/${category}` },
    openGraph: {
      title: data.seoTitle,
      description: data.seoDescription,
      url: `/examples/${category}`,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const data = CATEGORY_DATA[category];
  if (!data) notFound();

  return (
    <main className="flex-1 pt-24">
      <div className="mx-auto max-w-3xl px-6 pb-24">
        <Link
          href="/examples"
          className="text-sm text-brand-muted hover:text-foreground transition mb-8 inline-block"
        >
          ← All Examples
        </Link>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{data.icon}</span>
          <h1 className="text-3xl font-bold">{data.title}</h1>
        </div>
        <p className="text-brand-muted mb-8">{data.longDescription}</p>

        <div className="space-y-12">
          {data.examples.map((ex, i) => (
            <section key={i}>
              <h2 className="text-xl font-semibold mb-4">
                Example: {ex.title}
              </h2>
              <div className="space-y-3">
                {ex.conversation.map((msg, j) => (
                  <div
                    key={j}
                    className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line ${
                        msg.from === "user"
                          ? "bg-brand-primary text-white rounded-br-sm"
                          : "bg-brand-surface border border-brand-border rounded-bl-sm"
                      }`}
                    >
                      {msg.from === "gigler" && (
                        <span className="block text-xs font-medium text-brand-primary mb-1">
                          Gigler
                        </span>
                      )}
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
