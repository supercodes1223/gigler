import type { Metadata } from "next";
import Link from "next/link";
import CapabilityGrid from "@/components/CapabilityGrid";
import GiglerHeroDemo from "@/components/GiglerHeroDemo";
import InviteRequestForm from "@/components/InviteRequestForm";
import OrchestrationHeroDemo from "@/components/OrchestrationHeroDemo";
import SiteFooter from "@/components/SiteFooter";

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

      {/* Hero */}
      <section className="px-6 pb-16 pt-24 lg:pb-20">
        <div className="mx-auto grid w-full max-w-6xl items-start gap-4 sm:gap-5 lg:grid-cols-2 lg:gap-16">
          <div className="relative z-20">
            <h1 className="mb-6 text-[2.55rem] font-bold leading-tight tracking-tight min-[390px]:text-5xl md:text-7xl">
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
            <p className="mb-8 max-w-lg text-lg leading-relaxed text-brand-muted md:text-xl">
              <strong className="text-foreground">Send a request. Gigler gets to work.</strong>
              <br />
              Gigler plans, tracks, and delivers real work, reaching you by
              text, email, or voice when it needs you.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                href="/#request-invite"
                className="rounded-full bg-foreground px-8 py-3 text-center text-base font-semibold text-background transition hover:bg-white"
              >
                Request Invite
              </Link>
              <Link
                href="/#how-it-works"
                className="rounded-full border border-brand-border px-8 py-3 text-center text-base font-semibold text-foreground transition hover:bg-brand-surface"
              >
                Learn More
              </Link>
            </div>
          </div>

          <div className="relative z-10 -mt-20 sm:-mt-12 lg:-mt-40">
            <OrchestrationHeroDemo className="max-w-[330px] sm:max-w-[430px] lg:max-w-xl" />
          </div>
        </div>
      </section>

      {/* Process demo */}
      <section id="how-it-works" className="scroll-mt-24 px-6 pb-24 pt-6">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="lg:sticky lg:top-28">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand-muted">
              How it works
            </p>
            <h2 className="mb-5 text-3xl font-bold leading-tight md:text-4xl">
              Every request becomes a Gig.
            </h2>
            <p className="max-w-xl text-lg leading-relaxed text-brand-muted">
              Text, email, or voice. Gigler plans the work, picks the right
              agents and tools, tracks progress, and delivers the result.
            </p>
          </div>
          <div className="ai-glow relative">
            <GiglerHeroDemo />
          </div>
        </div>
      </section>

      {/* Orchestration positioning */}
      <section id="orchestration" className="scroll-mt-24 px-6 pb-24">
        <div className="mx-auto max-w-6xl rounded-lg border border-brand-border bg-background-alt/70 p-6 md:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand-muted">
                Orchestration
              </p>
              <h2 className="max-w-xl text-3xl font-bold leading-tight md:text-4xl">
                Stop choosing tools. Start finishing actual work.
              </h2>
            </div>
            <div className="space-y-5 text-lg leading-relaxed text-brand-muted">
              <p>
                AI tools are evolving every day, and the right choice depends
                on the work and the outcome people want. Gigler takes the
                guesswork out of choosing between ChatGPT, Claude, Codex,
                Cursor, Gemini, agents, cloud tools, and whatever launches next
                week.
              </p>
              <p>
                Powered by Orca, our own orchestration model built for agentic
                tool use, Gigler breaks a gig into steps, selects and uses the
                right third-party AI tools, coding agents, cloud platforms, and
                workflows, then coordinates them through delivery.
              </p>
              <p>
                Gigler looks at the work as a Gig, not a pile of tokens. The
                focus is the outcome you want completed, not the model menu you
                had to navigate to get there.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-brand-border bg-brand-surface/60 p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">
                Right-sized execution
              </p>
              <p className="text-sm leading-relaxed text-brand-muted">
                Small tasks stay simple; complex gigs get deeper orchestration.
              </p>
            </div>
            <div className="rounded-lg border border-brand-border bg-brand-surface/60 p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">
                Orca model orchestration
              </p>
              <p className="text-sm leading-relaxed text-brand-muted">
                Gigler selects and uses third-party tools around the work.
              </p>
            </div>
            <div className="rounded-lg border border-brand-border bg-brand-surface/60 p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">
                Transparent delivery
              </p>
              <p className="text-sm leading-relaxed text-brand-muted">
                Each gig can show the tools and platforms used to complete the
                work.
              </p>
            </div>
          </div>

          <p className="mt-8 max-w-3xl text-base leading-relaxed text-brand-muted">
            Gigler&apos;s orchestration layer keeps learning from completed gigs
            so it can make better choices as frontier AI changes.
          </p>
        </div>
      </section>

      {/* Everyday examples */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-3xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand-muted">
              Everyday gigs
            </p>
            <h2 className="mb-5 text-3xl font-bold leading-tight md:text-4xl">
              Gigler in your life.
            </h2>
            <p className="text-lg leading-relaxed text-brand-muted">
              Bring Gigler into a text thread, email chain, or voice call. It
              keeps the group moving, asks for decisions when needed, and turns
              the outcome into a shareable gig.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-brand-border bg-background-alt/60 p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">
                Trip group chat
              </p>
              <p className="text-sm leading-relaxed text-brand-muted">
                Add Gigler to the thread. It suggests places to see, tracks
                what everyone picked, and sends the day&apos;s plan back to the
                group.
              </p>
            </div>
            <div className="rounded-lg border border-brand-border bg-background-alt/60 p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">
                Shared photos
              </p>
              <p className="text-sm leading-relaxed text-brand-muted">
                Drop photos and clips into the chat. Gigler sorts them by
                person, moment, or event, then delivers an album link like
                gigler.ai/trip123.
              </p>
            </div>
            <div className="rounded-lg border border-brand-border bg-background-alt/60 p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">
                Human checkpoints
              </p>
              <p className="text-sm leading-relaxed text-brand-muted">
                If a decision matters, Gigler can text, email, or call with the
                update, then continue the gig once you choose the next step.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase — deliverable types */}
      <section className="py-24 px-6 bg-brand-surface">
        <div className="mx-auto max-w-5xl text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            AI gig worker.
          </h2>
          <p className="text-lg text-brand-muted max-w-2xl mx-auto">
            Gigler untethers people from screens and dashboards by orchestrating
            the work behind every request, then delivering the results.
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

      <SiteFooter />
    </main>
  );
}
