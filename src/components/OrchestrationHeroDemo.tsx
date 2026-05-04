"use client";

import { useEffect, useState, type ReactNode } from "react";

// ────────────────────────────────────────────────────────────────────────────
//  Ambient floating-icons hero illustration
//
//  Inspired by https://replit.com/partners — a calm decentralised
//  constellation of symbolic icons drifting in their own paths. No frame,
//  no anchor, no scenes, no narrative. Just atmosphere that suggests an
//  active orchestration ecosystem in our brand colours.
// ────────────────────────────────────────────────────────────────────────────

// Reduced-motion is handled in CSS via @media query (see globals.css). We
// still avoid mounting animation deltas on the server to keep hydration clean.
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

// ────────────────────────────────────────────────────────────────────────────
//  Icon glyphs — each is a small, mostly self-contained illustration that
//  reads at small sizes. Two-tone where it helps; otherwise solid.
// ────────────────────────────────────────────────────────────────────────────

type GlyphProps = { size: number; color: string };

function ChatGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <path
        d="M14 18 Q14 8 24 8 H80 Q90 8 90 18 V58 Q90 68 80 68 H46 L28 84 V68 H24 Q14 68 14 58 Z"
        fill={color}
      />
      <circle cx="38" cy="42" r="4" fill="rgba(255,255,255,0.75)" />
      <circle cx="52" cy="42" r="4" fill="rgba(255,255,255,0.55)" />
      <circle cx="66" cy="42" r="4" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

function CodeWindowGlyph({ size }: GlyphProps) {
  return (
    <svg width={size} height={size * 0.66} viewBox="0 0 150 100" fill="none" aria-hidden>
      <rect x="2" y="2" width="146" height="96" rx="10" fill="#0f172a" stroke="#1f2937" strokeWidth="1" />
      <rect x="2" y="2" width="146" height="18" rx="10" fill="#1e293b" />
      <circle cx="12" cy="11" r="2.5" fill="#ef4444" opacity="0.7" />
      <circle cx="22" cy="11" r="2.5" fill="#facc15" opacity="0.7" />
      <circle cx="32" cy="11" r="2.5" fill="#22c55e" opacity="0.7" />
      {/* faux code lines */}
      <rect x="12" y="32" width="22" height="4" rx="1.5" fill="#a78bfa" />
      <rect x="38" y="32" width="38" height="4" rx="1.5" fill="#22d3ee" />
      <rect x="80" y="32" width="20" height="4" rx="1.5" fill="#34d399" />
      <rect x="12" y="44" width="14" height="4" rx="1.5" fill="#a78bfa" />
      <rect x="30" y="44" width="42" height="4" rx="1.5" fill="#fbbf24" />
      <rect x="76" y="44" width="32" height="4" rx="1.5" fill="#22d3ee" />
      <rect x="12" y="56" width="50" height="4" rx="1.5" fill="#34d399" />
      <rect x="66" y="56" width="22" height="4" rx="1.5" fill="#a78bfa" />
      <rect x="12" y="68" width="28" height="4" rx="1.5" fill="#22d3ee" />
      <rect x="44" y="68" width="36" height="4" rx="1.5" fill="#fbbf24" />
      <rect x="12" y="80" width="60" height="4" rx="1.5" fill="#34d399" />
    </svg>
  );
}

function ChartGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <rect x="14" y="58" width="14" height="34" rx="2" fill={color} opacity="0.6" />
      <rect x="34" y="40" width="14" height="52" rx="2" fill={color} opacity="0.85" />
      <rect x="54" y="22" width="14" height="70" rx="2" fill={color} />
      <rect x="74" y="48" width="14" height="44" rx="2" fill={color} opacity="0.7" />
    </svg>
  );
}

function DocGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <rect x="18" y="10" width="64" height="80" rx="6" fill={color} />
      <rect x="28" y="26" width="44" height="4" rx="1.5" fill="rgba(0,0,0,0.25)" />
      <rect x="28" y="38" width="36" height="4" rx="1.5" fill="rgba(0,0,0,0.18)" />
      <rect x="28" y="50" width="44" height="4" rx="1.5" fill="rgba(0,0,0,0.18)" />
      <rect x="28" y="62" width="28" height="4" rx="1.5" fill="rgba(0,0,0,0.18)" />
      <rect x="28" y="74" width="40" height="4" rx="1.5" fill="rgba(0,0,0,0.13)" />
    </svg>
  );
}

function CubesGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      {[
        [16, 16],
        [54, 16],
        [16, 54],
        [54, 54],
      ].map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="30" height="30" rx="5" fill={color} opacity={0.85} />
          <rect x={x} y={y} width="30" height="30" rx="5" fill="rgba(255,255,255,0.18)" />
          <rect x={x + 4} y={y + 4} width="22" height="22" rx="3" fill="rgba(255,255,255,0.12)" />
        </g>
      ))}
    </svg>
  );
}

function MailGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <rect x="10" y="22" width="80" height="56" rx="6" fill={color} />
      <path d="M10 28 L50 56 L90 28" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function GlobeGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={color} strokeWidth="3" aria-hidden>
      <circle cx="50" cy="50" r="40" fill={color} fillOpacity="0.18" />
      <circle cx="50" cy="50" r="40" />
      <line x1="10" y1="50" x2="90" y2="50" />
      <ellipse cx="50" cy="50" rx="20" ry="40" />
    </svg>
  );
}

function SparkleGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill={color} aria-hidden>
      <path d="M50 6 L58 42 L94 50 L58 58 L50 94 L42 58 L6 50 L42 42 Z" />
    </svg>
  );
}

function CompassGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={color} stroke="none" />
    </svg>
  );
}

function CheckGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DotGlyph({ size, color }: GlyphProps) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "9999px",
        background: color,
      }}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Floating wrapper — applies position, animation, and a soft halo glow
// ────────────────────────────────────────────────────────────────────────────

type Variant = "a" | "b" | "c";

function FloatingItem({
  xPct,
  yPct,
  size,
  glowColor,
  variant,
  duration,
  delay,
  rotateDeg = 0,
  mounted,
  children,
}: {
  xPct: number;
  yPct: number;
  size: number;
  glowColor?: string;
  variant: Variant;
  duration: number;
  delay: number;
  rotateDeg?: number;
  mounted: boolean;
  children: ReactNode;
}) {
  const animationStyles = mounted
    ? {
        animationName: `float-${variant}`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        animationIterationCount: "infinite" as const,
        animationTimingFunction: "ease-in-out" as const,
      }
    : {};

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 will-change-transform float-${variant}`}
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        transform: `rotate(${rotateDeg}deg)`,
        ...animationStyles,
      }}
    >
      {/* soft halo so each colored icon glows on the dark page */}
      {glowColor ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            width: size,
            height: size,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, ${glowColor}55 0%, ${glowColor}22 35%, transparent 70%)`,
            filter: "blur(12px)",
            zIndex: -1,
          }}
        />
      ) : null}
      <div className="relative flex items-center justify-center">{children}</div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Item layout — coordinates expressed as % of the container box
//  (positions tuned so nothing overlaps and the composition feels balanced).
// ────────────────────────────────────────────────────────────────────────────

type Item = {
  id: string;
  kind:
    | "chat"
    | "chart"
    | "doc"
    | "cubes"
    | "mail"
    | "globe"
    | "sparkle"
    | "dot"
    | "code";
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
  variant: Variant;
  rotate?: number;
};

// All 5 agents share the same size for visual hierarchy — the only "bigger"
// element should be the central Hub pill. AGENT_SIZE is used for every agent
// so the row reads as a uniform tier.
const AGENT_SIZE = 56;

