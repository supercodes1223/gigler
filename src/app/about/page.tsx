import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Gigler — Smartify Your Life",
  description:
    "Gigler is an AI that gets real stuff done — plan events, build websites, form an LLC — however you ask, from wherever you are.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <main className="flex-1 bg-background">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-brand-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-foreground">
            Gigler
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
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
          </div>
        </div>
      </nav>

      {/* Content */}
      <section className="pt-32 pb-24 px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">
            Smartify Your Life
          </h1>

          <div className="space-y-8 text-lg text-brand-muted leading-relaxed">
            <p>
              Gigler turns any message into a command center. Get real
              stuff done — be a programmer, plan events, build websites, form
              an LLC, make reservations — all while you&apos;re on the beach, on vacation, or
              anywhere you want to be.
            </p>

            <p>
              No app to download. No dashboard to learn. No new workflow to
              figure out. You already know how to send a message. That&apos;s all you need.
            </p>

            <h2 className="text-2xl font-bold text-foreground pt-4">
              How It Works
            </h2>

            <p>
              Gigler is an AI that meets you wherever you are. You create{" "}
              <strong className="text-foreground">Gigs</strong> — projects,
              tasks, anything you need done — just by asking. The AI manages,
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
              your pocket. Messages are universal, instant, and human.
              That&apos;s where AI should live.
            </p>

            <p className="text-foreground font-medium text-xl pt-4">
              Just ask, and it gets done.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-brand-border">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-brand-muted">
            &copy; {new Date().getFullYear()} Gigler. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-brand-muted items-center">
            <span>Built in Carmel, CA with <span className="text-red-500">&#10084;</span></span>
            <Link href="/about" className="hover:text-foreground transition">About</Link>
            <Link href="/pricing" className="hover:text-foreground transition">Pricing</Link>
            <Link href="/careers" className="hover:text-foreground transition">Careers</Link>
            <Link href="/dashboard" className="hover:text-foreground transition">Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
