"use client";

import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlexusMesh } from "./PlexusMesh";
import { WaitlistButton } from "./WaitlistButton";

export function MeshHero() {
  return (
    <section className="grain relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#fdfdfb] px-6">
      {/* Constellation mesh: drifting points + faint links that gather around
          the cursor. All pointer handling lives inside PlexusMesh. */}
      <div className="absolute inset-0">
        <PlexusMesh className="block h-full w-full" />
      </div>

      {/* Soft radial fade behind the headline keeps the text legible over the
          mesh lines. Inline style: Tailwind v4 arbitrary radial-gradient
          classes don't compile here (see memory). */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 48%, rgba(253,253,251,0.9) 0%, rgba(253,253,251,0.55) 55%, rgba(253,253,251,0) 100%)",
        }}
      />

      {/* Veil into the white page below */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />

      <div className="relative z-10 flex max-w-3xl flex-col items-center text-center">
        <h1
          className="rise-in text-balance text-5xl font-semibold leading-[1.04] tracking-tight text-foreground sm:text-6xl md:text-7xl"
          style={{ animationDelay: "90ms" }}
        >
          Ask Anything.
          <br />
          Consider it done.
        </h1>
        <p
          className="rise-in mt-6 max-w-xl text-balance text-lg leading-relaxed text-foreground/70 md:text-xl"
          style={{ animationDelay: "180ms" }}
        >
          Gigler texts, calls, and emails like a real person. It remembers
          your life and actually gets things done for you.
        </p>
        <div
          className="rise-in mt-9 flex flex-col items-center gap-3 sm:flex-row"
          style={{ animationDelay: "270ms" }}
        >
          <WaitlistButton size="lg" className="h-12 px-7 text-base shadow-lg shadow-spring-leaf/20" />
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="h-12 rounded-full border border-transparent px-6 text-base text-foreground/85 transition-colors hover:border-foreground/6 hover:bg-white/40 hover:text-foreground"
          >
            <a href="#demo">
              See it in action
              <ArrowDown className="size-4" aria-hidden />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
