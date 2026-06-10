"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * Liquid-glass refraction (iOS 26 style) for showpiece surfaces.
 *
 * A generated displacement map (R = x shift, G = y shift) feeds an SVG
 * feDisplacementMap running inside backdrop-filter, bending the page behind
 * the element's edges like a lens. Technique after Shu Ding's open-source
 * liquid-glass experiment (displacement-map-in-backdrop-filter).
 *
 * Only Chromium applies SVG filter references inside backdrop-filter —
 * Safari and Firefox would drop the entire backdrop-filter if given one, so
 * the hook stays inert there and the element keeps its .glass /
 * .glass-strong frosted fallback untouched.
 */

type LiquidGlassOptions = {
  /** Blur layered on top of the refraction, px. Lower = clearer lens. */
  blur?: number;
  saturate?: number;
  /** Translucent fill while refraction is active (replaces the class bg). */
  background?: string;
};

type DisplacementMap = {
  url: string;
  scale: number;
  width: number;
  height: number;
};

function supportsLiquidGlass(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isFirefox = /firefox/i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome|chromium|crios|edg/i.test(ua);
  return /chrome|chromium|edg/i.test(ua) && !isFirefox && !isSafari;
}

function smoothStep(a: number, b: number, t: number): number {
  const x = Math.min(Math.max((t - a) / (b - a), 0), 1);
  return x * x * (3 - 2 * x);
}

/** Signed distance from a centered rounded rectangle, in uv units. */
function roundedRectSDF(
  x: number,
  y: number,
  halfW: number,
  halfH: number,
  radius: number
): number {
  const qx = Math.abs(x) - halfW + radius;
  const qy = Math.abs(y) - halfH + radius;
  return (
    Math.min(Math.max(qx, qy), 0) +
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) -
    radius
  );
}

function generateDisplacementMap(
  width: number,
  height: number
): DisplacementMap | null {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // First pass: per-pixel sample offsets. The inner region maps to itself
  // (no distortion); a band toward the edges pulls samples inward, which is
  // what reads as the glass lens.
  const offsets = new Float32Array(w * h * 2);
  let maxOffset = 0;
  let i = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ix = x / w - 0.5;
      const iy = y / h - 0.5;
      const sdf = roundedRectSDF(ix, iy, 0.3, 0.2, 0.6);
      const displacement = smoothStep(0.8, 0, sdf - 0.15);
      const scaled = smoothStep(0, 1, displacement);
      const dx = (ix * scaled + 0.5) * w - x;
      const dy = (iy * scaled + 0.5) * h - y;
      maxOffset = Math.max(maxOffset, Math.abs(dx), Math.abs(dy));
      offsets[i++] = dx;
      offsets[i++] = dy;
    }
  }
  maxOffset = Math.max(maxOffset, 1);

  // Second pass: encode offsets into R/G. feDisplacementMap shifts each
  // sample by scale * (channel - 0.5), so full range needs scale = 2 * max.
  const image = ctx.createImageData(w, h);
  const data = image.data;
  for (let p = 0, j = 0; p < w * h; p++) {
    data[j++] = (offsets[p * 2] / (2 * maxOffset) + 0.5) * 255;
    data[j++] = (offsets[p * 2 + 1] / (2 * maxOffset) + 0.5) * 255;
    data[j++] = 128;
    data[j++] = 255;
  }
  ctx.putImageData(image, 0, 0);

  return {
    url: canvas.toDataURL(),
    scale: 2 * maxOffset,
    width: w,
    height: h,
  };
}

export function useLiquidGlass<T extends HTMLElement>(
  options: LiquidGlassOptions = {}
): {
  ref: React.RefObject<T | null>;
  style: CSSProperties | undefined;
  filter: ReactNode;
} {
  const {
    blur = 8,
    saturate = 1.7,
    background = "rgba(255, 255, 255, 0.5)",
  } = options;
  const ref = useRef<T | null>(null);
  const rawId = useId();
  const filterId = useMemo(
    () => `liquid-glass-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`,
    [rawId]
  );
  const [map, setMap] = useState<DisplacementMap | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !supportsLiquidGlass()) return;
    const update = () => {
      // offsetWidth/Height are layout sizes, immune to entry animations
      // that scale with transforms.
      if (el.offsetWidth < 1 || el.offsetHeight < 1) return;
      setMap(generateDisplacementMap(el.offsetWidth, el.offsetHeight));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const backdropFilter = map
    ? `url(#${filterId}) blur(${blur}px) saturate(${saturate})`
    : undefined;

  const style: CSSProperties | undefined = map
    ? {
        background,
        WebkitBackdropFilter: backdropFilter,
        backdropFilter,
      }
    : undefined;

  const filter = map ? (
    <svg aria-hidden className="pointer-events-none absolute size-0">
      <filter
        id={filterId}
        x="0"
        y="0"
        width={map.width}
        height={map.height}
        filterUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
      >
        <feImage
          href={map.url}
          x="0"
          y="0"
          width={map.width}
          height={map.height}
          result="map"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="map"
          scale={map.scale}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  ) : null;

  return { ref, style, filter };
}
