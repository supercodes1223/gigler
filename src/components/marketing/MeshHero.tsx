"use client";

import { useEffect, useRef } from "react";
import { MeshGradient } from "@paper-design/shaders-react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { WaitlistButton } from "./WaitlistButton";

const MESH_COLORS = [
  "#fdfdfb", // airy white keeps the canvas light
  "#c9ecd9", // spring mint
  "#cfe5f7", // spring sky
  "#e2dcf5", // spring lilac
  "#f7efd8", // spring butter
];

export function MeshHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const meshRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Cursor influence is invisible and lives entirely on the compositor.
  // The shader's uniforms are never touched at runtime — live updates to
  // distortion/swirl/speed make the pattern jump (the field is not continuous
  // under parameter changes), which reads as flicker. Instead the cursor
  // drives CSS transforms on the canvas: position sways the whole field
  // (parallax + slight tilt) and movement speed makes it swell. Continuous
  // math, GPU-composited, smooth by construction.
  useEffect(() => {
    const section = sectionRef.current;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!section || reducedMotion || !finePointer.matches) return;

    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    const last = { x: 0, y: 0, seen: false };
    let energy = 0;
    let swell = 0; // eased follower of energy
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      target.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      if (!last.seen) {
        last.seen = true;
        last.x = e.clientX;
        last.y = e.clientY;
        return;
      }
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last.x = e.clientX;
      last.y = e.clientY;
      // Movement pumps energy in; the tick loop bleeds it back out.
      energy = Math.min(1, energy + Math.hypot(dx, dy) * 0.012);
    };

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.06;
      pos.y += (target.y - pos.y) * 0.06;
      energy *= 0.97;
      swell += (energy - swell) * 0.06;
      if (meshRef.current) {
        const scale = 1.16 + swell * 0.05;
        const rot = pos.x * (0.4 + swell * 0.8);
        meshRef.current.style.transform = `translate3d(${pos.x * 44}px, ${pos.y * 44}px, 0) scale(${scale.toFixed(4)}) rotate(${rot.toFixed(3)}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };

    section.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      section.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      className="grain relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6"
    >
      {/* Mesh canvas, oversized so the parallax never shows an edge.
          Slight contrast/saturation lift keeps the wave edges legible. */}
      <div
        ref={meshRef}
        className="absolute inset-0 scale-[1.16] will-change-transform"
        style={{ filter: "saturate(1.12) contrast(1.07)" }}
      >
        <MeshGradient
          colors={MESH_COLORS}
          distortion={0.85}
          swirl={0.6}
          speed={reducedMotion ? 0 : 0.4}
          grainMixer={0.16}
          grainOverlay={0}
          className="h-full w-full"
        />
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
