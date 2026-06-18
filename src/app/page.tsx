import type { Metadata } from "next";
import Link from "next/link";
import { GigStatusProvider } from "@/components/GigStatusProvider";
import PromptHero from "@/components/PromptHero";
import SideRail from "@/components/SideRail";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Gigler — Let's get stuff done",
  description:
    "Describe what you need. Gigler plans it, picks the right apps and agents, and gets the gig done — reaching you by text when it needs you.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <GigStatusProvider>
    <main className="flex-1 md:pl-14">
      <SideRail />

      {/* Nav */}
      <nav className="fixed top-0 z-40 w-full border-b border-brand-border bg-background/80 backdrop-blur-md md:pl-14">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-2xl font-bold text-foreground">
            Gigler
          </Link>
          <div className="flex items-center gap-6 text-sm">
            <Link href="/about" className="text-brand-muted transition hover:text-foreground">
              Learn more
            </Link>
            <Link
              href="/pricing"
              className="hidden text-brand-muted transition hover:text-foreground sm:inline"
            >
              Pricing
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-brand-border px-4 py-2 font-medium text-foreground transition hover:bg-brand-surface"
            >
              Log in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — prompt-first */}
      <section className="relative flex min-h-screen items-center justify-center px-6 pt-24 pb-16">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto h-64 max-w-xl rounded-full bg-brand-accent/[0.06] blur-3xl"
          aria-hidden
        />
        <div className="relative w-full">
          <PromptHero />
          <p className="mx-auto mt-10 max-w-md text-center text-sm text-brand-muted">
            Gigler orchestrates frontier AI agents, models, and the apps you
            already use.{" "}
            <Link href="/about" className="text-foreground underline-offset-4 hover:underline">
              Learn how it works
            </Link>
            .
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
    </GigStatusProvider>
  );
}
