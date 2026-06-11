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
            className="group relative h-12 overflow-hidden rounded-full border border-transparent px-6 text-base text-foreground/85 backdrop-blur-0 transition-all duration-300 hover:border-foreground/6 hover:bg-white/35 hover:text-foreground hover:backdrop-blur-md"
          >
            <a href="#demo">
              {/* Diffused spring-palette glow, frosted by the backdrop blur.
                  Inline gradient: Tailwind v4 arbitrary gradient classes
                  don't compile here (see memory). */}
              <span
                aria-hidden
                className="absolute -inset-3 -z-10 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-70"
                style={{
                  background:
                    "linear-gradient(110deg, #c9ecd9, #cfe5f7 35%, #e2dcf5 65%, #f7efd8)",
                }}
              />
              See it in action
              <ArrowDown className="size-4" aria-hidden />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
