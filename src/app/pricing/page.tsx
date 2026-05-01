import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Pricing — Simple Plans for Every Need",
  description:
    "Start free with 5 active gigs. Upgrade to Pro ($25/mo) for unlimited gigs and voice calls, or Team ($100/mo) for group workspaces.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Gigler Pricing — Simple Plans for Every Need",
    description:
      "Start free. Upgrade when you need more. Unlimited gigs, voice calls, and group coordination.",
    url: "/pricing",
  },
};

const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    description: "Get started with the basics.",
    features: [
      "5 active gigs at a time",
      "SMS only (no voice calls)",
      "Basic AI responses (rate-limited)",
      "1 deliverable per gig",
      "Single-user only (no group gigs)",
      "Gigler branding on deliverable pages",
    ],
    cta: "Request Invite",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$25",
    period: "/month",
    description: "For power users who want it all.",
    features: [
      "Unlimited active gigs",
      "Voice calls (wake-ups, check-ins, consultations)",
      "Frontier AI models (no rate limits)",
      "Unlimited deliverables",
      "Group gigs (up to 5 participants per gig)",
      "No branding on deliverable pages",
      "Priority AI response time",
    ],
    cta: "Go Pro",
    highlight: true,
  },
  {
    name: "Team",
    price: "$100",
    period: "/month",
    description: "For teams that coordinate together.",
    features: [
      "Everything in Pro",
      "Up to 10 users",
      "Group gigs with up to 20 participants",
      "Shared gig workspace across team",
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
    description: "For organizations with custom needs.",
    features: [
      "Unlimited everything",
      "SSO & audit logs",
      "Compliance features",
      "Custom integrations",
      "Dedicated support",
    ],
    cta: "Contact Us",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <main className="flex-1 bg-background">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-brand-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-foreground">
            Gigler
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link
              href="/about"
              className="text-brand-muted hover:text-foreground transition"
            >
              About
            </Link>
            <Link href="/pricing" className="text-foreground font-medium">
              Pricing
            </Link>
            <Link
              href="/careers"
              className="text-brand-muted hover:text-foreground transition"
            >
              Careers
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple Pricing
          </h1>
          <p className="text-lg text-brand-muted max-w-xl mx-auto">
            Start free. Upgrade when you need more power, voice calls, or group
            coordination.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-24 px-6">
        <div className="mx-auto max-w-6xl grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border p-6 flex flex-col bg-brand-surface ${
                tier.highlight
                  ? "border-foreground ring-2 ring-foreground shadow-lg shadow-brand-primary/10"
                  : "border-brand-border"
              }`}
            >
              {tier.highlight && (
                <span className="text-xs font-semibold text-brand-primary uppercase tracking-wide mb-2">
                  Most Popular
                </span>
              )}
              <h2 className="text-lg font-semibold text-foreground">
                {tier.name}
              </h2>
              <p className="text-sm text-brand-muted mt-1 mb-4">
                {tier.description}
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-foreground">
                  {tier.price}
                </span>
                <span className="text-brand-muted">{tier.period}</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent"
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
                    <span className="text-brand-muted">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={
                  tier.name === "Enterprise"
                    ? "mailto:sales@gigler.ai"
                    : "/#request-invite"
                }
                className={`block w-full rounded-full py-2.5 text-center font-medium transition ${
                  tier.highlight
                    ? "bg-foreground text-background hover:bg-white"
                    : "border border-brand-border text-foreground hover:bg-background"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