const ITEMS: Item[] = [
  // ── 5 Agents in the middle row — Hub→Plan→[these 5]→Delivered ─────────
  // Positions match AGENTS[] above so connection lines terminate at icons.
  { id: "agent-chat",  kind: "chat",  x: 14, y: 60, size: AGENT_SIZE, color: "#4285F4", duration: 14, delay: 0,   variant: "a" },
  { id: "agent-code",  kind: "code",  x: 32, y: 60, size: AGENT_SIZE + 8, color: "#0f172a", duration: 16, delay: 1,   variant: "b", rotate: -1 },
  { id: "agent-chart", kind: "chart", x: 50, y: 60, size: AGENT_SIZE, color: "#9b59b6", duration: 13, delay: 2,   variant: "c" },
  { id: "agent-doc",   kind: "doc",   x: 68, y: 60, size: AGENT_SIZE, color: "#FBBC05", duration: 15, delay: 0.5, variant: "a" },
  { id: "agent-cubes", kind: "cubes", x: 86, y: 60, size: AGENT_SIZE, color: "#34A853", duration: 17, delay: 1.5, variant: "b", rotate: 4 },

  // ── Ambient accents in the corners (well clear of the vertical flow) ──
  { id: "sparkle-1", kind: "sparkle", x: 88, y: 10, size: 18, color: "#FBBC05", duration: 13, delay: 0, variant: "b" },
  { id: "sparkle-2", kind: "sparkle", x: 12, y: 10, size: 14, color: "#22d3ee", duration: 11, delay: 2, variant: "a" },
  { id: "dot-1",     kind: "dot",     x: 8,  y: 88, size: 5,  color: "#4285F4", duration: 10, delay: 0, variant: "a" },
  { id: "dot-2",     kind: "dot",     x: 92, y: 88, size: 5,  color: "#34A853", duration: 9,  delay: 2, variant: "c" },
  { id: "dot-3",     kind: "dot",     x: 50, y: 22, size: 4,  color: "#a78bfa", duration: 12, delay: 4, variant: "b" },
];

// ────────────────────────────────────────────────────────────────────────────
//  Vertical 4-tier flow — Hub → Plan → 5 Agents → ✓ Delivered
//  Coordinates are % of container; SVG viewBox below maps them to 100 × 120
//  (matching the container's 5 / 6 aspect ratio).
// ────────────────────────────────────────────────────────────────────────────

const HUB       = { x: 50, y: 10, color: "#9b59b6" };
const PLAN      = { x: 50, y: 32, color: "#a78bfa" };
const DELIVERED = { x: 50, y: 88, color: "#34d399" };

const AGENTS = [
  { x: 14, y: 60, color: "#4285F4" }, // chat   (blue)
  { x: 32, y: 60, color: "#22d3ee" }, // code   (cyan)
  { x: 50, y: 60, color: "#9b59b6" }, // chart  (purple)
  { x: 68, y: 60, color: "#FBBC05" }, // doc    (amber)
  { x: 86, y: 60, color: "#34A853" }, // cubes  (green)
] as const;

type Connection = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  duration: number;
  delay: number;
};

// 3 cascading waves of pulses — Hub→Plan, Plan→Agents, Agents→Delivered.
// Delays are staggered so the cascade visibly "flows" downward.
const CONNECTIONS: Connection[] = [
  // Wave 1 — Hub → Plan (single trunk)
  { fromX: HUB.x, fromY: HUB.y, toX: PLAN.x, toY: PLAN.y, color: HUB.color, duration: 2.6, delay: 0 },

  // Wave 2 — Plan → each Agent (fan out)
  ...AGENTS.map((a, i): Connection => ({
    fromX: PLAN.x,
    fromY: PLAN.y,
    toX: a.x,
    toY: a.y,
    color: a.color,
    duration: 2.8,
    delay: 1.0 + i * 0.15,
  })),

  // Wave 3 — each Agent → Delivered (converge)
  ...AGENTS.map((a, i): Connection => ({
    fromX: a.x,
    fromY: a.y,
    toX: DELIVERED.x,
    toY: DELIVERED.y,
    color: a.color,
    duration: 2.8,
    delay: 2.2 + i * 0.15,
  })),
];

