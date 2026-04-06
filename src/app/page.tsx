import type { Metadata } from "next";
import Link from "next/link";
import SmsDemo from "@/components/SmsDemo";

export const metadata: Metadata = {
  title: "Gigler — No Downloads. No Dashboards. Just Text, and It Gets Done.",
  alternates: { canonical: "/" },
};

const PRICING_TIERS = [
  {
    name: "Free",
    subtitle: "Try Gigler",
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
    subtitle: "For everyday productivity",
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
    subtitle: "For growing teams",
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
] as const;

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-brand-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-foreground">
            Gigler
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link href="/about" className="text-brand-muted hover:text-foreground transition">
              About
            </Link>
            <Link href="/pricing" className="text-brand-muted hover:text-foreground transition">
              Pricing
            </Link>
            <Link href="/careers" className="text-brand-muted hover:text-foreground transition">
              Careers
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — Claude-style: text left, product window right */}
      <section className="pt-28 pb-20 px-6 min-h-[90vh] flex items-center">
        <div className="mx-auto max-w-6xl w-full grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
          <div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6 whitespace-nowrap">
              <span>Gig</span>
              <span className="rolodex-container" style={{ marginLeft: "0.25em" }}>
                <span className="rolodex-word" style={{ color: "#4285F4" }}>economy</span>
                <span className="rolodex-word" style={{ color: "#34A853" }}>coding</span>
                <span className="rolodex-word" style={{ color: "#EA4335" }}>planning</span>
                <span className="rolodex-word" style={{ color: "#F25022" }}>creative</span>
                <span className="rolodex-word" style={{ color: "#4285F4" }}>scheduling</span>
                <span className="rolodex-word" style={{ color: "#34A853" }}>lifestyle</span>
                <span className="rolodex-word" style={{ color: "#EA4335" }}>education</span>
                <span className="rolodex-word" style={{ color: "#F25022" }}>business</span>
                <span className="rolodex-word" style={{ color: "#4285F4" }}>reservations</span>
              </span>
            </h1>
            <p className="text-lg md:text-xl text-brand-muted leading-relaxed mb-8 max-w-lg">
              No downloads. No dashboards.
              <br />
              No learning new workflows.
              <br />
              <strong className="text-foreground">Just text, and it gets done.</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard"
                className="rounded-full bg-foreground px-8 py-3 text-base font-semibold text-background hover:bg-white transition text-center"
              >
                Get Started Free
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-brand-border px-8 py-3 text-base font-semibold text-foreground hover:bg-brand-surface transition text-center"
              >
                Learn More
              </Link>
            </div>
          </div>

          {/* Right: SMS demo product window */}
          <div className="hidden lg:block">
            <SmsDemo />
          </div>
        </div>
      </section>

      {/* Showcase — what Gigler does */}
      <section className="py-24 px-6 bg-brand-surface">
        <div className="mx-auto max-w-5xl text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            AI that actually does things.
          </h2>
          <p className="text-lg text-brand-muted max-w-2xl mx-auto">
            Plan events. Build websites. Form an LLC. Make reservations.
            Gigler handles it all — over text.
          </p>
        </div>

        <div className="mx-auto max-w-5xl grid md:grid-cols-3 gap-8">
          {[
            {
              icon: "💬",
              title: "Text it",
              description: "Tell Gigler what you need in plain English. No forms, no menus, no learning curve.",
            },
            {
              icon: "⚡",
              title: "It gets done",
              description: "AI manages your gig — coordinates, creates, reminds, and executes. No app needed.",
            },
            {
              icon: "📦",
              title: "Real output",
              description: "Get deliverables: live websites, PDFs, reservations, photo collages — all from a text thread.",
            },
          ].map((item) => (
            <div key={item.title} className="text-center p-8">
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-brand-muted leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What you can do — category pills */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            9 categories. Dozens of gig types.
          </h2>
          <p className="text-lg text-brand-muted mb-12">
            Everything starts with a text.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "💻 Coding & Tech",
              "🏢 Business Formation",
              "🎉 Event Planning",
              "🎨 Creative & AI Media",
              "📋 Professional",
              "⏰ Scheduling",
              "🏠 Lifestyle",
              "📚 Education",
              "🍽️ Reservations",
            ].map((cat) => (
              <span
                key={cat}
                className="px-5 py-2.5 rounded-full bg-brand-surface border border-brand-border text-sm font-medium text-brand-muted hover:text-foreground hover:border-foreground transition cursor-default"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* SMS Demo for mobile (below the fold) */}
      <section className="py-16 px-6 lg:hidden">
        <div className="mx-auto max-w-md">
          <h2 className="text-2xl font-bold text-center mb-8">See it in action</h2>
          <SmsDemo />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-brand-surface">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Simple pricing
          </h2>
          <p className="text-center text-brand-muted mb-16">
            Start free. Upgrade when you need more.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border p-8 flex flex-col ${
                  tier.highlight
                    ? "border-foreground ring-1 ring-foreground bg-background"
                    : "border-brand-border bg-background"
                }`}
              >
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <p className="text-sm text-brand-muted mt-1">{tier.subtitle}</p>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-brand-muted">{tier.period}</span>
                </div>
                <button
                  className={`w-full rounded-full py-3 font-semibold transition mb-8 ${
                    tier.highlight
                      ? "bg-foreground text-background hover:bg-white"
                      : "border border-brand-border text-foreground hover:bg-brand-surface-hover"
                  }`}
                >
                  {tier.cta}
                </button>
                <ul className="space-y-3 flex-1">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <svg
                        className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-brand-muted">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-brand-muted mt-8">
            Need more?{" "}
            <a href="mailto:sales@gigler.ai" className="text-foreground hover:text-white transition underline">
              Contact us for Enterprise pricing
            </a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to get things done?
          </h2>
          <p className="text-lg text-brand-muted mb-10">
            No downloads. No dashboards. Just text Gigler.
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-full bg-foreground px-10 py-4 text-lg font-semibold text-background hover:bg-white transition"
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
            <Link href="/about" className="hover:text-foreground transition">About</Link>
            <Link href="/pricing" className="hover:text-foreground transition">Pricing</Link>
            <Link href="/careers" className="hover:text-foreground transition">Careers</Link>
            <Link href="/dashboard" className="hover:text-foreground transition">Dashboard</Link>
          </div>
          <div className="text-sm text-brand-muted">gigler.ai</div>
        </div>
      </footer>
    </main>
  );
}
