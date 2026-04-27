import type { Metadata } from "next";
import Link from "next/link";
import CapabilityGrid from "@/components/CapabilityGrid";
import GiglerHeroDemo from "@/components/GiglerHeroDemo";
import InviteRequestForm from "@/components/InviteRequestForm";

export const metadata: Metadata = {
  title: "Gigler — AI Work Orchestration for Real Work",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-brand-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-foreground">
            Gigler
          </Link>
          <details className="relative md:hidden">
            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-brand-border bg-brand-surface text-foreground transition hover:bg-brand-surface-hover">
              <span className="sr-only">Open navigation menu</span>
              <span className="flex flex-col gap-1">
                <span className="block h-0.5 w-4 rounded-full bg-current" />
                <span className="block h-0.5 w-4 rounded-full bg-current" />
                <span className="block h-0.5 w-4 rounded-full bg-current" />
              </span>
            </summary>
            <div className="absolute right-0 top-14 w-56 rounded-2xl border border-brand-border bg-background-alt/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <Link
                href="/about"
                className="block rounded-xl px-4 py-3 text-sm font-medium text-brand-muted transition hover:bg-brand-surface hover:text-foreground"
              >
                About
              </Link>
              <Link
                href="/pricing"
                className="block rounded-xl px-4 py-3 text-sm font-medium text-brand-muted transition hover:bg-brand-surface hover:text-foreground"
              >
                Pricing
              </Link>
              <Link
                href="/careers"
                className="block rounded-xl px-4 py-3 text-sm font-medium text-brand-muted transition hover:bg-brand-surface hover:text-foreground"
              >
                Careers
              </Link>
              <Link
                href="/#request-invite"
                className="mt-1 block rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:bg-white"
              >
                Request Invite
              </Link>
            </div>
          </details>
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
            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6">
              <span className="inline-flex items-baseline gigler-glow" style={{ gap: "0" }}>
                <span>Gig</span>
                <span className="rolodex-container">
                  <span className="rolodex-word" style={{ color: "#4285F4" }}>economy</span>
                  <span className="rolodex-word" style={{ color: "#34A853" }}>coding</span>
                  <span className="rolodex-word" style={{ color: "#F25022" }}>organizing</span>
                  <span className="rolodex-word" style={{ color: "#4285F4" }}>planning</span>
                  <span className="rolodex-word" style={{ color: "#EA4335" }}>collaborating</span>
                  <span className="rolodex-word" style={{ color: "#34A853" }}>orchestrating</span>
                  <span className="rolodex-word">ler</span>
                </span>
              </span>
            </h1>
            <p className="text-lg md:text-xl text-brand-muted leading-relaxed mb-8 max-w-lg">
              <strong className="text-foreground">Gigler builds it.</strong>
              <br />
              Every gig, tracked and delivered.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/#request-invite"
                className="rounded-full bg-foreground px-8 py-3 text-base font-semibold text-background hover:bg-white transition text-center"
              >
                Request Invite
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-brand-border px-8 py-3 text-base font-semibold text-foreground hover:bg-brand-surface transition text-center"
              >
                Learn More
              </Link>
            </div>
          </div>

          {/* Right (desktop) / Below (mobile): Two-phase demo */}
          <div className="mt-12 lg:mt-0">
            <div className="ai-glow relative">
              <GiglerHeroDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Showcase — deliverable types */}
      <section className="py-24 px-6 bg-brand-surface">
        <div className="mx-auto max-w-5xl text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            AI gig worker. Real work delivered.
          </h2>
          <p className="text-lg text-brand-muted max-w-2xl mx-auto">
            Gigler orchestrates the work behind every request, then delivers the results.
          </p>
        </div>

        <CapabilityGrid />
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Request access to Gigler
          </h2>
          <p className="text-lg text-brand-muted mb-10">
            Gigler is currently in closed beta. Enter your email and we&apos;ll review your
            invite request.
          </p>
          <InviteRequestForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-brand-border">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-brand-muted">
            &copy; {new Date().getFullYear()} Gigler. All rights reserved.
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm text-brand-muted items-center">
            <span className="whitespace-nowrap">Built in Carmel, CA with <span className="text-red-500">&#10084;</span></span>
            <div className="flex gap-6 items-center">
              <Link href="/about" className="hover:text-foreground transition">About</Link>
              <Link href="/pricing" className="hover:text-foreground transition">Pricing</Link>
              <Link href="/careers" className="hover:text-foreground transition">Careers</Link>
              <Link href="/dashboard" className="hover:text-foreground transition">Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
