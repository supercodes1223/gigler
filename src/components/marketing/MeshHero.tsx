"use client";

import { useEffect, useRef, useState } from "react";
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

// Cursor velocity stirs the shader between these resting/agitated values.
const BASE_DISTORTION = 0.72;
const BASE_SWIRL = 0.5;
const STIR_DISTORTION = 0.28; // added at full stir
const STIR_SWIRL = 0.45;

export function MeshHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const meshRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  // Quantized cursor energy (0–1 in eighths) so shader props update on
  // threshold crossings, not at 60fps.
  const [stir, setStir] = useState(0);

  // Pointer layer: parallax on the mesh canvas, a glass lens + tinted glow
  // trailing the cursor (DOM transforms, no re-renders), and cursor velocity
  // feeding the shader's distortion/swirl through the quantized `stir` state.
  useEffect(() => {
    const section = sectionRef.current;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!section || reducedMotion || !finePointer.matches) return;

    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    const cursorTarget = { x: 0, y: 0 };
    const cursorPos = { x: 0, y: 0 };
    const last = { x: 0, y: 0, seen: false };
    let energy = 0;
    let lastStir = 0;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      target.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      cursorTarget.x = e.clientX - rect.left;
      cursorTarget.y = e.clientY - rect.top;
      if (!last.seen) {
        last.seen = true;
        last.x = cursorTarget.x;
        last.y = cursorTarget.y;
        cursorPos.x = cursorTarget.x;
        cursorPos.y = cursorTarget.y;
        if (cursorRef.current) cursorRef.current.style.opacity = "1";
        return;
      }
      const dx = cursorTarget.x - last.x;
      const dy = cursorTarget.y - last.y;
      last.x = cursorTarget.x;
      last.y = cursorTarget.y;
      // Movement pumps energy in; the tick loop bleeds it back out.
      energy = Math.min(1, energy + Math.hypot(dx, dy) * 0.012);
    };

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.06;
      pos.y += (target.y - pos.y) * 0.06;
      cursorPos.x += (cursorTarget.x - cursorPos.x) * 0.12;
      cursorPos.y += (cursorTarget.y - cursorPos.y) * 0.12;
      energy *= 0.97;
      if (meshRef.current) {
        meshRef.current.style.transform = `translate3d(${pos.x * 40}px, ${pos.y * 40}px, 0) scale(1.12)`;
      }
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0) translate(-50%, -50%)`;
      }
      const quantized = Math.round(energy * 8) / 8;
      if (quantized !== lastStir) {
        lastStir = quantized;
        setStir(quantized);
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
      {/* Mesh canvas, oversized so the parallax never shows an edge */}
      <div ref={meshRef} className="absolute inset-0 scale-[1.12] will-change-transform">
        <MeshGradient
          colors={MESH_COLORS}
          distortion={BASE_DISTORTION + stir * STIR_DISTORTION}
          swirl={BASE_SWIRL + stir * STIR_SWIRL}
          speed={reducedMotion ? 0 : 0.4 + stir * 0.5}
          grainMixer={0.12}
          grainOverlay={0}
          className="h-full w-full"
        />
      </div>

      {/* Cursor layer: tinted glow + liquid-glass lens trailing the pointer */}
      <div
        ref={cursorRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 opacity-0 transition-opacity duration-500 will-change-transform"
      >
        {/* Spring-tinted glow, visible against the pastel canvas */}
        <div
          className="absolute left-1/2 top-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(143,201,168,0.4) 0%, rgba(207,229,247,0.28) 36%, transparent 64%)",
            filter: "blur(8px)",
          }}
        />
        {/* Glass lens — bends the light under it, iOS Liquid Glass style */}
        <div
          className="absolute left-1/2 top-1/2 size-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60"
          style={{
            backdropFilter: "blur(14px) saturate(1.9) brightness(1.07)",
            WebkitBackdropFilter: "blur(14px) saturate(1.9) brightness(1.07)",
            boxShadow:
              "inset 0 1px 1px rgba(255,255,255,0.9), inset 0 -10px 24px rgba(255,255,255,0.35), 0 8px 32px -12px rgba(20,30,40,0.18)",
          }}
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