function ConnectionLines({ mounted }: { mounted: boolean }) {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 h-full w-full pointer-events-none"
      viewBox="0 0 100 120"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Soft Gaussian blur applied per connection group — natural "lit-up"
            glow without needing per-stroke filters. */}
        <filter id="wireGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.35" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {CONNECTIONS.map((c, i) => {
        const fx = c.fromX;
        const fy = c.fromY * 1.2;
        const tx = c.toX;
        const ty = c.toY * 1.2;

        // Symmetric outward bow — lines curve gently away from the central
        // vertical axis. Pure-vertical lines (dx ~= 0) stay straight.
        const dx = tx - fx;
        const midX = (fx + tx) / 2;
        const midY = (fy + ty) / 2;
        const bowMagnitude = Math.min(Math.abs(dx) * 0.22, 9);
        const bowDir = dx === 0 ? 0 : Math.sign(dx);
        const ctrlX = midX + bowDir * bowMagnitude;
        const ctrlY = midY;
        const d = bowDir === 0
          ? `M ${fx} ${fy} L ${tx} ${ty}`
          : `M ${fx} ${fy} Q ${ctrlX} ${ctrlY} ${tx} ${ty}`;

        const pulseStyle = mounted
          ? ({
              animationName: "pulse-travel",
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
              animationIterationCount: "infinite",
              animationTimingFunction: "ease-in-out",
            } as const)
          : undefined;

        return (
          <g key={i} filter="url(#wireGlow)">
            {/* Static base wire — always-visible, calm "always-on" connection. */}
            <path
              d={d}
              fill="none"
              stroke={c.color}
              strokeWidth="1.2"
              strokeLinecap="round"
              opacity="0.35"
              vectorEffect="non-scaling-stroke"
            />

            {/* Outer halo dot — small soft brand-coloured glow travelling
                along the wire. Short dash = compact dot, not a pill. */}
            <path
              d={d}
              className="conn-pulse"
              fill="none"
              stroke={c.color}
              strokeWidth="4"
              strokeLinecap="round"
              opacity="0.7"
              pathLength="100"
              strokeDasharray="3.5 200"
              vectorEffect="non-scaling-stroke"
              style={pulseStyle}
            />

            {/* Inner bright dot — thin white core, smaller than the halo so it
                reads as a tiny bright spark with a soft coloured glow. */}
            <path
              d={d}
              className="conn-pulse"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity="1"
              pathLength="100"
              strokeDasharray="2 200"
              vectorEffect="non-scaling-stroke"
              style={pulseStyle}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Anchor pills — Hub at top, Plan & Delivered as subordinate stages
// ────────────────────────────────────────────────────────────────────────────

/** Top of the flow — the "request enters here" anchor with the rainbow halo. */
function HubAnchor() {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
      style={{ top: `${HUB.y}%`, pointerEvents: "none" }}
    >
      {/* Two stacked pulsing halos */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 260,
          height: 260,
          background:
            "radial-gradient(circle, rgba(66,133,244,0.32) 0%, rgba(168,85,247,0.18) 40%, transparent 70%)",
          filter: "blur(26px)",
          animation: "anchor-pulse 6s ease-in-out infinite",
        }}
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 160,
          height: 160,
          background:
            "radial-gradient(circle, rgba(52,168,83,0.22) 0%, rgba(34,211,238,0.10) 50%, transparent 75%)",
          filter: "blur(18px)",
          animation: "anchor-pulse 4.5s ease-in-out infinite",
          animationDelay: "1s",
        }}
      />

      {/* The pill — only the Hub gets the rainbow rotating border */}
      <div className="relative">
        <div className="ai-glow rounded-full">
          <div className="relative rounded-full border border-zinc-700/80 bg-zinc-950/95 px-5 py-2.5 shadow-2xl shadow-black/50 backdrop-blur">
            <div className="flex items-center gap-2.5">
              <SparkleGlyph size={18} color="#FBBC05" />
              <span className="text-[13px] font-bold tracking-tight text-zinc-100 whitespace-nowrap">
                AI Gig Orchestration
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Subordinate stage pill — used for Plan and Delivered. No rotating border;
 *  just a clean dark pill with a small accent and matching halo glow. */
function StageAnchor({
  yPct,
  icon,
  label,
  accent,
  glowColor,
}: {
  yPct: number;
  icon: ReactNode;
  label: string;
  accent: string;
  glowColor: string;
}) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
      style={{ top: `${yPct}%`, pointerEvents: "none" }}
    >
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 180,
          height: 180,
          background: `radial-gradient(circle, ${glowColor}55 0%, ${glowColor}1f 45%, transparent 75%)`,
          filter: "blur(22px)",
        }}
      />
      <div className="relative">
        <div
          className="relative rounded-full border bg-zinc-950/95 px-4 py-2 shadow-xl shadow-black/40 backdrop-blur"
          style={{ borderColor: `${accent}55` }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: accent }}>{icon}</span>
            <span className="text-[12px] font-bold tracking-tight text-zinc-100 whitespace-nowrap">
              {label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanAnchor() {
  return (
    <StageAnchor
      yPct={PLAN.y}
      icon={<CompassGlyph size={14} color="#a78bfa" />}
      label="Plan"
      accent="#a78bfa"
      glowColor="#a78bfa"
    />
  );
}

function DeliveredAnchor() {
  return (
    <StageAnchor
      yPct={DELIVERED.y}
      icon={<CheckGlyph size={14} color="#34d399" />}
      label="Delivered"
      accent="#34d399"
      glowColor="#34d399"
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Glyph renderer — picks the right SVG for a given item kind
// ────────────────────────────────────────────────────────────────────────────

function renderGlyph(item: Item): ReactNode {
  switch (item.kind) {
    case "chat":
      return <ChatGlyph size={item.size} color={item.color} />;
    case "code":
      return <CodeWindowGlyph size={item.size} color={item.color} />;
    case "chart":
      return <ChartGlyph size={item.size} color={item.color} />;
    case "doc":
      return <DocGlyph size={item.size} color={item.color} />;
    case "cubes":
      return <CubesGlyph size={item.size} color={item.color} />;
    case "mail":
      return <MailGlyph size={item.size} color={item.color} />;
    case "globe":
      return <GlobeGlyph size={item.size} color={item.color} />;
    case "sparkle":
      return <SparkleGlyph size={item.size} color={item.color} />;
    case "dot":
      return <DotGlyph size={item.size} color={item.color} />;
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Main component
// ────────────────────────────────────────────────────────────────────────────

export default function OrchestrationHeroDemo() {
  const mounted = useMounted();

  return (
    <div
      className="relative mx-auto w-full max-w-lg"
      // Aspect ratio chosen to roughly match the SMS demo footprint without a
      // hard frame; overflow stays visible so glow halos can spill softly.
      style={{ aspectRatio: "5 / 6" }}
      aria-hidden
    >
      {/* Soft ambient warm-radial behind everything — gives the constellation
          a subtle "gravity" without being a frame. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(66,133,244,0.14), transparent 55%)," +
            "radial-gradient(ellipse at 80% 80%, rgba(168,85,247,0.08), transparent 50%)," +
            "radial-gradient(ellipse at 20% 80%, rgba(52,168,83,0.06), transparent 50%)",
        }}
      />

      {/* Connection lines layer — sits above the background but below icons. */}
      <ConnectionLines mounted={mounted} />

      {/* Floating icon constellation. */}
      {ITEMS.map((item) => (
        <FloatingItem
          key={item.id}
          xPct={item.x}
          yPct={item.y}
          size={item.size}
          glowColor={item.kind === "code" || item.kind === "person" || item.kind === "dot" ? undefined : item.color}
          variant={item.variant}
          duration={item.duration}
          delay={item.delay}
          rotateDeg={item.rotate ?? 0}
          mounted={mounted}
        >
          {renderGlyph(item)}
        </FloatingItem>
      ))}

      {/* 4-tier anchor stack: Hub at top, Plan, then Delivered at bottom.
          Agents are rendered as floating items in between. */}
      <HubAnchor />
      <PlanAnchor />
      <DeliveredAnchor />
    </div>
  );
}
