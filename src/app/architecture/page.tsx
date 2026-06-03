import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Gigler Orca — System Architecture",
  description:
    "How Gigler turns text, email, and voice requests into completed work. Orca orchestration, an email-native agent per gig, and durable multi-step execution — the architecture behind Gigler Orca.",
  alternates: { canonical: "/architecture" },
};

const HIGHLIGHTS: { title: string; body: string }[] = [
  {
    title: "Orca orchestration",
    body: "Plan → route → execute → verify. Orca decomposes each gig into steps and routes every step to the cheapest capable model, agent, tool, or platform.",
  },
  {
    title: "An email address per gig",
    body: "Every gig is an email-native agent reachable at its own address, so users can text, email, or call — all landing in the same gig with unified memory.",
  },
  {
    title: "Deliverables, not chat",
    body: "A deployed site, a designed PDF, a submitted form, a booked reservation — delivered as a shareable gigler.ai link with proof of work captured.",
  },
];

export default function ArchitecturePage() {
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
            <Link
              href="/pricing"
              className="text-brand-muted hover:text-foreground transition"
            >
              Pricing
            </Link>
            <Link href="/architecture" className="text-foreground font-medium">
              Architecture
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-24 px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent mb-4">
            System Architecture · Gigler Orca
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Send the request. Gigler delivers the work.
          </h1>
          <p className="text-lg text-brand-muted leading-relaxed max-w-3xl mb-10">
            Gigler is an AI gig-orchestration platform. Users ask for an outcome
            over text, email, or voice; Orca breaks the gig into steps, routes
            each step to the right model, agent, tool, or platform, tracks
            progress, asks for human input only when needed, and delivers a real
            result. This page documents the architecture behind that system.
          </p>

          {/* Diagram */}
          <figure className="rounded-2xl border border-brand-border overflow-hidden bg-white shadow-sm">
            {/* Static diagram asset rendered from the validated HTML→Chrome pipeline */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/architecture/gigler-orca-diagram.png"
              alt="Gigler Orca system architecture diagram: channels (SMS, email, voice, web) flow into the Orca orchestration layer powered by Gemini, which routes work across execution surfaces (documents, browser tasks, code, vision, third-party APIs) with human checkpoints, then delivers a result via a shareable link."
              className="w-full h-auto block"
            />
          </figure>
          <figcaption className="mt-3 text-sm text-brand-muted">
            Gigler Orca system architecture — text, email, and voice in;
            orchestrated execution; a delivered outcome out.
          </figcaption>

          {/* Download links */}
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/architecture/gigler-orca-architecture.pdf"
              download="gigler-orca-architecture.pdf"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M10 1a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L9 10.586V2a1 1 0 0 1 1-1Z" />
                <path d="M3 14a1 1 0 0 1 1 1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1a1 1 0 1 1 2 0v1a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-1a1 1 0 0 1 1-1Z" />
              </svg>
              Download architecture PDF
            </a>
            <a
              href="/architecture/gigler-orca-diagram.pdf"
              download="gigler-orca-diagram.pdf"
              className="inline-flex items-center rounded-lg border border-brand-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-brand-surface transition"
            >
              Download diagram (PDF)
            </a>
            <a
              href="/architecture/gigler-orca-diagram.png"
              download="gigler-orca-diagram.png"
              className="inline-flex items-center rounded-lg border border-brand-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-brand-surface transition"
            >
              Download diagram (PNG)
            </a>
          </div>

          {/* Highlights */}
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.title}
                className="rounded-xl border border-brand-border bg-brand-surface p-6"
              >
                <h2 className="text-lg font-bold text-foreground mb-2">
                  {h.title}
                </h2>
                <p className="text-sm text-brand-muted leading-relaxed">
                  {h.body}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-12 text-sm text-brand-muted">
            Prepared for the Google for Startups AI Agents Challenge · Track 2 —
            Optimize Existing Agents.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
