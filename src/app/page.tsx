import type { Metadata } from "next";
import Link from "next/link";
import GigShowcase from "@/components/GigShowcase";

export const metadata: Metadata = {
  title: "Gigler — No Downloads. No Dashboards. Just Text, and It Gets Done.",
  alternates: { canonical: "/" },
};

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
];

const OPEN_ROLES = [
  {
    title: "AI / ML Engineer",
    description:
      "Build the Gemini-powered brain that understands natural language and executes gigs.",
  },
  {
    title: "Full-Stack Engineer",
    description:
      "Lambda, DynamoDB, Next.js — ship the infrastructure that powers millions of texts.",
  },
  {
    title: "Product Designer",
    description:
      "Design the simplest AI experience ever: no UI, just text.",
  },
];

export default function HomePage() {
  return (
    <main className="flex-1 bg-background text-foreground">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full bg-[#0a0a0b]/80 backdrop-blur-md border-b border-brand-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-brand-primary">
            Gigler
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link
              href="#how-it-works"
              className="text-brand-muted hover:text-foreground transition"
            >
              How It Works
            </Link>
            <Link
              href="#about"
              className="text-brand-muted hover:text-foreground transition"
            >
              About
            </Link>
            <Link
              href="#pricing"
              className="text-brand-muted hover:text-foreground transition"
            >
              Pricing
            </Link>
            <Link
              href="#careers"
              className="text-brand-muted hover:text-foreground transition"
            >
              Careers
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

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6 bg-background">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6">
            <span className="text-brand-primary">Gigler.</span>{" "}
            <span className="whitespace-nowrap">
              Gig +{" "}
              <span className="rolodex-container text-brand-secondary">
                <span className="rolodex-word">economy</span>
                <span className="rolodex-word">coding</span>
                <span className="rolodex-word">planning</span>
                <span className="rolodex-word">creative</span>
                <span className="rolodex-word">scheduling</span>
                <span className="rolodex-word">lifestyle</span>
                <span className="rolodex-word">education</span>
                <span className="rolodex-word">business</span>
                <span className="rolodex-word">reservations</span>
              </span>
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-brand-muted max-w-2xl mx-auto mb-10 leading-relaxed">
            No downloads. No dashboards. No learning new workflows.
            <br className="hidden sm:block" />
            <strong className="text-foreground">
              Just text, and it gets done.
            </strong>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-lg bg-brand-primary px-8 py-3 text-lg font-semibold text-white hover:bg-brand-primary-hover transition shadow-lg shadow-brand-primary/25"
            >
              Get Started Free
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-lg border border-brand-border px-8 py-3 text-lg font-semibold text-foreground hover:bg-brand-surface transition"
            >
              See How It Works
            </Link>
          </div>
          <p className="mt-8 text-sm text-brand-muted">
            AI that lives in your text messages.
          </p>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-brand-surface">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white text-xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Text Gigler</h3>
              <p className="text-brand-muted">
                Tell Gigler what you need. &ldquo;Plan a birthday party&rdquo;
                or &ldquo;Build me a website.&rdquo;
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white text-xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Gigler Gets to Work
              </h3>
              <p className="text-brand-muted">
                AI manages your gig&mdash;coordinates, creates, reminds,
                executes. No app needed.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white text-xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Done. Delivered.</h3>
              <p className="text-brand-muted">
                Get results: live websites, PDFs, reservations, photo
                collages&mdash;all from a text thread.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Gig Categories (Rivian-style tabs + cards) ──────────────────── */}
      <GigShowcase />

      {/* ── About ───────────────────────────────────────────────────────── */}
      <section id="about" className="py-24 bg-brand-surface">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Smartify Your Texts
          </h2>
          <p className="text-lg text-brand-muted leading-relaxed mb-8">
            Gigler turns your text messages into a command center. Get real stuff
            done&mdash;plan events, build websites, form an LLC, make
            reservations&mdash;all while you&rsquo;re on the beach, on vacation,
            or anywhere you want to be.
          </p>
          <p className="text-brand-muted leading-relaxed">
            Gigler is an AI that lives in your text messages. You create
            Gigs&mdash;projects, tasks, anything you need done&mdash;by texting.
            The AI manages, coordinates, and actually executes the work. Gigs
            can be collaborative (true group threads). Gigler can also call you
            (wake-up calls, check-ins, voice consultations) and generates
            deliverables with shareable URLs.
          </p>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-background">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Simple Pricing
          </h2>
          <p className="text-center text-brand-muted mb-16">
            Start free. Upgrade when you need more.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-xl border p-6 flex flex-col bg-brand-surface ${
                  tier.highlight
                    ? "border-brand-primary ring-2 ring-brand-primary shadow-lg shadow-brand-primary/10"
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
                  className={`w-full rounded-lg py-2.5 font-medium transition cursor-pointer ${
                    tier.highlight
                      ? "bg-brand-primary text-white hover:bg-brand-primary-hover"
                      : "border border-brand-border text-foreground hover:bg-brand-surface-hover"
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Careers ─────────────────────────────────────────────────────── */}
      <section id="careers" className="py-24 bg-brand-surface">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
            Build the Future of AI, Over Text
          </h2>
          <p className="text-center text-brand-muted max-w-2xl mx-auto mb-4 leading-relaxed">
            The hardest problems in AI are solved by people who ship. At Gigler,
            we&rsquo;re building an AI that doesn&rsquo;t live in an
            app&mdash;it lives in your text messages. Every engineer, researcher,
            and designer has massive impact.
          </p>
          <p className="text-center text-brand-muted max-w-2xl mx-auto mb-4 leading-relaxed">
            If you&rsquo;ve solved a hard problem lately, we want to hear about
            it. Send us a note even if you don&rsquo;t see a perfect role
            listed.
          </p>
          <p className="text-center mb-12">
            <a
              href="mailto:careers@gigler.ai"
              className="text-brand-primary hover:text-brand-primary-hover transition font-medium"
            >
              careers@gigler.ai
            </a>
          </p>

          <h3 className="text-xl font-bold text-center mb-8">Open Roles</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {OPEN_ROLES.map((role) => (
              <div
                key={role.title}
                className="rounded-xl border border-brand-border bg-brand-surface p-6 flex flex-col"
              >
                <h4 className="text-lg font-bold mb-3">{role.title}</h4>
                <p className="text-sm text-brand-muted flex-1 mb-6">
                  {role.description}
                </p>
                <a
                  href={`mailto:careers@gigler.ai?subject=Application: ${role.title}`}
                  className="inline-block text-center rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-foreground hover:bg-brand-surface-hover transition"
                >
                  Apply
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-brand-primary to-indigo-800 text-white">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to get things done?
          </h2>
          <p className="text-lg opacity-90 mb-10">
            No downloads. No dashboards. Just text Gigler.
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-lg bg-white px-8 py-3 text-lg font-semibold text-brand-primary hover:bg-gray-100 transition"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="py-12 border-t border-brand-border bg-background">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-brand-muted">
            &copy; {new Date().getFullYear()} Gigler. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-brand-muted">
            <Link
              href="#about"
              className="hover:text-foreground transition"
            >
              About
            </Link>
            <Link
              href="#pricing"
              className="hover:text-foreground transition"
            >
              Pricing
            </Link>
            <Link
              href="#careers"
              className="hover:text-foreground transition"
            >
              Careers
            </Link>
            <Link
              href="/dashboard"
              className="hover:text-foreground transition"
            >
              Dashboard
            </Link>
          </div>
          <div className="text-sm text-brand-muted">gigler.ai</div>
        </div>
      </footer>
    </main>
  );
}
