import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Gigler - AI That Lives in Your Texts | All Over Text. Simple. Just Done.",
  alternates: { canonical: "/" },
};

const GIG_CATEGORIES = [
  {
    title: "Coding & Tech",
    icon: "💻",
    examples: [
      "Build me a landing page and deploy it",
      "Set up a database, API, and hosting",
      "Debug this error — paste it, get a fix",
    ],
  },
  {
    title: "Business Formation",
    icon: "🏢",
    examples: [
      "Form an LLC step-by-step",
      "Set up business email and domain",
      "Draft an operating agreement",
    ],
  },
  {
    title: "Event Planning",
    icon: "🎉",
    examples: [
      "Organize a graduation party",
      "Plan a wedding with group coordination",
      "Coordinate a birthday party with invites and reminders",
    ],
  },
  {
    title: "Creative & AI Media",
    icon: "🎨",
    examples: [
      "Generate an AI invite graphic for the party",
      "Create a photo collage from event photos",
      "Design a PDF flyer",
    ],
  },
  {
    title: "Professional & Advisory",
    icon: "📋",
    examples: [
      "Legal document review",
      "Business consulting and strategy",
      "Resume and cover letter writing",
    ],
  },
  {
    title: "Scheduling & Productivity",
    icon: "⏰",
    examples: [
      "Daily reminders and to-do nudges",
      "Morning wake-up calls with your day's briefing",
      "Habit tracking over text",
    ],
  },
  {
    title: "Lifestyle & Personal",
    icon: "🏠",
    examples: [
      "Meal planning and grocery lists",
      "Moving-to-a-new-city checklist",
      "Gift shopping recommendations",
    ],
  },
  {
    title: "Education & Learning",
    icon: "📚",
    examples: [
      "Study plan for an exam with reminders",
      "Daily language practice over text",
      "Research assistant — find info, compile notes",
    ],
  },
  {
    title: "Reservations & Bookings",
    icon: "🍽️",
    examples: [
      "Make a restaurant reservation on OpenTable",
      "Create an Evite event and send invites",
      "Book hotels, flights, or rentals",
    ],
  },
] as const;

const PRICING_TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    features: [
      "5 active gigs",
      "SMS only",
      "Basic AI responses",
      "1 deliverable per gig",
    ],
    cta: "Get Started Free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$20",
    period: "/month",
    features: [
      "Unlimited active gigs",
      "Voice calls (wake-ups, check-ins)",
      "Full Gemini AI",
      "Unlimited deliverables",
      "Group gigs (up to 5 people)",
      "No branding on deliverables",
    ],
    cta: "Go Pro",
    highlight: true,
  },
  {
    name: "Team",
    price: "$50",
    period: "/month",
    features: [
      "Everything in Pro",
      "Up to 10 users",
      "Group gigs (up to 20 people)",
      "Shared workspace",
      "Team admin dashboard",
      "Usage analytics",
    ],
    cta: "Start Team",
    highlight: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Unlimited everything",
      "SSO & audit logs",
      "Custom integrations",
      "Dedicated support",
    ],
    cta: "Contact Us",
    highlight: false,
  },
] as const;

