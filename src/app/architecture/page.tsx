import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import ArchitectureTabs from "./ArchitectureTabs";

export const metadata: Metadata = {
  title: "Gigler Orca — System Architecture",
  description:
    "How Gigler turns text, email, and voice requests into completed work. Orca orchestration, an email-native agent per gig, and durable multi-step execution — the architecture behind Gigler Orca.",
  alternates: { canonical: "/architecture" },
};

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
          <div className="mb-12 rounded-2xl border border-brand-border bg-brand-surface p-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent mb-3">
              You ask. Orca handles the rest.
            </p>
            <p className="text-xl text-foreground leading-relaxed max-w-3xl">
              Orca abstracts away the technical complexity. For every step it
              picks the best AI models and tools in the world and orchestrates
              them to deliver the best result — so you never have to choose a
              model, wire up a tool, or manage a workflow.
            </p>
            <p className="mt-4 text-base text-brand-muted leading-relaxed max-w-3xl">
              You just say what you want. Progress updates and finished
              deliverables come back to you over the channels you already use.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Text", "Email", "Voice"].map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-brand-border bg-background px-4 py-1.5 text-sm font-medium text-foreground"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>

          <ArchitectureTabs />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
