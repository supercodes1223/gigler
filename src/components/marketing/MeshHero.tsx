"use client";

import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlowMesh } from "./FlowMesh";
import { WaitlistButton } from "./WaitlistButton";

// 10 spots (the shader's max) instead of 5: wave edges appear where spots
// crowd each other, so more spots = edges roll through far more often —
// without changing the animation speed at all. Same palette, plus slightly
// deeper variants of each pastel for depth.
const MESH_COLORS = [
  "#fdfdfb", // airy white keeps the canvas light
  "#c9ecd9", // spring mint
  "#cfe5f7", // spring sky
  "#e2dcf5", // spring lilac
  "#f7efd8", // spring butter
  "#b3e3cb", // deeper mint
  "#fbfcf9", // second white — keeps the canvas from getting too saturated
  "#badbf4", // deeper sky
  "#d4cbf0", // deeper lilac
  "#f2e7c4", // deeper butter
];

export function MeshHero() {
  return (
    <section className="grain relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6">
      {/* Paper Shaders mesh, self-rendered with a cursor flowmap warp: the
          waves bend locally where the cursor moves, then relax. All pointer
          handling lives inside FlowMesh. Slight contrast/saturation lift
          keeps the wave edges legible. */}
      <div
        className="absolute inset-0"
        style={{ filter: "saturate(1.12) contrast(1.07)" }}
      >
        <FlowMesh colors={MESH_COLORS} className="block h-full w-full" />
      </div>

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
