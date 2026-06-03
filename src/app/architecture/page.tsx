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
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-accent mb-4">
            System Architecture · Gigler Orca
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-8">
            How Gigler turns a request into completed work
          </h1>

          <ArchitectureTabs />

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
