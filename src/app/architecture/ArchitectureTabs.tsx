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
  { date: "6/3/26", text: "Landing page v2", link: true },
  { date: "6/3/26", text: "Landing page v1", link: true },
  { date: "6/2/26", text: "“Build my landing page” gig request received." },
];

const GIG_SPEC: { label: string; value: string }[] = [
  { label: "Business type", value: "Flower shop" },
  { label: "Online ordering", value: "Yes" },
  { label: "Booking system", value: "No" },
  { label: "Domain", value: "bloomandpetal.com" },
  { label: "Contact phone", value: "(555) 123-4567" },
];

function GigStatusPreview() {
  const [showReqs, setShowReqs] = useState(false);

  return (
    <div className="mt-8">
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
          <div className="mb-4 flex items-center justify-between">
            <span className="text-base font-bold text-foreground">
              Your landing page is live
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-500">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Live · v2
            </span>
          </div>

          {/* delivered landing page preview */}
          <div className="relative overflow-hidden rounded-lg border border-brand-border bg-white">
            <div className="flex items-center justify-between border-b border-black/5 px-3 py-1.5">
              <span className="text-[10px] font-extrabold text-gray-900">
                Bloom &amp; Petal
              </span>
              <div className="flex gap-2 text-[8px] text-gray-500">
                <span>Shop</span>
                <span>About</span>
                <span>Contact</span>
              </div>
            </div>
            <div
              className="px-4 py-5"
              style={{ background: "linear-gradient(135deg, #fb7185, #e11d48)" }}
            >
              <div className="text-sm font-extrabold leading-tight text-white">
                Fresh flowers,
                <br />
                delivered daily
              </div>
              <div className="mt-2.5 flex gap-1.5">
                <span className="rounded bg-white px-2 py-0.5 text-[9px] font-bold text-rose-600">
                  Order online
                </span>
                <span className="rounded border border-white/70 px-2 py-0.5 text-[9px] font-semibold text-white">
                  Call us
                </span>
              </div>
            </div>
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
            <dl className="mt-2 divide-y divide-brand-border rounded-lg border border-brand-border bg-background px-3 text-xs">
              {GIG_SPEC.map((s) => (
                <div key={s.label} className="flex justify-between gap-3 py-2">
                  <dt className="text-brand-muted">{s.label}</dt>
                  <dd className="font-medium text-foreground">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand-border bg-background px-3 py-2">
            <span className="flex-1 text-xs text-brand-muted">
              Reply to request changes…
            </span>
            <span className="text-brand-accent" aria-hidden="true">
              ↩
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-brand-muted">
            Come back to this gig anytime — reply to tweak your site and Gigler
            ships a new version.
          </p>
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
            at gigler.ai or text, email, or voice; Orca breaks the gig into
            steps, routes
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
