"use client";

import type { CSSProperties, ReactNode } from "react";

// ────────────────────────────────────────────────────────────────────────────
//  AI Gig Orchestration field
//
//  The hub dispatches through a symmetric constellation of moving AI-agent
//  parts. Lines stay anchored while the glyphs independently hover in place.
// ────────────────────────────────────────────────────────────────────────────

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

function CheckGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <circle cx="50" cy="50" r="38" fill={color} fillOpacity="0.9" />
      <path
        d="M30 51 L43 64 L72 36"
        stroke="rgba(255,255,255,0.92)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Replit-style person silhouette — head + shoulders, solid fill. */
function PersonGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill={color} aria-hidden>
      <circle cx="50" cy="34" r="18" />
      <path d="M14 92 Q14 60 50 60 Q86 60 86 92 Z" />
    </svg>
  );
}

/** Phone icon — coloured shell with a bright lit screen inside. */
function PhoneGlyph({ size, color = "currentColor" }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="6" y="2" width="12" height="20" rx="2.5" fill={color} />
      <rect x="8" y="4.5" width="8" height="11.5" rx="0.5" fill="rgba(255,255,255,0.78)" />
      <rect x="9.5" y="18.5" width="5" height="1.5" rx="0.5" fill="rgba(255,255,255,0.45)" />
    </svg>
  );
}

/** Lightning bolt — automation / energy / instant action. */
function LightningGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill={color} aria-hidden>
      <path d="M58 6 L24 56 H46 L36 94 L74 38 H50 Z" />
    </svg>
  );
}

/** Cloud — cloud storage / serverless / deployment target. */
function CloudGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 100 72" fill={color} aria-hidden>
      <path d="M30 60 Q14 60 10 46 Q6 30 22 26 Q24 12 40 10 Q56 8 62 22 Q80 20 86 36 Q92 56 74 60 Z" />
    </svg>
  );
}

/** Puzzle piece glyph — a single rounded puzzle piece with a top tab and
 *  a right tab, conveying "fits together" / integrations / composability. */
function PuzzleGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden>
      <path
        d="M22 28 Q22 22 28 22 H42 Q42 14 50 14 Q58 14 58 22 H72 Q78 22 78 28 V42 Q86 42 86 50 Q86 58 78 58 V72 Q78 78 72 78 H58 Q58 86 50 86 Q42 86 42 78 H28 Q22 78 22 72 Z"
        fill={color}
      />
      <path
        d="M30 30 H46 Q46 24 50 24 Q54 24 54 30 H70 V46 Q76 46 76 50 Q76 54 70 54 V70 H54 Q54 76 50 76 Q46 76 46 70 H30 Z"
        fill="rgba(255,255,255,0.18)"
      />
    </svg>
  );
}

/** Browser window glyph — frame + traffic-light buttons + URL bar + content. */
function BrowserGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size * 0.78} viewBox="0 0 100 78" fill="none" aria-hidden>
      <rect x="2" y="2" width="96" height="74" rx="6" fill={color} />
      <rect x="2" y="2" width="96" height="14" rx="6" fill="rgba(0,0,0,0.22)" />
      <circle cx="10" cy="9" r="1.8" fill="rgba(255,255,255,0.55)" />
      <circle cx="17" cy="9" r="1.8" fill="rgba(255,255,255,0.45)" />
      <circle cx="24" cy="9" r="1.8" fill="rgba(255,255,255,0.35)" />
      <rect x="34" y="6" width="50" height="6" rx="3" fill="rgba(255,255,255,0.4)" />
      <rect x="10" y="24" width="60" height="4" rx="1.5" fill="rgba(255,255,255,0.7)" />
      <rect x="10" y="34" width="78" height="4" rx="1.5" fill="rgba(255,255,255,0.5)" />
      <rect x="10" y="44" width="50" height="4" rx="1.5" fill="rgba(255,255,255,0.5)" />
      <rect x="10" y="54" width="38" height="4" rx="1.5" fill="rgba(255,255,255,0.4)" />
      <rect x="10" y="64" width="32" height="4" rx="1.5" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

