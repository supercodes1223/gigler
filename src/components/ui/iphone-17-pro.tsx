import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * iPhone 17 Pro frame, forked from Eldora UI's `iphone-17-pro` registry
 * component (MIT, https://www.eldoraui.site/r/iphone-17-pro.json).
 *
 * Changes from upstream:
 * - Fixed viewBox: upstream derived the viewBox from width/height props,
 *   which distorts the artwork at any size other than 200x400.
 * - The image-only screen slot (`<image href>`) is replaced with a live-DOM
 *   screen layer: children render in an absolutely positioned, corner-masked
 *   div beneath the SVG chrome. The body paths are masked so the screen
 *   window is genuinely transparent.
 * - Dynamic Island and camera draw above the screen content, as on hardware.
 * - Flat #303333 band swapped for a metallic gradient.
 */

// Screen window in SVG units (200x400 viewBox):
// x 14.08, y 12.81, w 171.98, h 374.37, corner radius 24.62.
// The elliptical percentage radius resolves to circular corners because
// 24.62/171.98 of the width equals 24.62/374.37 of the height.
const SCREEN_WINDOW = {
  left: "7.04%",
  top: "3.2025%",
  width: "85.99%",
  height: "93.5925%",
  borderRadius: "14.316% / 6.5764%",
} as const;

export interface Iphone17ProProps {
  children: ReactNode;
  className?: string;
}

export function Iphone17Pro({ children, className }: Iphone17ProProps) {
  return (
    <div
      className={cn("relative", className)}
      style={{ aspectRatio: "200 / 400" }}
    >
      {/* Live screen content, masked to the screen window */}
      {/* Soft shadow underlay approximating the body silhouette. Kept as a
          separate element (not a drop-shadow filter on the wrapper) so the
          live screen content is never inside a filtered layer — filters force
          subtree re-rasterization on every animation frame, which makes
          fractionally-positioned content like the status bar jitter. */}
      <div
        aria-hidden
        className="absolute shadow-[0_28px_55px_rgba(20,30,40,0.35)]"
        style={{
          inset: "1.8% 4.5%",
          borderRadius: "16% / 7.7%",
        }}
      />
      {/* `isolate` contains the children's z-indexes so screen content can
          never paint above the SVG hardware chrome; `transform-gpu` pins the
          screen on its own compositor layer for stable rasterization */}
      <div
        className="absolute isolate transform-gpu overflow-hidden bg-white"
        style={SCREEN_WINDOW}
      >
        {children}
        {/* Seats the panel into the bezel */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ boxShadow: "inset 0 0 3px rgba(0,0,0,0.12)" }}
        />
      </div>

      {/* Hardware chrome */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 200 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Body, with the screen window masked out. The mask cutout is inset
            0.5 units so the bezel overlaps the DOM screen edge by a hair and
            no subpixel seam shows through. */}
        <g mask="url(#iphone17-screen-window)">
          <path
            fill="url(#iphone17-frame-metal)"
            d="M196.11,128.09c0-.25-.2-.45-.45-.45-.11.04-.37.03-.69,0V36.69c0-17.84-14.46-32.31-32.31-32.31H37.48C19.63,4.39,5.17,18.85,5.17,36.69v48.99c-.3.02-.55.03-.66-.02-.25,0-.45.2-.45.45,0,0,0,17.29,0,17.29-.03.41.5.49,1.11.48v13.63c-.61,0-1.14.08-1.11.48,0,0,0,28.54,0,28.54-.03.42.5.49,1.11.48v7.95c-.61,0-1.14.08-1.11.48,0,0,0,28.54,0,28.54-.03.42.5.49,1.11.48v178.86c0,17.84,14.46,32.31,32.31,32.31h125.2c17.84,0,32.31-14.46,32.31-32.31v-188.87c.32-.02.58-.03.69.04,1.26.1.03-45.94.45-46.38ZM186.07,362.63c0,13.56-10.99,24.56-24.56,24.56H38.64c-13.56,0-24.56-10.99-24.56-24.56V37.37c0-13.56,10.99-24.56,24.56-24.56h122.87c13.56,0,24.56,10.99,24.56,24.56v325.26Z"
          />
          <path
            fill="#000000"
            d="M161.38,7.29H38.78c-16.54,0-29.95,13.41-29.95,29.95v325.52c0,16.54,13.41,29.95,29.95,29.95h122.6c16.54,0,29.95-13.41,29.95-29.95V37.24c0-16.54-13.41-29.95-29.95-29.95ZM186.07,362.57c0,13.6-11.02,24.62-24.62,24.62H38.7c-13.6,0-24.62-11.02-24.62-24.62V37.43c0-13.6,11.02-24.62,24.62-24.62h122.75c13.6,0,24.62,11.02,24.62,24.62v325.14Z"
          />
        </g>

        {/* Dynamic Island + camera, above the screen content */}
        <path
          fill="#000000"
          d="M119.61,33.86h-38.93c-10.48-.18-10.5-15.78,0-15.96,0,0,38.93,0,38.93,0,4.41,0,7.98,3.57,7.98,7.98,0,4.41-3.57,7.98-7.98,7.98Z"
        />
        {/* Camera: housing ring + glass lens + glint, drawn as full circles so
            the lens reads as complete against the black island */}
        <circle cx="118.78" cy="25.88" r="4.5" fill="#1b1e20" />
        <circle cx="118.78" cy="25.88" r="3.3" fill="url(#iphone17-lens)" />
        <circle cx="117.55" cy="24.55" r="0.8" fill="#b9c4f4" opacity="0.9" />

        <defs>
          <radialGradient id="iphone17-lens" cx="0.4" cy="0.35" r="0.8">
            <stop offset="0" stopColor="#3450a8" />
            <stop offset="0.45" stopColor="#15205e" />
            <stop offset="1" stopColor="#05071f" />
          </radialGradient>
          <linearGradient
            id="iphone17-frame-metal"
            x1="0"
            y1="0"
            x2="0"
            y2="400"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#46494b" />
            <stop offset="0.08" stopColor="#2c2f31" />
            <stop offset="0.5" stopColor="#26292b" />
            <stop offset="0.92" stopColor="#2c2f31" />
            <stop offset="1" stopColor="#404345" />
          </linearGradient>
          <mask
            id="iphone17-screen-window"
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="200"
            height="400"
          >
            <rect width="200" height="400" fill="#ffffff" />
            <rect
              x="14.58"
              y="13.31"
              width="170.98"
              height="373.37"
              rx="24.12"
              ry="24.12"
              fill="#000000"
            />
          </mask>
        </defs>
      </svg>
    </div>
  );
}
