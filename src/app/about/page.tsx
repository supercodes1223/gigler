import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Gigler — Smartify Your Texts",
  description:
    "Gigler is an AI that lives in your text messages. Get real stuff done — plan events, build websites, form an LLC — all from a text thread.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="flex-1 bg-background">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full bg-[#0a0a0b]/80 backdrop-blur-md border-b border-brand-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-brand-primary">
            Gigler
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link
              href="/#how-it-works"
              className="text-brand-muted hover:text-foreground transition"
            >
              How It Works
            </Link>
            <Link href="/about" className="text-foreground font-medium">
              About
            </Link>
            <Link
              href="/pricing"
              className="text-brand-muted hover:text-foreground transition"
            >
              Pricing
            </Link>
            <Link
              href="/careers"
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

      {/* Content */}
      <section className="pt-32 pb-24 px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">
            Smartify Your Texts
          </h1>

          <div className="space-y-8 text-lg text-brand-muted leading-relaxed">
            <p>
              Gigler turns your text messages into a command center. Get real
              stuff done — plan events, build websites, form an LLC, make
              reservations — all while you&apos;re on the beach, on vacation, or
              anywhere you want to be.
            </p>

            <p>
              No app to download. No dashboard to learn. No new workflow to
              figure out. You already know how to text. That&apos;s all you need.
            </p>

            <h2 className="text-2xl font-bold text-foreground pt-4">
              How It Works
            </h2>

            <p>
              Gigler is an AI that lives in your text messages. You create{" "}
              <strong className="text-foreground">Gigs</strong> — projects,
              tasks, anything you need done — by texting. The AI manages,
              coordinates, and actually executes the work.
            </p>

            <p>
              Gigs can be collaborative. Add anyone by phone number and
              they&apos;re instantly in a true group thread — no sign-up
              required. Gigler coordinates everyone, tracks progress, and keeps
              things moving.
            </p>

            <h2 className="text-2xl font-bold text-foreground pt-4">
              Beyond Text
            </h2>

            <p>
              Gigler can also{" "}
              <strong className="text-foreground">call you</strong> — wake-up
              calls with your daily briefing, check-ins on stale projects, voice
              consultations when typing isn&apos;t enough.
            </p>

            <p>
              And when your gig produces something tangible — a PDF, a website,
              a photo collage, a code project — Gigler generates{" "}
              <strong className="text-foreground">
                deliverables with shareable URLs
              </strong>
              . Real output, not just conversation.
            </p>

            <h2 className="text-2xl font-bold text-foreground pt-4">
              The Anti-App
            </h2>

            <p>
              We built Gigler because we believe the best interface is no
              interface. The most powerful tool is the one you already have in
              your pocket. Text messages are universal, instant, and human.
              That&apos;s where AI should live.
            </p>

            <p className="text-foreground font-medium text-xl pt-4">
              Just text, and it gets done.
            </p>
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