function HowItWorks() {
  const steps = [
    {
      step: "1",
      title: "Text Gigler",
      description: "Tell Gigler what you need done. \"Plan a birthday party\" or \"Build me a website.\"",
    },
    {
      step: "2",
      title: "Gigler Gets to Work",
      description: "AI manages your gig — coordinates, creates, reminds, and executes. No app needed.",
    },
    {
      step: "3",
      title: "Done. Delivered.",
      description: "Get results: live websites, PDFs, reservations, photo collages — all from a text thread.",
    },
  ];
  return (
    <section id="how-it-works" className="py-24 bg-brand-surface">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-3xl font-bold text-center mb-16">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white text-xl font-bold">
                {s.step}
              </div>
              <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
              <p className="text-brand-muted">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DemoConversation() {
  const messages = [
    { from: "user", text: "Plan Austin's graduation party for June 14" },
    {
      from: "gigler",
      text: "On it! I created a gig: \"Austin's Graduation Party\"\n\nHere's what I'll need:\n- Venue (backyard, restaurant, hall?)\n- Guest count estimate\n- Budget range\n\nLet's start with the venue — any ideas?",
    },
    { from: "user", text: "Backyard, about 40 people, $2000 budget" },
    {
      from: "gigler",
      text: "Great setup! Here's your plan:\n✅ Venue: Your backyard\n📋 Catering for 40 ($800-1000)\n🎵 Speaker/playlist setup\n📸 Photo area + collage page\n🎂 Cake ($80-150)\n\nWant me to start on the Evite invitations? I can create a page and send them out.",
    },
    { from: "user", text: "Yes! Add Sabrina 555-123-4567 to help coordinate" },
    {
      from: "gigler",
      text: "Done! Sabrina's been added to the gig thread. She'll get a welcome message.\n\nI'm creating the Evite now — I'll share a preview in a minute.",
    },
  ];

  return (
    <section className="py-24">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="text-3xl font-bold text-center mb-4">
          See It in Action
        </h2>
        <p className="text-center text-brand-muted mb-12">
          A real conversation with Gigler — event planning over text.
        </p>
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-line ${
                  m.from === "user"
                    ? "bg-brand-primary text-white rounded-br-sm"
                    : "bg-brand-surface text-foreground border border-brand-border rounded-bl-sm"
                }`}
              >
                {m.from === "gigler" && (
                  <span className="block text-xs font-medium text-brand-primary mb-1">
                    Gigler
                  </span>
                )}
                {m.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-brand-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-brand-primary">
            Gigler
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link href="#how-it-works" className="text-brand-muted hover:text-foreground transition">
              How It Works
            </Link>
            <Link href="/examples" className="text-brand-muted hover:text-foreground transition">
              Examples
            </Link>
            <Link href="/pricing" className="text-brand-muted hover:text-foreground transition">
              Pricing
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-brand-primary px-4 py-2 text-white font-medium hover:bg-brand-primary-hover transition"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
            All over text.{" "}
            <span className="text-brand-primary">Simple.</span>{" "}
            <span className="text-brand-secondary">Just done.</span>
          </h1>
          <p className="text-xl text-brand-muted max-w-2xl mx-auto mb-10">
            Gigler is an AI that lives in your text messages. Create{" "}
            <strong>Gigs</strong> — projects, tasks, anything you need done —
            by texting. No app. No dashboard. Just text it, it gets done.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-lg bg-brand-primary px-8 py-3 text-lg font-semibold text-white hover:bg-brand-primary-hover transition shadow-lg shadow-brand-primary/25"
            >
              Get Started Free
            </Link>
            <Link
              href="/examples"
              className="rounded-lg border border-brand-border px-8 py-3 text-lg font-semibold text-foreground hover:bg-brand-surface transition"
            >
              See Examples
            </Link>
          </div>
          <p className="mt-6 text-sm text-brand-muted">
            The anti-app. No downloads required.
          </p>
        </div>
      </section>

      <HowItWorks />
      <DemoConversation />

      {/* Gig Categories */}
      <section className="py-24 bg-brand-surface">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold text-center mb-4">
            9 Categories. 46+ Gig Types.
          </h2>
          <p className="text-center text-brand-muted mb-16 max-w-2xl mx-auto">
            From coding projects to wedding planning, Gigler handles it all
            over text.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {GIG_CATEGORIES.map((cat) => (
              <div
                key={cat.title}
                className="rounded-xl border border-brand-border bg-white p-6 hover:shadow-lg transition"
              >
                <div className="text-3xl mb-3">{cat.icon}</div>
                <h3 className="text-lg font-semibold mb-3">{cat.title}</h3>
                <ul className="space-y-2">
                  {cat.examples.map((ex, i) => (
                    <li
                      key={i}
                      className="text-sm text-brand-muted flex items-start gap-2"
                    >
                      <span className="text-brand-primary mt-0.5">→</span>
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/examples"
              className="text-brand-primary font-medium hover:underline"
            >
              See all examples →
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-bold text-center mb-4">
            Simple Pricing
          </h2>
          <p className="text-center text-brand-muted mb-16">
            Start free. Upgrade when you need more.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl border p-6 flex flex-col ${
                  tier.highlight
                    ? "border-brand-primary shadow-lg shadow-brand-primary/10 ring-2 ring-brand-primary"
                    : "border-brand-border"
                }`}
              >
                {tier.highlight && (
                  <span className="text-xs font-semibold text-brand-primary uppercase tracking-wide mb-2">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <div className="mt-2 mb-6">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-brand-muted">{tier.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full rounded-lg py-2.5 font-medium transition ${
                    tier.highlight
                      ? "bg-brand-primary text-white hover:bg-brand-primary-hover"
                      : "border border-brand-border hover:bg-brand-surface"
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-brand-primary text-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to get things done?
          </h2>
          <p className="text-lg opacity-90 mb-10">
            Text Gigler. Create a Gig. Watch it happen.
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-lg bg-white px-8 py-3 text-lg font-semibold text-brand-primary hover:bg-gray-100 transition"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-brand-border">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-brand-muted">
            &copy; {new Date().getFullYear()} Gigler. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-brand-muted">
            <Link href="/examples" className="hover:text-foreground transition">
              Examples
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition">
              Pricing
            </Link>
            <Link href="/dashboard" className="hover:text-foreground transition">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
