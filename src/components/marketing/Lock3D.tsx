/**
 * Soft-3D "clay render" padlock in the brand mint palette — the Airbnb 3D
 * icon look, but vector so it stays crisp and ships no raster asset.
 * Depth comes from layered gradients: a lit body with a radial sheen, a
 * tube-shaded shackle (light core, dark edges, specular arc), and an inset
 * keyhole. Pair with a CSS drop-shadow for the floating-object feel.
 */
export function Lock3D({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={className} aria-hidden fill="none">
      <defs>
        {/* Steep diagonal with separated bands: hero butter light striking
            from the top-left, breaking across mint into deep leaf green */}
        <linearGradient id="lock3d-body" x1="0" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#f9edb4" />
          <stop offset="20%" stopColor="#e6edab" />
          <stop offset="44%" stopColor="#95d7ad" />
          <stop offset="70%" stopColor="#46a273" />
          <stop offset="100%" stopColor="#27704e" />
        </linearGradient>
        <radialGradient id="lock3d-sheen" cx="0.24" cy="0.06" r="0.55">
          <stop offset="0%" stopColor="#fffbe8" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#fff9dd" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lock3d-lip" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* The shackle tube catches the same butter light on its left leg
            and falls to leaf green on the right */}
        <linearGradient id="lock3d-shackle" x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0%" stopColor="#e9dd9e" />
          <stop offset="42%" stopColor="#b9e0c0" />
          <stop offset="100%" stopColor="#4f9c75" />
        </linearGradient>
        <linearGradient id="lock3d-shackle-core" x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0%" stopColor="#faf3cf" />
          <stop offset="45%" stopColor="#eafaef" />
          <stop offset="100%" stopColor="#9ccfb2" />
        </linearGradient>
        {/* Inset hole: darkest at the top (self-shadow), easing toward the
            bottom where light reaches in */}
        <linearGradient id="lock3d-keyhole" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14352a" />
          <stop offset="100%" stopColor="#2c5e44" />
        </linearGradient>
        <radialGradient id="lock3d-ao">
          <stop offset="0%" stopColor="#1c4733" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#1c4733" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lock3d-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="55%" stopColor="#1c4733" stopOpacity="0" />
          <stop offset="100%" stopColor="#1c4733" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      {/* Shackle: wide gradient stroke = tube edges, lighter core stroke on
          top = rounded surface, short white arc = specular highlight */}
      <path
        d="M33 48V30a15 15 0 0 1 30 0v18"
        stroke="url(#lock3d-shackle)"
        strokeWidth="11"
      />
      <path
        d="M33 48V30a15 15 0 0 1 30 0v18"
        stroke="url(#lock3d-shackle-core)"
        strokeWidth="5.5"
      />
      <path
        d="M38.5 23.2a13.5 13.5 0 0 1 19 0"
        stroke="#ffffff"
        strokeOpacity="0.65"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* Body: lit gradient + radial sheen + weighted base + top-lip
          highlight, with contact shadows where the shackle enters */}
      <rect x="17" y="42" width="62" height="42" rx="15" fill="url(#lock3d-body)" />
      <rect x="17" y="42" width="62" height="42" rx="15" fill="url(#lock3d-sheen)" />
      <rect x="17" y="42" width="62" height="42" rx="15" fill="url(#lock3d-base)" />
      <ellipse cx="33" cy="44.5" rx="7.5" ry="3" fill="url(#lock3d-ao)" />
      <ellipse cx="63" cy="44.5" rx="7.5" ry="3" fill="url(#lock3d-ao)" />
      <rect
        x="17.75"
        y="42.75"
        width="60.5"
        height="40.5"
        rx="14.25"
        stroke="url(#lock3d-lip)"
        strokeWidth="1.5"
      />

      {/* Keyhole: inset dot + stem, rim-lit just below the stem */}
      <ellipse cx="48" cy="75.6" rx="4.6" ry="1.4" fill="#ffffff" fillOpacity="0.35" />
      <circle cx="48" cy="59.5" r="7" fill="url(#lock3d-keyhole)" />
      <rect x="44.6" y="62" width="6.8" height="12" rx="3.4" fill="url(#lock3d-keyhole)" />
    </svg>
  );
}
