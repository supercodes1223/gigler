import type { Metadata } from "next";
import Link from "next/link";
import SmsDemo from "@/components/SmsDemo";

export const metadata: Metadata = {
  title: "Gigler — No Downloads. No Dashboards. Just Text, and It Gets Done.",
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

      {/* Hero — Claude-style: text left, product window right */}
      <section className="pt-28 pb-20 px-6 min-h-[90vh] flex items-center">
        <div className="mx-auto max-w-6xl w-full grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
          <div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6 whitespace-nowrap">
              Gig{" "}
              <span className="rolodex-container">
                <span className="rolodex-word" style={{ color: "#4285F4" }}>conomy</span>
                <span className="rolodex-word" style={{ color: "#34A853" }}>coding</span>
                <span className="rolodex-word" style={{ color: "#F25022" }}>organizing</span>
                <span className="rolodex-word" style={{ color: "#4285F4" }}>planning</span>
                <span className="rolodex-word" style={{ color: "#EA4335" }}>collaborating</span>
                <span className="rolodex-word" style={{ color: "#34A853" }}>facilitating</span>
              </span>
            </h1>
            <p className="text-lg md:text-xl text-brand-muted leading-relaxed mb-8 max-w-lg">
              No downloads. No dashboards.
              <br />
              No learning new workflows.
              <br />
              <strong className="text-foreground">Just text, and it gets done.</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/dashboard"
                className="rounded-full bg-foreground px-8 py-3 text-base font-semibold text-background hover:bg-white transition text-center"
              >
                Get Started Free
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-brand-border px-8 py-3 text-base font-semibold text-foreground hover:bg-brand-surface transition text-center"
              >
                Learn More
              </Link>
            </div>
          </div>

          {/* Right: SMS demo product window */}
          <div className="hidden lg:block">
            <SmsDemo />
          </div>
        </div>
      </section>

      {/* Showcase — what Gigler does */}
      <section className="py-24 px-6 bg-brand-surface">
        <div className="mx-auto max-w-5xl text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            AI that actually does things.
          </h2>
          <p className="text-lg text-brand-muted max-w-2xl mx-auto">
            Plan events. Build websites. Form an LLC. Make reservations.
            Gigler handles it all — over text.
          </p>
        </div>

        <div className="mx-auto max-w-5xl grid md:grid-cols-3 gap-8">
          {[
            {
              icon: "💬",
              title: "Text it",
              description: "Tell Gigler what you need in plain English. No forms, no menus, no learning curve.",
            },
            {
              icon: "⚡",
              title: "It gets done",
              description: "AI manages your gig — coordinates, creates, reminds, and executes. No app needed.",
            },
            {
              icon: "📦",
              title: "Real output",
              description: "Get deliverables: live websites, PDFs, reservations, photo collages — all from a text thread.",
            },
          ].map((item) => (
            <div key={item.title} className="text-center p-8">
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold mb-3">{item.title}</h3>
              <p className="text-brand-muted leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to get things done?
          </h2>
          <p className="text-lg text-brand-muted mb-10">
            No downloads. No dashboards. Just text Gigler.
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-full bg-foreground px-10 py-4 text-lg font-semibold text-background hover:bg-white transition"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-brand-border">
        <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-brand-muted">
            &copy; {new Date().getFullYear()} Gigler. All rights reserved.
          </div>
          <div className="flex gap-6 text-sm text-brand-muted">
            <Link href="/about" className="hover:text-foreground transition">About</Link>
            <Link href="/pricing" className="hover:text-foreground transition">Pricing</Link>
            <Link href="/careers" className="hover:text-foreground transition">Careers</Link>
            <Link href="/dashboard" className="hover:text-foreground transition">Dashboard</Link>
          </div>
          <div className="text-sm text-brand-muted">gigler.ai</div>
        </div>
      </footer>
    </main>
  );
}
