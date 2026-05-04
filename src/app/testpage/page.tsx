import type { Metadata } from "next";
import Link from "next/link";
import OrchestrationHeroDemo from "@/components/OrchestrationHeroDemo";

export const metadata: Metadata = {
  title: "AI Orchestration Hero Test",
  robots: {
    index: false,
    follow: false,
  },
};

export default function TestPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-brand-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-foreground">
            Gigler
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link href="/" className="text-brand-muted hover:text-foreground transition">
              Home
            </Link>
            <Link href="/about" className="text-brand-muted hover:text-foreground transition">
              About
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-28 pb-20 px-6 min-h-[90vh] flex items-center">
        <div className="mx-auto max-w-6xl w-full grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
          <div>
            <div className="mb-4 inline-flex rounded-full border border-brand-border bg-brand-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">
              Test page · Orchestration
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6">
              One text. Many agents.
              <br />
              <span className="gigler-glow" style={{ color: "#4285F4" }}>One delivery.</span>
            </h1>
            <p className="text-lg md:text-xl text-brand-muted leading-relaxed mb-8 max-w-lg">
              <strong className="text-foreground">Bobby texts Gigler from the beach.</strong>
              <br />
              Gigler turns one request into a Gig, fans it out to a team of
              agents, and calls Bobby back when his shop is live.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/#request-invite"
                className="rounded-full bg-foreground px-8 py-3 text-base font-semibold text-background hover:bg-white transition text-center"
              >
                Request Invite
              </Link>
              <Link
                href="/"
                className="rounded-full border border-brand-border px-8 py-3 text-base font-semibold text-foreground hover:bg-brand-surface transition text-center"
              >
                Back to Homepage
              </Link>
            </div>
          </div>

          {/* Right (desktop) / Below (mobile): ambient floating illustration */}
          <div className="mt-12 lg:mt-0">
            <OrchestrationHeroDemo />
          </div>
        </div>
      </section>
    </main>
  );
}