/** TS file tag — a folded-corner file shape with the "TS" label inside. */
function TsTagGlyph({ size, color }: GlyphProps) {
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 100 115" fill="none" aria-hidden>
      <path d="M14 8 H66 L86 28 V100 Q86 108 78 108 H22 Q14 108 14 100 Z" fill={color} />
      <path d="M66 8 V28 H86 Z" fill="rgba(255,255,255,0.32)" />
      <text
        x="50"
        y="78"
        textAnchor="middle"
        fontSize="24"
        fontWeight="800"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fill="rgba(255,255,255,0.95)"
      >
        TS
      </text>
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

type IconKind =
  | "chat"
  | "chart"
  | "check"
  | "doc"
  | "cubes"
  | "mail"
  | "globe"
  | "code"
  | "person"
  | "phone"
  | "ts"
  | "browser"
  | "puzzle"
  | "lightning"
  | "cloud"
  | "sparkle"
  | "dot";

type OrbitIcon = {
  id: string;
  kind: IconKind;
  color: string;
  size: number;
  x: number;
  y: number;
  ring: "inner" | "outer";
  hoverX: number;
  hoverY: number;
  delay: number;
};

const HUB_CENTER = { x: 50, y: 32 };
const FIELD_CENTER = { x: 50, y: 60 };
const SVG_HUB_CENTER = { x: HUB_CENTER.x, y: HUB_CENTER.y * 1.2 };
const SVG_FIELD_CENTER = { x: FIELD_CENTER.x, y: FIELD_CENTER.y * 1.2 };

const ORBIT_ICONS: OrbitIcon[] = [
  { id: "person", kind: "person", ring: "outer", x: 17, y: 40, color: "#4285F4", size: 35, hoverX: -3, hoverY: -2, delay: -6.7 },
  { id: "chart", kind: "chart", ring: "outer", x: 83, y: 40, color: "#9b59b6", size: 38, hoverX: -2, hoverY: 3, delay: -3.8 },
  { id: "chat", kind: "chat", ring: "outer", x: 14, y: 58, color: "#4285F4", size: 38, hoverX: 3, hoverY: 1, delay: -4.4 },
  { id: "doc", kind: "doc", ring: "outer", x: 88, y: 58, color: "#FBBC05", size: 35, hoverX: 2, hoverY: 2, delay: -5.1 },
  { id: "mail", kind: "mail", ring: "outer", x: 24, y: 78, color: "#4285F4", size: 35, hoverX: -2, hoverY: 2, delay: -8.9 },
  { id: "globe", kind: "globe", ring: "outer", x: 76, y: 78, color: "#22d3ee", size: 37, hoverX: -3, hoverY: -2, delay: -7.4 },
  { id: "check", kind: "check", ring: "outer", x: 50, y: 88, color: "#34A853", size: 36, hoverX: 2, hoverY: -3, delay: -2.5 },
  { id: "cloud", kind: "cloud", ring: "outer", x: 50, y: 43, color: "#a78bfa", size: 38, hoverX: 3, hoverY: -2, delay: -1.2 },
  { id: "phone", kind: "phone", ring: "inner", x: 31, y: 48, color: "#22d3ee", size: 34, hoverX: -2, hoverY: 3, delay: -5.5 },
  { id: "lightning", kind: "lightning", ring: "inner", x: 69, y: 48, color: "#FBBC05", size: 29, hoverX: -2, hoverY: 2, delay: -1.8 },
  { id: "browser", kind: "browser", ring: "inner", x: 68, y: 69, color: "#9b59b6", size: 41, hoverX: 2, hoverY: 3, delay: -3.1 },
  { id: "puzzle", kind: "puzzle", ring: "inner", x: 32, y: 69, color: "#34A853", size: 32, hoverX: 2, hoverY: -2, delay: -2.7 },
  { id: "code", kind: "code", ring: "inner", x: 50, y: 58, color: "#22d3ee", size: 44, hoverX: 2, hoverY: -3, delay: -0.4 },
  { id: "cubes", kind: "cubes", ring: "inner", x: 50, y: 75, color: "#34A853", size: 36, hoverX: -3, hoverY: 1, delay: -4.6 },
];

const OUTER_LOOP_IDS = ["person", "hub", "chart", "doc", "globe", "check", "mail", "chat", "person"] as const;
const INNER_LOOP_IDS = ["phone", "cloud", "lightning", "browser", "cubes", "puzzle", "phone"] as const;
const ORCHESTRATION_LINKS = [
  ["hub", "cloud", "#a78bfa"],
  ["hub", "code", "#22d3ee"],
  ["hub", "doc", "#FBBC05"],
  ["hub", "chat", "#4285F4"],
  ["cloud", "code", "#a78bfa"],
] as const;
const DELIVERY_LINKS = [
  ["code", "cubes", "#34A853"],
  ["cubes", "check", "#34A853"],
] as const;
// Tuning knob: keep fewer outer-loop flow dots so the delivery path reads first.
// Revert to [0, 1, 2, 3, 4, 5, 6, 7] if you want the busier sparkle pass back.
const OUTER_FLOW_SEGMENTS = [0, 2, 3, 5, 6] as const;

function svgPoint(point: { x: number; y: number }) {
  return { x: point.x, y: point.y * 1.2 };
}

function pointFor(id: string) {
  if (id === "hub") return svgPoint(HUB_CENTER);

  const icon = ORBIT_ICONS.find((item) => item.id === id);
  if (!icon) return SVG_FIELD_CENTER;

  return svgPoint(icon);
}

function linePath(fromId: string, toId: string) {
  const from = pointFor(fromId);
  const to = pointFor(toId);

  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

function FlowDot({
  path,
  color,
  delay,
  duration = 5.8,
}: {
  path: string;
  color: string;
  delay: number;
  duration?: number;
}) {
  return (
    <circle r="0.46" fill={color} opacity="0.58" filter="url(#flowDotGlow)">
      <animateMotion path={path} dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" />
    </circle>
  );
}

function FlowLines() {
  const outerLoopPaths = OUTER_LOOP_IDS.slice(0, -1).map((id, index) => linePath(id, OUTER_LOOP_IDS[index + 1]));
  const innerLoopPaths = INNER_LOOP_IDS.slice(0, -1).map((id, index) => linePath(id, INNER_LOOP_IDS[index + 1]));

  return (
    <svg
      aria-hidden
      className="absolute inset-0 h-full w-full pointer-events-none"
      viewBox="0 0 100 120"
      preserveAspectRatio="none"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id="orchestrationLineGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.18" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="flowDotGlow" x="-140%" y="-140%" width="380%" height="380%">
          <feGaussianBlur stdDeviation="0.7" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        className="network-ring"
        cx={SVG_FIELD_CENTER.x}
        cy={SVG_FIELD_CENTER.y}
        r="34"
        fill="none"
        stroke="#a78bfa"
        strokeWidth="0.75"
        strokeDasharray="1.3 5.5"
        opacity="0.34"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        className="network-ring network-ring-delayed"
        cx={SVG_FIELD_CENTER.x}
        cy={SVG_FIELD_CENTER.y}
        r="21"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="0.65"
        strokeDasharray="1.2 5.2"
        opacity="0.26"
        vectorEffect="non-scaling-stroke"
      />

      {outerLoopPaths.map((path, index) => (
        <path
          key={`outer-loop-${index}`}
          d={path}
          className="network-ring"
          fill="none"
          stroke={index < 2 ? "#a78bfa" : "#f5f0e8"}
          strokeWidth="0.75"
          strokeLinecap="round"
          strokeDasharray="1.6 4.2"
          opacity={index < 2 ? "0.46" : "0.3"}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {innerLoopPaths.map((path, index) => (
        <path
          key={`inner-loop-${index}`}
          d={path}
          className="network-ring network-ring-delayed"
          fill="none"
          stroke={index % 2 === 0 ? "#22d3ee" : "#34A853"}
          strokeWidth="0.7"
          strokeLinecap="round"
          strokeDasharray="1.4 4"
          opacity="0.34"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {ORCHESTRATION_LINKS.map(([from, to, color]) => (
        <path
          key={`${from}-${to}`}
          d={linePath(from, to)}
          fill="none"
          stroke={color}
          strokeWidth="0.72"
          strokeLinecap="round"
          strokeDasharray="1.4 4.6"
          opacity="0.34"
          vectorEffect="non-scaling-stroke"
          filter="url(#orchestrationLineGlow)"
        />
      ))}

      <path
        d={`M ${SVG_HUB_CENTER.x} ${SVG_HUB_CENTER.y} L ${SVG_FIELD_CENTER.x} ${SVG_FIELD_CENTER.y}`}
        fill="none"
        stroke="#f5f0e8"
        strokeWidth="0.7"
        strokeLinecap="round"
        strokeDasharray="1.4 4.8"
        opacity="0.35"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={SVG_HUB_CENTER.x} cy={SVG_HUB_CENTER.y} r="1.35" fill="#a78bfa" opacity="0.88" />

      {OUTER_FLOW_SEGMENTS.map((index) => {
        const path = outerLoopPaths[index];

        return path ? (
        <FlowDot key={`outer-flow-${index}`} path={path} color={index % 2 === 0 ? "#a78bfa" : "#4285F4"} delay={index * -0.72} />
        ) : null;
      })}
      {innerLoopPaths.map((path, index) => (
        <FlowDot
          key={`inner-flow-${index}`}
          path={path}
          color={index % 2 === 0 ? "#22d3ee" : "#34A853"}
          delay={index * -0.7}
          duration={4.9}
        />
      ))}
      {ORCHESTRATION_LINKS.slice(0, 4).map(([from, to, color], index) => (
        <FlowDot key={`link-flow-${from}-${to}`} path={linePath(from, to)} color={color} delay={index * -0.9} duration={5.6} />
      ))}
      {DELIVERY_LINKS.map(([from, to, color], index) => (
        <FlowDot key={`delivery-flow-${from}-${to}`} path={linePath(from, to)} color={color} delay={index * -1.2} duration={4.8} />
      ))}
      <FlowDot
        path={`M ${SVG_HUB_CENTER.x} ${SVG_HUB_CENTER.y} L ${SVG_FIELD_CENTER.x} ${SVG_FIELD_CENTER.y}`}
        color="#FBBC05"
        delay={-1.1}
        duration={4.4}
      />
    </svg>
  );
}

function DeliveryOverlayLines() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
      viewBox="0 0 100 120"
      preserveAspectRatio="none"
      style={{ overflow: "visible" }}
    >
      {DELIVERY_LINKS.map(([from, to, color]) => (
        <path
          key={`delivery-overlay-${from}-${to}`}
          d={linePath(from, to)}
          fill="none"
          stroke={color}
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="1.4 4.6"
          opacity="0.66"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

function OrbitIconNode({ icon }: { icon: OrbitIcon }) {
  const motionScale = icon.ring === "outer" ? 1.9 : 1.65;
  const isCompletion = icon.id === "check";
  const isCenterCode = icon.id === "code";

  return (
    <div
      className={`absolute -translate-x-1/2 -translate-y-1/2 ${isCompletion ? "z-[16]" : "z-10"}`}
      style={{
        left: `${icon.x}%`,
        top: `${icon.y}%`,
      }}
    >
      <div
        className="orbit-icon-hover relative flex items-center justify-center will-change-transform"
        style={{
          "--hover-x": `${icon.hoverX * motionScale}px`,
          "--hover-y": `${icon.hoverY * motionScale}px`,
          "--hover-x-alt": `${icon.hoverY * motionScale * 1.35}px`,
          "--hover-y-alt": `${-icon.hoverX * motionScale * 1.35}px`,
          "--hover-x-neg": `${-icon.hoverX * motionScale * 1.65}px`,
          "--hover-y-neg": `${-icon.hoverY * motionScale * 1.65}px`,
          animationDelay: `${icon.delay}s`,
          animationDuration: `${icon.ring === "outer" ? 11.8 : 10.2}s`,
          height: icon.size,
          width: icon.size,
        } as CSSProperties}
      >
        <div className="relative flex items-center justify-center">
          {!isCenterCode ? (
            <div
              aria-hidden
              className="pointer-events-none absolute rounded-full"
              style={{
                width: isCompletion ? icon.size + 8 : icon.size,
                height: isCompletion ? icon.size + 8 : icon.size,
                background: isCompletion
                  ? `radial-gradient(circle, ${icon.color}3f 0%, ${icon.color}20 38%, ${icon.color}0c 58%, transparent 74%)`
                  : `radial-gradient(circle, ${icon.color}55 0%, ${icon.color}22 40%, transparent 72%)`,
                filter: isCompletion ? "blur(6px)" : "blur(9px)",
                zIndex: -1,
              }}
            />
          ) : null}
          {renderGlyph(icon)}
        </div>
      </div>
    </div>
  );
}

function HubEdgeDots() {
  const path = "M 20 8 H 230 Q 242 8 242 20 V 50 Q 242 62 230 62 H 20 Q 8 62 8 50 V 20 Q 8 8 20 8 Z";

  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute -inset-[7px]"
      viewBox="0 0 250 70"
      preserveAspectRatio="none"
    >
      <defs>
        <filter id="hubDotGlow" x="-140%" y="-140%" width="380%" height="380%">
          <feGaussianBlur stdDeviation="0.7" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path id="hub-edge-path" d={path} fill="none" stroke="transparent" />
      {[0, -2.6, -5.2].map((delay, index) => (
        <circle
          key={index}
          r="1.18"
          fill={index === 1 ? "#22d3ee" : "#a78bfa"}
          opacity="0.78"
          filter="url(#hubDotGlow)"
        >
          <animateMotion dur="7.8s" begin={`${delay}s`} repeatCount="indefinite">
            <mpath href="#hub-edge-path" />
          </animateMotion>
        </circle>
      ))}
    </svg>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Center anchor
// ────────────────────────────────────────────────────────────────────────────

/** Center hub — the AI Gig Orchestration tile that the Replit-style dashed
 *  lines fan out from. */
function HubAnchor() {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
      style={{ top: `${HUB_CENTER.y}%`, pointerEvents: "none" }}
    >
      {/* Single soft halo — much smaller than before so it doesn't bleed
          into the surrounding icons. */}
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 190,
          height: 160,
          background:
            "radial-gradient(circle, rgba(66,133,244,0.32) 0%, rgba(168,85,247,0.18) 48%, transparent 76%)",
          filter: "blur(20px)",
          animation: "anchor-pulse 5s ease-in-out infinite",
        }}
      />

      <div className="relative" style={{ animation: "hub-hover 7s ease-in-out infinite" }}>
        <div className="ai-glow rounded-2xl">
          <div className="relative flex h-[54px] w-[220px] items-center justify-center gap-2 rounded-2xl border border-zinc-700/80 bg-zinc-950/95 px-4 shadow-2xl shadow-black/50 backdrop-blur sm:h-[58px] sm:w-[238px]">
            <HubEdgeDots />
            <SparkleGlyph size={22} color="#FBBC05" />
            <span className="whitespace-nowrap text-center text-[14px] font-bold leading-tight text-zinc-100">
              AI Gig Orchestration
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//  Glyph renderer — picks the right SVG for a given item kind
// ────────────────────────────────────────────────────────────────────────────

function renderGlyph(item: { kind: IconKind; size: number; color: string }): ReactNode {
  switch (item.kind) {
    case "chat":
      return <ChatGlyph size={item.size} color={item.color} />;
    case "code":
      return <CodeWindowGlyph size={item.size} color={item.color} />;
    case "chart":
      return <ChartGlyph size={item.size} color={item.color} />;
    case "check":
      return <CheckGlyph size={item.size} color={item.color} />;
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
    case "person":
      return <PersonGlyph size={item.size} color={item.color} />;
    case "phone":
      return <PhoneGlyph size={item.size} color={item.color} />;
    case "ts":
      return <TsTagGlyph size={item.size} color={item.color} />;
    case "browser":
      return <BrowserGlyph size={item.size} color={item.color} />;
    case "puzzle":
      return <PuzzleGlyph size={item.size} color={item.color} />;
    case "lightning":
      return <LightningGlyph size={item.size} color={item.color} />;
    case "cloud":
      return <CloudGlyph size={item.size} color={item.color} />;
    case "dot":
      return <DotGlyph size={item.size} color={item.color} />;
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Main component
// ────────────────────────────────────────────────────────────────────────────

export default function OrchestrationHeroDemo({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative mx-auto w-full max-w-lg ${className}`}
      // Aspect ratio chosen to roughly match the SMS demo footprint without a
      // hard frame; overflow stays visible so glow halos can spill softly.
      style={{ aspectRatio: "5 / 6" }}
      aria-hidden
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 52% 54%, rgba(66,133,244,0.075), transparent 62%)," +
            "radial-gradient(ellipse at 50% 62%, rgba(168,85,247,0.055), transparent 56%)," +
            "radial-gradient(ellipse at 54% 72%, rgba(52,168,83,0.035), transparent 50%)",
        }}
      />

      <FlowLines />

      {ORBIT_ICONS.map((icon) => (
        <OrbitIconNode key={icon.id} icon={icon} />
      ))}
      <DeliveryOverlayLines />

      {/* Center hub with two balanced Replit-style connection rings. */}
      <HubAnchor />
    </div>
  );
}
