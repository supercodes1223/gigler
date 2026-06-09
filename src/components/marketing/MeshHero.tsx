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
  const blobRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Pointer-distortion layer: the shader animates itself; the cursor adds a
  // gentle parallax on the mesh canvas plus a trailing light blob. Pure DOM
  // transforms — no React re-renders, no shader uniform churn.
  useEffect(() => {
    const section = sectionRef.current;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!section || reducedMotion || !finePointer.matches) return;

    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    const blobTarget = { x: 0, y: 0 };
    const blobPos = { x: 0, y: 0 };
    let blobSeen = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      target.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      blobTarget.x = e.clientX - rect.left;
      blobTarget.y = e.clientY - rect.top;
      if (!blobSeen && blobRef.current) {
        blobSeen = true;
        blobPos.x = blobTarget.x;
        blobPos.y = blobTarget.y;
        blobRef.current.style.opacity = "1";
      }
    };

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.05;
      pos.y += (target.y - pos.y) * 0.05;
      blobPos.x += (blobTarget.x - blobPos.x) * 0.09;
      blobPos.y += (blobTarget.y - blobPos.y) * 0.09;
      if (meshRef.current) {
        meshRef.current.style.transform = `translate3d(${pos.x * 18}px, ${pos.y * 18}px, 0) scale(1.08)`;
      }
      if (blobRef.current) {
        blobRef.current.style.transform = `translate3d(${blobPos.x}px, ${blobPos.y}px, 0) translate(-50%, -50%)`;
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
      {/* Mesh canvas, slightly oversized so the parallax never shows an edge */}
      <div ref={meshRef} className="absolute inset-0 scale-[1.08] will-change-transform">
        <MeshGradient
          colors={MESH_COLORS}
          distortion={0.9}
          swirl={0.6}
          speed={reducedMotion ? 0 : 0.4}
          grainMixer={0.12}
          grainOverlay={0}
          className="h-full w-full"
        />
      </div>

      {/* Cursor light — reads as light moving under frosted glass */}
      <div
        ref={blobRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 size-[34rem] rounded-full opacity-0 transition-opacity duration-700 will-change-transform"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.18) 38%, transparent 62%)",
          mixBlendMode: "soft-light",
        }}
      />

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
