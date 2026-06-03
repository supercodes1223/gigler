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
              alt="Gigler Orca technical architecture diagram: the request lifecycle across Cloudflare Workers and the Agents SDK — ingress (Twilio, Email Routing, voice, dashboard), the edge Worker and resolver, a per-gig GigAgent Durable Object running the Orca loop, orchestrated execution services (frontier LLM, sandbox, browser run, HTML-to-PDF, human-in-the-loop), and egress to R2, email, SMS, and a deliverable link."
              className="w-full h-auto block"
            />
          </figure>
          <figcaption className="mt-3 text-sm text-brand-muted">
            Request lifecycle &amp; bindings — email-native gig agents on
            Cloudflare Workers + Agents SDK. Orca is model-agnostic and routes
            each step to the best-fit frontier model.
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
