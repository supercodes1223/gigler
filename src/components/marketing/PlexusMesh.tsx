"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";

// Constellation / plexus mesh: drifting points connected by faint lines where
// they come close. The cursor attracts nearby points so the web gathers
// around it, then relaxes. Plain 2D canvas — at ~150 points the O(n²) line
// pass is cheap, no WebGL required.

// ── Feel knobs ──────────────────────────────────────────────────────────────

const POINT_AREA = 7000; // px² of canvas per point (density)
const MIN_POINTS = 110;
const MAX_POINTS = 320;
const DRIFT_SPEED = 14; // px/s ambient drift
const LINK_DIST_FRAC = 14; // link distance = diagonal / this, clamped below
const LINK_DIST_MIN = 80;
const LINK_DIST_MAX = 150;
const ATTRACT_RADIUS = 200; // px around cursor that responds
const ATTRACT_PULL = 40; // max px a point leans toward the cursor
const ATTRACT_EASE = 0.07; // per-frame easing toward/away from the cursor
const LINE_ALPHA = 0.32; // line opacity at zero distance
const DOT_ALPHA = 0.7;
const ACCENT_EVERY = 7; // every Nth point is a spring-leaf accent
const INK = "52, 70, 65"; // muted slate-green, rgb
const ACCENT = "78, 148, 110"; // deeper spring-leaf, rgb

type Point = {
  x: number; // position, px
  y: number;
  vx: number; // drift velocity, px/s
  vy: number;
  ox: number; // cursor-attraction offset, px (eased)
  oy: number;
};

function makePoints(w: number, h: number): Point[] {
  const count = Math.min(MAX_POINTS, Math.max(MIN_POINTS, Math.round((w * h) / POINT_AREA)));
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = DRIFT_SPEED * (0.5 + Math.random());
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ox: 0,
      oy: 0,
    };
  });
}

type PlexusMeshProps = {
  className?: string;
};

export function PlexusMesh({ className }: PlexusMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let points: Point[] = [];

    const resize = () => {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (cw === w && ch === h) return;
      w = cw;
      h = ch;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      points = makePoints(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Cursor in canvas coordinates; far offscreen means "no cursor".
    const mouse = { x: -1e6, y: -1e6 };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -1e6;
      mouse.y = -1e6;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerout", onLeave);

    const linkDist = () =>
      Math.min(LINK_DIST_MAX, Math.max(LINK_DIST_MIN, Math.hypot(w, h) / LINK_DIST_FRAC));

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      const maxDist = linkDist();

      for (const p of points) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x < 0) (p.x = 0), (p.vx = Math.abs(p.vx));
        if (p.x > w) (p.x = w), (p.vx = -Math.abs(p.vx));
        if (p.y < 0) (p.y = 0), (p.vy = Math.abs(p.vy));
        if (p.y > h) (p.y = h), (p.vy = -Math.abs(p.vy));

        const dx = mouse.x - (p.x + p.ox);
        const dy = mouse.y - (p.y + p.oy);
        const d = Math.hypot(dx, dy);
        const pull = Math.max(0, 1 - d / ATTRACT_RADIUS) * ATTRACT_PULL;
        const tx = d > 1 ? (dx / d) * pull : 0;
        const ty = d > 1 ? (dy / d) * pull : 0;
        p.ox += (tx - p.ox) * ATTRACT_EASE;
        p.oy += (ty - p.oy) * ATTRACT_EASE;
      }

      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const ax = a.x + a.ox;
        const ay = a.y + a.oy;
        for (let j = i + 1; j < points.length; j++) {
          const b = points[j];
          const bx = b.x + b.ox;
          const by = b.y + b.oy;
          const d = Math.hypot(ax - bx, ay - by);
          if (d >= maxDist) continue;
          ctx.strokeStyle = `rgba(${INK}, ${LINE_ALPHA * (1 - d / maxDist)})`;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const accent = i % ACCENT_EVERY === 0;
        ctx.fillStyle = accent
          ? `rgba(${ACCENT}, ${DOT_ALPHA + 0.25})`
          : `rgba(${INK}, ${DOT_ALPHA})`;
        ctx.beginPath();
        ctx.arc(p.x + p.ox, p.y + p.oy, accent ? 2.2 : 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let raf = 0;
    let lastT = performance.now();
    let running = true;

    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      draw(dt);
      raf = requestAnimationFrame(frame);
    };

    if (reducedMotion) {
      // Single static frame: points at rest, no cursor, no loop.
      draw(0);
    }

    const io = new IntersectionObserver(([entry]) => {
      if (reducedMotion) return;
      running = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (running) {
        lastT = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(canvas);

    return () => {
      running = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onLeave);
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [reducedMotion]);

  return <canvas ref={canvasRef} className={className} aria-hidden />;
}
