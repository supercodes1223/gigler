import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "About Gigler — AI Work Orchestration for Real Work",
  description:
    "Gigler orchestrates the work behind every text, email, or voice request, then delivers the results — coding, planning, documents, workflows, and more.",
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

            <h2 className="text-2xl font-bold text-foreground pt-4">
              Not Locked Into One AI Lab
            </h2>

            <p>
              Frontier AI labs keep shipping powerful models, agents, and
              platforms, but each one pulls people into its own interface,
              memory, and workflow. Gigler removes that complexity. Each gig is
              routed across the right mix of AI models, agents, tools, and
              platforms, so the work is not dependent on any single lab or
              system.
            </p>

            <p>
              Powered by Orca, our model designed and trained for AI
              orchestration across platforms, Gigler can choose the right tool
              for each step, coordinate those systems together, and keep
              improving as more gigs are completed.
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
              your pocket. Messages are universal, instant, and human.
              That&apos;s where AI should live — in the flow of your day, doing the
              heavy lifting in the background.
            </p>

            <p className="text-foreground font-medium text-xl pt-4">
              Send the request. Gigler plans, tracks, and delivers.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
