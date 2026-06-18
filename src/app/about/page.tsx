import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import CapabilityGrid from "@/components/CapabilityGrid";
import GiglerHeroDemo from "@/components/GiglerHeroDemo";
import InviteRequestForm from "@/components/InviteRequestForm";
import OrchestrationHeroDemo from "@/components/OrchestrationHeroDemo";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "About Gigler — AI Work Orchestration for Real Work",
  description:
    "Gigler orchestrates the work behind every text, email, or voice request, then delivers the results — coding, planning, documents, workflows, and more.",
  alternates: { canonical: "/about" },
};

const orchestrationLogos = [
  { name: "ChatGPT", src: "/logos/chatgpt.svg" },
  { name: "Claude Code", src: "/logos/claude.svg" },
  { name: "Codex", src: "/logos/chatgpt.svg" },
  { name: "Cursor", src: "/logos/cursor.svg" },
  { name: "Gemini", src: "/logos/gemini.svg" },
  { name: "Google Cloud", src: "/logos/google-cloud.svg" },
  { name: "AWS", src: "/logos/aws.svg" },
  { name: "OpenClaw", initials: "OC" },
  { name: "Claude Cowork", src: "/logos/claude.svg" },
  { name: "Hermes", initials: "H" },
] as const;

function OrchestrationLogoStrip({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <p className="mb-4 max-w-sm text-sm font-semibold uppercase tracking-[0.18em] text-brand-muted">
        AI Gig Orchestration
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:max-w-md">
        {orchestrationLogos.map((logo) => (
          <div
            key={logo.name}
            className="flex min-h-12 items-center gap-3 rounded-lg border border-brand-border bg-brand-surface/55 px-3 py-2"
          >
            {"src" in logo ? (
              <Image
                src={logo.src}
                alt=""
                width={22}
                height={22}
                className="h-5 w-5 shrink-0 brightness-0 invert opacity-70"
              />
            ) : (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-brand-border text-[9px] font-bold tracking-normal text-brand-muted">
                {logo.initials}
              </span>
            )}
            <span className="text-sm font-semibold leading-tight text-foreground">
              {logo.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
            <Link
              href="/"
              className="rounded-full bg-foreground px-4 py-2 font-semibold text-background transition hover:bg-white"
            >
              Start a Gig
            </Link>
          </div>
        </div>
      </nav>

      {/* Intro prose */}
      <section className="pt-32 pb-16 px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">
            AI gig worker. Real work delivered.
          </h1>

          <div className="space-y-8 text-lg text-brand-muted leading-relaxed">
            <p>
              Gigler orchestrates the work behind every request, then delivers
              the results — untethering people from screens and dashboards.
              Send a text, email, or voice message, and Gigler plans the steps,
              tracks progress, coordinates the tools and people, and completes
              the work.
            </p>

            <p>
              Build a website, ship code, organize photos, plan events, generate
              reports, make reservations, or coordinate a team workflow — all
              from the interface you already use every day.
            </p>

            <h2 className="text-2xl font-bold text-foreground pt-4">
              How It Works
            </h2>

            <p>
              Gigler is an AI that meets you wherever you are. You create{" "}
              <strong className="text-foreground">Gigs</strong> — projects,
              tasks, or outcomes you need delivered — just by asking. Each gig
              becomes a coordinated workflow with progress updates, shareable
              links, screenshots when useful, and final deliverables.
            </p>

            <p>
              Gigs can be collaborative. Add anyone by phone number and
              they&apos;re instantly in a true group thread — no sign-up
              required. Gigler coordinates everyone, tracks progress, and keeps
              things moving.
            </p>
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
              <OrchestrationLogoStrip className="mt-10 hidden lg:block" />
            </div>
            <div className="space-y-5 text-lg leading-relaxed text-brand-muted">
              <p>
                AI tools are getting more capable every week. But each one
                lives in its own interface, context, memory, and workflow.
                Gigler brings together best-in-class agents, AI tools, and
                frontier models without locking you into any single system, so
                you do not have to choose the right tool, manage each step, and
                keep the work on track yourself.
              </p>
              <p>
                Users ask for the outcome, and Orca, our own model designed and
                trained to route gigs across frontier AI agents, models, tools,
                and leading platforms, breaks the gig into steps, chooses the
                right mix, and coordinates the work across systems. One step
                might go to a frontier coding agent, another to a cloud or
                browser tool, and another to an AI agent with specialized
                capabilities, all coordinated toward the completed gig.
              </p>
              <p>
                Gigler looks at the work as a Gig, not a pile of tokens. The
                focus is the outcome you want completed, not the model menu you
                had to navigate to get there. As gigs are completed, Orca keeps
                getting smarter at routing work across models, agents, and
                platforms.
              </p>
            </div>
          </div>
          <OrchestrationLogoStrip className="mt-10 lg:hidden" />
        </div>
      </section>

      {/* Orchestration hero illustration */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <OrchestrationHeroDemo className="mx-auto max-w-xl" />
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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">AI gig worker.</h2>
          <p className="text-lg text-brand-muted max-w-2xl mx-auto">
            Gigler untethers people from screens and dashboards by orchestrating
            the work behind every request, then delivering the results.
          </p>
        </div>

        <CapabilityGrid />
      </section>

      {/* Deeper positioning prose */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl space-y-8 text-lg leading-relaxed text-brand-muted">
          <h2 className="text-2xl font-bold text-foreground">
            Not Locked Into One AI Lab
          </h2>
          <p>
            Frontier AI labs keep shipping powerful models, agents, and
            platforms, but each one pulls people into its own interface, memory,
            and workflow. Gigler removes that complexity. Each gig is routed
            across the right mix of AI models, agents, tools, and platforms, so
            the work is not dependent on any single lab or system.
          </p>
          <p>
            Powered by Orca, our model designed and trained for AI orchestration
            across platforms, Gigler can choose the right tool for each step,
            coordinate those systems together, and keep improving as more gigs
            are completed.
          </p>

          <h2 className="text-2xl font-bold text-foreground pt-4">
            More Than Conversation
          </h2>
          <p>
            Gigler does not just answer questions. It can generate documents,
            render PDFs, build pages, organize media, manage spreadsheets,
            browse and submit web forms, and send proof-of-work updates as the
            gig moves forward.
          </p>
          <p>
            When a gig produces something tangible — a PDF, a website, a photo
            collage, a code project, a report, a menu, or a dashboard — Gigler
            generates{" "}
            <strong className="text-foreground">
              deliverables with shareable URLs
            </strong>
            . Real output, not just conversation.
          </p>

          <h2 className="text-2xl font-bold text-foreground pt-4">
            The Interface You Already Use
          </h2>
          <p>
            We built Gigler because we believe the best interface is no
            interface. The most powerful tool is the one you already have in
            your pocket. Messages are universal, instant, and human. That&apos;s
            where AI should live — in the flow of your day, doing the heavy
            lifting in the background.
          </p>
          <p className="text-foreground font-medium text-xl pt-4">
            Send the request. Gigler plans, tracks, and delivers.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Request access to Gigler
          </h2>
          <p className="text-lg text-brand-muted mb-10">
            Gigler is currently in closed beta. Enter your email and we&apos;ll
            review your invite request.
          </p>
          <InviteRequestForm />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
