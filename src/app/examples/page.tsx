import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gig Examples — Everything Gigler Can Do",
  description:
    "Explore 9 categories and 46+ examples of what Gigler AI can do over text: event planning, coding, business formation, creative media, reservations, and more.",
  alternates: { canonical: "/examples" },
  openGraph: {
    title: "Gig Examples — Everything Gigler Can Do",
    description:
      "From planning weddings to deploying websites — all over text. See what Gigler can do.",
    url: "/examples",
  },
};

const CATEGORIES = [
  {
    slug: "coding",
    title: "Coding & Tech",
    icon: "💻",
    description:
      "Scaffold apps, deploy websites, set up databases, debug code, create GitHub repos — all from a text message.",
    examples: [
      "Scaffold a full-stack web app and deploy it",
      "Build a landing page for your business and get the live URL",
      "Set up a database, API, and hosting",
      "Debug code — paste an error, get a fix",
      "Create a GitHub repo with README, CI/CD, and boilerplate",
    ],
  },
  {
    slug: "business",
    title: "Business Formation",
    icon: "🏢",
    description:
      "Form an LLC, open a bank account, set up business email, draft agreements — guided step-by-step over text.",
    examples: [
      "Form an LLC step-by-step (name search, articles of organization, EIN)",
      "Open a business bank account (guided walkthrough)",
      "Set up business email and domain",
      "Draft an operating agreement",
      "Register for state tax IDs",
    ],
  },
  {
    slug: "planning",
    title: "Event Planning",
    icon: "🎉",
    description:
      "Plan parties, weddings, road trips, family reunions — with group coordination, invites, reminders, and photo collection.",
    examples: [
      "Organize a graduation party (logistics, guest coordination, photo collection)",
      "Plan a wedding (vendor coordination, timeline, group thread with wedding party)",
      "Coordinate a birthday party (invites, venue, cake, reminders)",
      "Plan a road trip (itinerary, hotel bookings, group coordination)",
      "Organize a family reunion (travel, shared photo album, meal planning)",
    ],
  },
  {
    slug: "creative",
    title: "Creative & AI Media",
    icon: "🎨",
    description:
      "Generate AI images and videos, create photo collages, design PDF flyers, edit photos — delivered right in your text thread.",
    examples: [
      "Generate AI images directly in the text thread",
      "Generate AI videos (clips, animations, slideshows)",
      "Create a photo collage from event photos",
      "Design a PDF flyer or invitation",
      "Edit and enhance photos",
    ],
  },
  {
    slug: "professional",
    title: "Professional & Advisory",
    icon: "📋",
    description:
      "Legal review, business consulting, contract guidance, resume writing, group mediation — expert AI advice over text.",
    examples: [
      "Legal document review and drafting",
      "Business consulting and strategy brainstorming",
      "Contract negotiation guidance",
      "Resume and cover letter writing",
      "Mediation between parties in a group thread",
    ],
  },
  {
    slug: "scheduling",
    title: "Scheduling & Productivity",
    icon: "⏰",
    description:
      "Daily reminders, wake-up calls, calendar management, habit tracking, meeting prep — your AI productivity partner.",
    examples: [
      "Daily reminders and to-do nudges",
      "Morning wake-up calls with a briefing of your day",
      "Calendar management over text",
      "Habit tracking with daily check-ins",
      "Meeting prep briefings before your calls",
    ],
  },
  {
    slug: "lifestyle",
    title: "Lifestyle & Personal",
    icon: "🏠",
    description:
      "Meal planning, moving checklists, home renovation management, pet care reminders, gift shopping — personal AI assistant.",
    examples: [
      "Meal planning and grocery lists",
      "Moving to a new city (utilities, address change, movers)",
      "Home renovation project management",
      "Pet care reminders (vet, medication, grooming)",
      "Gift shopping with personalized recommendations",
    ],
  },
  {
    slug: "education",
    title: "Education & Learning",
    icon: "📚",
    description:
      "Study plans, language practice, research assistance, college app coordination, tutoring calls — learn over text.",
    examples: [
      "Study plan for an exam (scheduled reminders, topic breakdown)",
      "Language practice (daily vocab over text)",
      "Research assistant (find info, summarize, compile notes)",
      "College application coordination (deadlines, essays, group thread)",
      "Tutoring sessions over voice call",
    ],
  },
  {
    slug: "reservations",
    title: "Reservations & Bookings",
    icon: "🍽️",
    description:
      "Restaurant reservations, Evite events, hotel and flight bookings, catering orders, RSVP tracking — all confirmed in your text thread.",
    examples: [
      "Make restaurant reservations via OpenTable or Resy",
      "Create event pages on Evite and send invites",
      "Book hotels, flights, or rentals",
      "Order flowers, catering, or supplies",
      "RSVP tracking synced back into the gig thread",
    ],
  },
] as const;

export default function ExamplesPage() {
  return (
    <main className="flex-1 pt-24">
      <div className="mx-auto max-w-5xl px-6 pb-24">
        <h1 className="text-4xl font-bold mb-4">Everything Gigler Can Do</h1>
        <p className="text-lg text-brand-muted mb-12 max-w-2xl">
          9 categories. 46+ gig types. All managed over text by AI.
        </p>

        {/* Quick nav */}
        <nav className="flex flex-wrap gap-2 mb-16" aria-label="Category navigation">
          {CATEGORIES.map((cat) => (
            <a
              key={cat.slug}
              href={`#${cat.slug}`}
              className="rounded-full border border-brand-border px-4 py-1.5 text-sm hover:bg-brand-surface transition"
            >
              {cat.icon} {cat.title}
            </a>
          ))}
        </nav>

        {/* Category sections */}
        <div className="space-y-20">
          {CATEGORIES.map((cat) => (
            <section key={cat.slug} id={cat.slug}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{cat.icon}</span>
                <h2 className="text-2xl font-bold">{cat.title}</h2>
              </div>
              <p className="text-brand-muted mb-6 max-w-2xl">
                {cat.description}
              </p>
              <ul className="grid sm:grid-cols-2 gap-3 mb-4">
                {cat.examples.map((ex, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-brand-border p-4"
                  >
                    <span className="text-brand-primary font-bold">→</span>
                    <span className="text-sm">{ex}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/examples/${cat.slug}`}
                className="text-sm text-brand-primary font-medium hover:underline"
              >
                See {cat.title.toLowerCase()} examples in detail →
              </Link>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
