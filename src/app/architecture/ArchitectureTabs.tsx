"use client";

import { useState } from "react";

type TabId = "technical" | "visual";

const HIGHLIGHTS: { title: string; body: string }[] = [
  {
    title: "Orca orchestration",
    body: "Plan → route → execute → verify. Orca decomposes each gig into steps and routes every step to the best-fit frontier model, agent, tool, or platform.",
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

const GIG_FEED: { date: string; text: string; link?: boolean }[] = [
  { date: "6/3/26", text: "Version 2", link: true },
  { date: "6/3/26", text: "Version 1", link: true },
  { date: "6/2/26", text: "“Build Landing Page” gig request received." },
];

const GIG_REQUIREMENTS = [
  "One-page site for a dog-walking business",
  "Hero, services, pricing, and a contact form",
  "Brand colors and a simple logo",
  "Mobile-friendly, deployed with a shareable link",
];

function GigStatusPreview() {
  const [showReqs, setShowReqs] = useState(false);

  return (
    <div className="mt-8">
      <style>{`
        @keyframes ggShimmer { 0% { transform: translateX(-120%); } 100% { transform: translateX(220%); } }
      `}</style>
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent mb-3">
        What the user sees
      </p>
      <div className="max-w-md rounded-xl border border-brand-border bg-brand-surface overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-brand-border">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand-border" />
          <span className="ml-2 rounded-md border border-brand-border bg-background px-3 py-1 text-xs text-brand-accent font-mono">
            gigler.ai/gig/a13
          </span>
        </div>
        <div className="p-5">
          <div className="text-base font-bold text-foreground mb-4">
            Your gig — on the way…
          </div>
          <div className="h-3.5 w-full rounded-full bg-background overflow-hidden">
            <div
              className="relative h-full overflow-hidden rounded-full"
              style={{
                width: "62%",
                background: "linear-gradient(90deg, var(--brand-accent), #7aa9ff)",
              }}
            >
              <div
                className="absolute inset-y-0 left-0 w-1/4"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
                  animation: "ggShimmer 2.4s ease-in-out infinite",
                }}
              />
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-sm font-bold text-brand-accent">62%</span>
            <span className="text-xs text-brand-muted">almost there</span>
          </div>

          <ul className="mt-5 space-y-3">
            {GIG_FEED.map((item, i) => (
              <li key={i} className="flex gap-3 text-sm leading-snug">
                <span className="w-14 shrink-0 pt-px font-mono text-xs text-brand-muted">
                  {item.date}
                </span>
                <span className="text-foreground">
                  {item.text}
                  {item.link && (
                    <span className="ml-1.5 cursor-pointer font-medium text-brand-accent underline underline-offset-2">
                      Link
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setShowReqs((v) => !v)}
            aria-expanded={showReqs}
            className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-brand-accent hover:underline"
          >
            <span className="text-[10px]">{showReqs ? "▾" : "▸"}</span>
            See gig requirements
          </button>
          {showReqs && (
            <ul className="mt-2 list-disc space-y-1 rounded-lg border border-brand-border bg-background p-3 pl-7 text-xs leading-relaxed text-brand-muted">
              {GIG_REQUIREMENTS.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function DownloadIcon() {
  return (
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
  );
}

export default function ArchitectureTabs() {
  const [tab, setTab] = useState<TabId>("technical");

  const tabBtn = (id: TabId, label: string) =>
    `rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
      tab === id
        ? "bg-brand-accent text-white"
        : "border border-brand-border text-brand-muted hover:text-foreground hover:bg-brand-surface"
    }`;

  return (
    <div>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Architecture views"
        className="flex flex-wrap gap-3"
      >
        <button
          role="tab"
          aria-selected={tab === "technical"}
          onClick={() => setTab("technical")}
          className={tabBtn("technical", "Technical Diagram")}
        >
          Technical Diagram
        </button>
        <button
          role="tab"
          aria-selected={tab === "visual"}
          onClick={() => setTab("visual")}
          className={tabBtn("visual", "Visual Diagram")}
        >
          Visual Diagram
        </button>
      </div>

      {/* Technical panel */}
      {tab === "technical" && (
        <div role="tabpanel" className="mt-8">
          <figure className="rounded-2xl border border-brand-border overflow-hidden bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/architecture/gigler-orca-tech-diagram.png"
              alt="Gigler Orca gig orchestration lifecycle: a new gig request creates a unique per-gig email inbox, Orca classifies and plans then assigns the work to specialized AI agents (research, builder, browser, comms) that hand off to one another and return results to Orca. For high-stakes visual deliverables, Orca selectively invokes a quality loop where a vision Visualizer reviews the draft, two critic agents debate the edits, and a Judge applies only the best. Scheduled interval check-ins poll each gig, and the user follows a single moving progress bar on a simple gigler.ai/gig link until the deliverable is delivered."
              className="w-full h-auto block"
            />
          </figure>

          <GigStatusPreview />

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="/architecture/gigler-orca-architecture.pdf"
              download="gigler-orca-architecture.pdf"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              <DownloadIcon />
              Download architecture PDF
            </a>
            <a
              href="/architecture/gigler-orca-tech-diagram.pdf"
              download="gigler-orca-tech-diagram.pdf"
              className="inline-flex items-center rounded-lg border border-brand-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-brand-surface transition"
            >
              Download technical diagram (PDF)
            </a>
            <a
              href="/architecture/gigler-orca-tech-diagram.png"
              download="gigler-orca-tech-diagram.png"
              className="inline-flex items-center rounded-lg border border-brand-border px-5 py-3 text-sm font-semibold text-foreground hover:bg-brand-surface transition"
            >
              Download technical diagram (PNG)
            </a>
          </div>
        </div>
      )}

      {/* Visual panel */}
      {tab === "visual" && (
        <div role="tabpanel" className="mt-8">
          <p className="text-lg text-brand-muted leading-relaxed max-w-3xl mb-8">
            Gigler is an AI gig-orchestration platform. Users ask for an outcome
            over text, email, or voice; Orca breaks the gig into steps, routes
            each step to the right model, agent, tool, or platform, tracks
            progress, asks for human input only when needed, and delivers a real
            result. This is the same system shown in the technical view, told as
            a simple flow.
          </p>

          <figure className="rounded-2xl border border-brand-border overflow-hidden bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/architecture/gigler-orca-diagram.png"
              alt="Gigler Orca system architecture diagram: channels (SMS, email, voice, web) flow into the Orca orchestration layer, which routes work across frontier AI models and execution surfaces (documents, browser tasks, code, vision, third-party APIs) with human checkpoints, then delivers a result via a shareable link."
              className="w-full h-auto block"
            />
          </figure>
          <figcaption className="mt-3 text-sm text-brand-muted">
            Gigler Orca system flow — text, email, and voice in; orchestrated
            execution; a delivered outcome out.
          </figcaption>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="/architecture/gigler-orca-architecture.pdf"
              download="gigler-orca-architecture.pdf"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-accent px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition"
            >
              <DownloadIcon />
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

          <div className="mt-12 grid gap-6 md:grid-cols-3">
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
        </div>
      )}
    </div>
  );
}
