import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Careers at Gigler — Build the Future of AI, Over Text",
  description:
    "Join Gigler and build AI that actually does things. We're hiring engineers, researchers, and designers who ship.",
  alternates: { canonical: "/careers" },
};

const OPEN_ROLES = [
  {
    title: "AI / ML Engineer",
    description:
      "Build the Gemini-powered brain that understands natural language, detects intent, and executes gigs across 9 categories. You'll work on conversation AI, multi-turn reasoning, and real-time decision making — all delivered over SMS.",
    tags: ["Gemini", "NLP", "TypeScript", "Lambda"],
  },
  {
    title: "Full-Stack Engineer",
    description:
      "Ship the infrastructure that powers millions of texts. Lambda functions, DynamoDB at scale, Twilio integrations, Next.js dashboard — you'll own the full stack from inbound SMS to delivered website.",
    tags: ["AWS", "Next.js", "DynamoDB", "Twilio"],
  },
  {
    title: "Product Designer",
    description:
      "Design the simplest AI experience ever built: no UI, just text. You'll craft conversation flows, onboarding experiences, deliverable templates, and the rare moments where a screen actually helps.",
    tags: ["UX", "Conversation Design", "Figma"],
  },
] as const;

export default function CareersPage() {
  return (
    <main className="flex-1 bg-background">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-brand-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-brand-primary">
            Gigler
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link
              href="/about"
              className="text-brand-muted hover:text-foreground transition"
            >
              About
            </Link>
            <Link
              href="/pricing"
              className="text-brand-muted hover:text-foreground transition"
            >
              Pricing
            </Link>
            <Link href="/careers" className="text-foreground font-medium">
              Careers
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full bg-brand-primary px-4 py-2 text-white font-medium hover:bg-brand-primary-hover transition"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Build the Future of AI, Over Text
          </h1>
          <p className="text-lg text-brand-muted leading-relaxed mb-6">
            The hardest problems in AI are solved by people who ship. At Gigler,
            we&apos;re building an AI that doesn&apos;t live in an app — it
            lives in your text messages. Every engineer, researcher, and
            designer has massive impact.
          </p>
        </div>
      </section>

      {/* Philosophy */}
      <section className="pb-16 px-6">
        <div className="mx-auto max-w-3xl space-y-8">
          <div>
            <h2 className="text-xl font-bold mb-3">Hands-On, Every Day</h2>
            <p className="text-brand-muted leading-relaxed">
              Real AI problems aren&apos;t solved in slide decks. They&apos;re
              solved by people who build, test, break, and ship — every single
              day. At Gigler, you&apos;ll work directly with the systems that
              handle real conversations, real gigs, and real deliverables.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold mb-3">Impact by Design</h2>
            <p className="text-brand-muted leading-relaxed">
              We&apos;re building a lean, collaborative team where every
              individual has a massive impact. We look for builders who are
              passionate about AI and live for the challenge of making systems
              work in messy, complex, real-world environments.
            </p>
          </div>
          <p className="text-brand-muted leading-relaxed border-l-2 border-brand-primary pl-6 italic">
            If you&apos;ve solved a hard problem lately, we want to hear about
            it. Send us a note even if you don&apos;t see a perfect role listed.
          </p>
          <a
            href="mailto:careers@gigler.ai"
            className="inline-block text-brand-primary font-medium hover:text-brand-primary-hover transition"
          >
            careers@gigler.ai →
          </a>
        </div>
      </section>

      {/* Open Roles */}
      <section className="py-16 px-6 bg-brand-surface">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold mb-10">Open Roles</h2>
          <div className="space-y-6">
            {OPEN_ROLES.map((role) => (
              <div
                key={role.title}
                className="rounded-xl border border-brand-border bg-background p-8 hover:border-brand-muted transition"
              >
                <h3 className="text-xl font-bold mb-3">{role.title}</h3>
                <p className="text-brand-muted leading-relaxed mb-4">
                  {role.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {role.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs font-medium px-3 py-1 rounded-full border border-brand-border text-brand-muted"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <a
                  href={`mailto:careers@gigler.ai?subject=Application: ${role.title}`}
                  className="text-brand-primary font-medium hover:text-brand-primary-hover transition"
                >
                  Apply →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-brand-border">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-brand-muted">
            © {new Date().getFullYear()} Gigler. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-brand-muted">
            <Link
              href="/about"
              className="hover:text-foreground transition"
            >
              About
            </Link>
            <Link
              href="/pricing"
              className="hover:text-foreground transition"
            >
              Pricing
            </Link>
            <Link
              href="/careers"
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
