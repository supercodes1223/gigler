import type { Metadata } from "next";
import Link from "next/link";
import GiglerHeroDemo from "@/components/GiglerHeroDemo";

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
          <details className="relative md:hidden">
            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full border border-brand-border bg-brand-surface text-foreground transition hover:bg-brand-surface-hover">
              <span className="sr-only">Open navigation menu</span>
              <span className="flex flex-col gap-1">
                <span className="block h-0.5 w-4 rounded-full bg-current" />
                <span className="block h-0.5 w-4 rounded-full bg-current" />
                <span className="block h-0.5 w-4 rounded-full bg-current" />
              </span>
            </summary>
            <div className="absolute right-0 top-14 w-56 rounded-2xl border border-brand-border bg-background-alt/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <Link
                href="/about"
                className="block rounded-xl px-4 py-3 text-sm font-medium text-brand-muted transition hover:bg-brand-surface hover:text-foreground"
              >
                About
              </Link>
              <Link
                href="/pricing"
                className="block rounded-xl px-4 py-3 text-sm font-medium text-brand-muted transition hover:bg-brand-surface hover:text-foreground"
              >
                Pricing
              </Link>
              <Link
                href="/careers"
                className="block rounded-xl px-4 py-3 text-sm font-medium text-brand-muted transition hover:bg-brand-surface hover:text-foreground"
              >
                Careers
              </Link>
              <Link
                href="/dashboard"
                className="mt-1 block rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:bg-white"
              >
                Get Started Free
              </Link>
            </div>
          </details>
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
            <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6">
              <span className="inline-flex items-baseline gigler-glow" style={{ gap: "0" }}>
                <span>Gig</span>
                <span className="rolodex-container">
                  <span className="rolodex-word" style={{ color: "#4285F4" }}>economy</span>
                  <span className="rolodex-word" style={{ color: "#34A853" }}>coding</span>
                  <span className="rolodex-word" style={{ color: "#F25022" }}>organizing</span>
                  <span className="rolodex-word" style={{ color: "#4285F4" }}>planning</span>
                  <span className="rolodex-word" style={{ color: "#EA4335" }}>collaborating</span>
                  <span className="rolodex-word" style={{ color: "#34A853" }}>facilitating</span>
                  <span className="rolodex-word">ler</span>
                </span>
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

          {/* Right (desktop) / Below (mobile): Two-phase demo */}
          <div className="mt-12 lg:mt-0">
            <div className="ai-glow relative">
              <GiglerHeroDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Showcase — deliverable types */}
      <section className="py-24 px-6 bg-brand-surface">
        <div className="mx-auto max-w-5xl text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Text it. Gigler builds it.
          </h2>
          <p className="text-lg text-brand-muted max-w-2xl mx-auto">
            From a single text thread, Gigler creates real, shareable deliverables.
          </p>
        </div>

        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {[
            {
              title: "Bills Dashboard",
              description: "Track and organize utility bills with auto-extraction.",
              preview: (
                <div className="space-y-1">
                  <div className="flex gap-1 text-[7px] uppercase text-zinc-500">
                    <span className="flex-1">Bill</span><span className="w-10 text-right">Amt</span><span className="w-10 text-right">Status</span>
                  </div>
                  <div className="flex gap-1 text-[8px]">
                    <span className="flex-1 text-zinc-400">Power</span>
                    <span className="w-10 text-right text-zinc-400">$528</span>
                    <span className="w-10 text-right"><span className="px-1 rounded bg-yellow-500/20 text-yellow-500 text-[7px]">Due</span></span>
                  </div>
                  <div className="flex gap-1 text-[8px]">
                    <span className="flex-1 text-zinc-400">Water</span>
                    <span className="w-10 text-right text-zinc-400">$87</span>
                    <span className="w-10 text-right"><span className="px-1 rounded bg-green-500/20 text-green-500 text-[7px]">Paid</span></span>
                  </div>
                  <div className="flex gap-1 text-[8px]">
                    <span className="flex-1 text-zinc-400">Internet</span>
                    <span className="w-10 text-right text-zinc-400">$65</span>
                    <span className="w-10 text-right"><span className="px-1 rounded bg-green-500/20 text-green-500 text-[7px]">Paid</span></span>
                  </div>
                </div>
              ),
            },
            {
              title: "Landing Pages",
              description: "Full websites from a text description.",
              preview: (
                <div className="space-y-1.5">
                  <div className="h-6 rounded bg-zinc-800 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-zinc-400">Brew & Co.</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="h-3 flex-1 rounded bg-zinc-800" />
                    <div className="h-3 flex-1 rounded bg-zinc-800" />
                  </div>
                  <div className="h-2.5 rounded bg-zinc-800 w-3/4" />
                </div>
              ),
            },
            {
              title: "Event Planning",
              description: "Coordinate parties, meetings, and gatherings.",
              preview: (
                <div className="space-y-1 text-[8px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-green-500">✓</span><span className="text-zinc-400">Book venue</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-green-500">✓</span><span className="text-zinc-400">Send invites (40)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-yellow-500">○</span><span className="text-zinc-400">Order catering</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-600">○</span><span className="text-zinc-500">Set up playlist</span>
                  </div>
                </div>
              ),
            },
            {
              title: "Photo Collages",
              description: "Organize and share event or project photos.",
              preview: (
                <div className="grid grid-cols-3 gap-0.5">
                  <div className="aspect-square rounded-sm bg-purple-900/40" />
                  <div className="aspect-square rounded-sm bg-blue-900/40" />
                  <div className="aspect-square rounded-sm bg-teal-900/40" />
                  <div className="aspect-square rounded-sm bg-pink-900/40" />
                  <div className="aspect-square rounded-sm bg-amber-900/40" />
                  <div className="aspect-square rounded-sm bg-indigo-900/40" />
                </div>
              ),
            },
            {
              title: "PDFs & Reports",
              description: "Generate polished documents and summaries.",
              preview: (
                <div className="space-y-1.5 px-1">
                  <div className="h-1.5 rounded-full bg-zinc-700 w-full" />
                  <div className="h-1.5 rounded-full bg-zinc-700 w-4/5" />
                  <div className="h-1.5 rounded-full bg-zinc-800 w-full mt-2" />
                  <div className="h-1.5 rounded-full bg-zinc-800 w-3/5" />
                  <div className="h-1.5 rounded-full bg-zinc-800 w-4/5 mt-2" />
                </div>
              ),
            },
            {
              title: "Restaurant Menus",
              description: "Beautiful menus ready to print or share online.",
              preview: (
                <div className="flex gap-2 text-[7px]">
                  <div className="flex-1 space-y-1">
                    <div className="text-zinc-500 uppercase font-bold text-[6px]">Mains</div>
                    <div className="text-zinc-400">Burger · $14</div>
                    <div className="text-zinc-400">Pasta · $16</div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-zinc-500 uppercase font-bold text-[6px]">Drinks</div>
                    <div className="text-zinc-400">Latte · $5</div>
                    <div className="text-zinc-400">Juice · $4</div>
                  </div>
                </div>
              ),
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group rounded-xl border border-brand-border bg-background p-4 transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 hover:scale-[1.02]"
            >
              <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 mb-3 h-24 flex flex-col justify-center overflow-hidden">
                {item.preview}
              </div>
              <h3 className="text-sm font-bold mb-1">{item.title}</h3>
              <p className="text-xs text-brand-muted leading-relaxed">{item.description}</p>
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
