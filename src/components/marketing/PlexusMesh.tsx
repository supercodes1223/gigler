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
const EMPHASIS_RADIUS = 260; // px around cursor where dots/lines firm up
const EMPHASIS_PUNCH = 1.5; // how fast the emphasis saturates inside that radius
const INK = "52, 70, 65"; // muted slate-green, rgb

// Light pulses: a glint spawns every few seconds, picks a path of linked
// points, races along it with a fading trail, and dies at the last node.
// Stare for ~3s and you should catch one, maybe two — never a light show.
const PULSE_EVERY_MIN = 1.4; // s between spawn attempts
const PULSE_EVERY_MAX = 2.8;
const PULSE_SPEED = 620; // px/s along the path
const PULSE_TRAIL = 90; // px of fading trail behind the head
const PULSE_HOPS_MIN = 3; // path length in links
const PULSE_HOPS_MAX = 6;
const MAX_PULSES = 3; // concurrent cap

type Point = {
  x: number; // position, px
  y: number;
  vx: number; // drift velocity, px/s
  vy: number;
  ox: number; // cursor-attraction offset, px (eased)
  oy: number;
  near: number; // 0..1 cursor proximity, updated each frame
};

type Pulse = {
  path: number[]; // point indices; positions are read live so the path bends
  s: number; // head distance traveled along the path, px
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
      near: 0,
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

    const pulses: Pulse[] = [];
    let nextPulseIn = PULSE_EVERY_MIN;

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
      pulses.length = 0; // point indices are invalid after a reseed
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

    // Random walk across linked points, no revisits.
    const spawnPulse = (maxDist: number) => {
      const start = Math.floor(Math.random() * points.length);
      const path = [start];
      const visited = new Set(path);
      const hops =
        PULSE_HOPS_MIN + Math.floor(Math.random() * (PULSE_HOPS_MAX - PULSE_HOPS_MIN + 1));
      let cur = start;
      for (let k = 0; k < hops; k++) {
        const c = points[cur];
        const cx = c.x + c.ox;
        const cy = c.y + c.oy;
        const candidates: number[] = [];
        for (let i = 0; i < points.length; i++) {
          if (visited.has(i)) continue;
          const p = points[i];
          const d = Math.hypot(p.x + p.ox - cx, p.y + p.oy - cy);
          if (d < maxDist && d > 10) candidates.push(i);
        }
        if (candidates.length === 0) break;
        const next = candidates[Math.floor(Math.random() * candidates.length)];
        visited.add(next);
        path.push(next);
        cur = next;
      }
      if (path.length >= 2) pulses.push({ path, s: 0 });
    };

    const drawPulses = (dt: number) => {
      nextPulseIn -= dt;
      if (nextPulseIn <= 0 && pulses.length < MAX_PULSES) {
        spawnPulse(linkDist());
        nextPulseIn = PULSE_EVERY_MIN + Math.random() * (PULSE_EVERY_MAX - PULSE_EVERY_MIN);
      }

      for (let k = pulses.length - 1; k >= 0; k--) {
        const pu = pulses[k];
        pu.s += PULSE_SPEED * dt;

        // Live polyline of the path with cumulative segment lengths.
        const pts = pu.path.map((idx) => {
          const p = points[idx];
          return [p.x + p.ox, p.y + p.oy] as const;
        });
        const cum = [0];
        for (let i = 1; i < pts.length; i++) {
          cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
        }
        const total = cum[cum.length - 1];

        // Dead once the trail has fully shrunk into the last node.
        if (pu.s - PULSE_TRAIL > total) {
          pulses.splice(k, 1);
          continue;
        }

        const at = (s: number): readonly [number, number] => {
          for (let i = 1; i < cum.length; i++) {
            if (s <= cum[i]) {
              const t = (s - cum[i - 1]) / Math.max(cum[i] - cum[i - 1], 1e-6);
              return [
                pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
                pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t,
              ];
            }
          }
          return pts[pts.length - 1];
        };

        const head = Math.min(pu.s, total);
        const tail = Math.max(0, pu.s - PULSE_TRAIL);

        // Trail sub-segments split at path vertices, alpha rising toward the
        // head. White core over a darkened underlay so the glint reads as
        // light on the near-white background.
        const stops = [tail, ...cum.filter((c) => c > tail && c < head), head];
        for (let m = 0; m < stops.length - 1; m++) {
          const s0 = stops[m];
          const s1 = stops[m + 1];
          const a = ((s0 + s1) / 2 - tail) / Math.max(head - tail, 1e-6);
          const [x0, y0] = at(s0);
          const [x1, y1] = at(s1);
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = `rgba(${INK}, ${0.32 * a})`;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
          // Bright white core with a soft glow.
          ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
          ctx.shadowBlur = 5;
          ctx.lineWidth = 0.9;
          ctx.strokeStyle = `rgba(255, 255, 255, ${a})`;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        const [hx, hy] = at(head);
        ctx.fillStyle = `rgba(${INK}, 0.26)`;
        ctx.beginPath();
        ctx.arc(hx, hy, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = "rgba(255, 255, 255, 0.95)";
        ctx.shadowBlur = 7;
        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        ctx.beginPath();
        ctx.arc(hx, hy, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.lineWidth = 1;
    };

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
        p.near = Math.min(1, Math.max(0, 1 - d / EMPHASIS_RADIUS) * EMPHASIS_PUNCH);
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
          // Lines firm up slightly toward the stronger endpoint's emphasis.
          const t = Math.max(a.near, b.near);
          const alpha = (LINE_ALPHA + 0.18 * t) * (1 - d / maxDist);
          ctx.strokeStyle = `rgba(${INK}, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(bx, by);
          ctx.stroke();
        }
      }

      for (const p of points) {
        ctx.fillStyle = `rgba(${INK}, ${DOT_ALPHA + 0.2 * p.near})`;
        ctx.beginPath();
        ctx.arc(p.x + p.ox, p.y + p.oy, 1.7 + 0.9 * p.near, 0, Math.PI * 2);
        ctx.fill();
      }

      // No pulses on the reduced-motion static frame (dt === 0).
      if (dt > 0) drawPulses(dt);
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
