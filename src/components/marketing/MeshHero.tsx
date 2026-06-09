"use client";

import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpringMesh } from "./SpringMesh";
import { WaitlistButton } from "./WaitlistButton";

const MESH_COLORS: [string, string, string, string, string] = [
  "#fdfdfb", // airy white keeps the canvas light
  "#c9ecd9", // spring mint
  "#cfe5f7", // spring sky
  "#e2dcf5", // spring lilac
  "#f7efd8", // spring butter
];

export function MeshHero() {
  return (
    <section className="grain relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6">
      {/* Custom shader canvas — the cursor is a uniform, so the waves bend
          around it per-pixel. All pointer handling lives in SpringMesh. */}
      <div className="absolute inset-0">
        <SpringMesh colors={MESH_COLORS} className="block h-full w-full" />
      </div>

      {/* Veil into the white page below */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />

      <div className="relative z-10 flex max-w-3xl flex-col items-center text-center">
        <p className="rise-in mb-6 text-xs font-medium uppercase tracking-[0.28em] text-foreground/55">
          Gigler — your personal assistant
        </p>
        <h1
          className="rise-in text-balance text-5xl font-semibold leading-[1.04] tracking-tight text-foreground sm:text-6xl md:text-7xl"
          style={{ animationDelay: "90ms" }}
        >
          Text it. Call it.
          <br />
          Email it. Done.
        </h1>
        <p
          className="rise-in mt-6 max-w-xl text-balance text-lg leading-relaxed text-foreground/70 md:text-xl"
          style={{ animationDelay: "180ms" }}
        >
          Gigler texts, calls, and emails like a real person — it remembers
          your life and actually gets things done. No app to download.
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
            className="h-12 rounded-full px-6 text-base text-foreground/70 hover:bg-white/40"
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
