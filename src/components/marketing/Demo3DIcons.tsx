/**
 * Soft-3D "clay render" icons for the rotating demo showcase — same Airbnb
 * 3D-icon language as Lock3D: butter key light from the top-left breaking
 * across mint into deep leaf green. Unlike the lock (a single rounded slab),
 * these are multi-part objects, so each surface carries its own gradient
 * oriented to where it faces, and softness comes from blurred shadow and
 * highlight passes (feGaussianBlur) rather than hard gradient bands.
 * All vector — crisp at any size, no raster assets.
 *
 * One icon per demo scenario: Phone3D (calls), Envelope3D (email),
 * Dinner3D (dinner), Plane3D (trip).
 *
 * Each viewBox is a square tight-cropped to that icon's measured artwork
 * (getBBox center, max dimension + 8), so all four render at the same
 * optical size and sit dead-center when inlined next to text. If you move
 * geometry, re-measure and recrop.
 */

/** Shared soft-render plumbing, namespaced per icon so the four can mount
 *  in one document without their defs colliding: blur filters for shadow /
 *  highlight passes, plus the lock's lip + inset gradients. */
function SoftDefs({ p }: { p: string }) {
  return (
    <>
      <filter id={`${p}-b1`} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="0.8" />
      </filter>
      <filter id={`${p}-b2`} x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="1.8" />
      </filter>
      <filter id={`${p}-b3`} x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="3" />
      </filter>
      <linearGradient id={`${p}-lip`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
        <stop offset="45%" stopColor="#ffffff" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${p}-inset`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#14352a" />
        <stop offset="100%" stopColor="#2c5e44" />
      </linearGradient>
    </>
  );
}

/** Classic desk phone: a lock-like clay body with a keypad, the handset
 *  resting across its cradle on top. The handset is molded as one object —
 *  handle arc + two cups share a single user-space gradient, so light flows
 *  continuously across the form instead of restarting per part. */
export function Phone3D({ className }: { className?: string }) {
  return (
    <svg viewBox="7.5 5.5 81 81" className={className} aria-hidden fill="none">
      <defs>
        <SoftDefs p="phone3d" />
        {/* One light field across the whole handset */}
        <linearGradient
          id="phone3d-clay"
          gradientUnits="userSpaceOnUse"
          x1="16"
          y1="8"
          x2="80"
          y2="42"
        >
          <stop offset="0%" stopColor="#f7ecae" />
          <stop offset="30%" stopColor="#cde7ad" />
          <stop offset="62%" stopColor="#8ccea5" />
          <stop offset="100%" stopColor="#3c956a" />
        </linearGradient>
        {/* Body: lit like the lock's slab */}
        <linearGradient id="phone3d-bodyg" x1="0.1" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#e9edab" />
          <stop offset="35%" stopColor="#95d7ad" />
          <stop offset="70%" stopColor="#46a273" />
          <stop offset="100%" stopColor="#27704e" />
        </linearGradient>
        <radialGradient id="phone3d-sheen" cx="0.26" cy="0.08" r="0.6">
          <stop offset="0%" stopColor="#fffbe8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Handset: cushion cups bridged by a handle arc, one material */}
      <path
        d="M26 27C36 14.5 60 14.5 70 27"
        stroke="url(#phone3d-clay)"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <rect
        x="13"
        y="18.5"
        width="17.5"
        height="19"
        rx="8"
        fill="url(#phone3d-clay)"
        transform="rotate(-10 21.75 28)"
      />
      <rect
        x="65.5"
        y="18.5"
        width="17.5"
        height="19"
        rx="8"
        fill="url(#phone3d-clay)"
        transform="rotate(10 74.25 28)"
      />
      {/* Core shadow under the handle + AO where the cups join */}
      <path
        d="M30 25C38 18 58 18 66 25"
        stroke="#1c4733"
        strokeOpacity="0.25"
        strokeWidth="3.6"
        strokeLinecap="round"
        filter="url(#phone3d-b2)"
      />
      <ellipse cx="28" cy="23" rx="4" ry="2.6" fill="#1c4733" fillOpacity="0.2" filter="url(#phone3d-b2)" />
      <ellipse cx="68" cy="23" rx="4" ry="2.6" fill="#1c4733" fillOpacity="0.2" filter="url(#phone3d-b2)" />
      {/* Specular kiss along the handle top + lit cup edge */}
      <path
        d="M38 19.5C44 17 52 17 58 19.5"
        stroke="#ffffff"
        strokeOpacity="0.7"
        strokeWidth="2.6"
        strokeLinecap="round"
        filter="url(#phone3d-b1)"
      />
      <path
        d="M13.5 27a10 10 0 0 1 3 -7"
        stroke="#ffffff"
        strokeOpacity="0.55"
        strokeWidth="2.2"
        strokeLinecap="round"
        filter="url(#phone3d-b1)"
      />

      {/* Cradle shadow: the handset sits ON the body, so it casts a soft
          band into the seam between them */}
      <ellipse cx="48" cy="38.5" rx="22" ry="3" fill="#1c4733" fillOpacity="0.3" filter="url(#phone3d-b2)" />

      {/* Body: rounded wedge, slightly narrower at the cradle */}
      <path
        d="M34 36h28c7.5 0 12.5 4.2 13.8 11l2 13.5c1.2 8 -4.8 14.5 -13 14.5h-33.6c-8.2 0 -14.2 -6.5 -13 -14.5l2 -13.5C21.5 40.2 26.5 36 34 36z"
        fill="url(#phone3d-bodyg)"
      />
      <path
        d="M34 36h28c7.5 0 12.5 4.2 13.8 11l2 13.5c1.2 8 -4.8 14.5 -13 14.5h-33.6c-8.2 0 -14.2 -6.5 -13 -14.5l2 -13.5C21.5 40.2 26.5 36 34 36z"
        fill="url(#phone3d-sheen)"
      />
      <path
        d="M34 36h28c7.5 0 12.5 4.2 13.8 11l2 13.5c1.2 8 -4.8 14.5 -13 14.5h-33.6c-8.2 0 -14.2 -6.5 -13 -14.5l2 -13.5C21.5 40.2 26.5 36 34 36z"
        stroke="url(#phone3d-lip)"
        strokeWidth="1.5"
      />

      {/* Keypad: 3×3 inset buttons, rim-lit below like the lock's keyhole */}
      <ellipse cx="48" cy="70.5" rx="14" ry="1.6" fill="#ffffff" fillOpacity="0.3" />
      {[48, 56.5, 65].map((cy) =>
        [39, 48, 57].map((cx) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="2.7"
            fill="url(#phone3d-inset)"
            fillOpacity="0.9"
          />
        ))
      )}
    </svg>
  );
}

/** Plump clay envelope face-on, like the lock: a rounded body with the
 *  closed flap folding down from the top, its V edges seamed with soft AO,
 *  and faint side-fold creases rising from the bottom corners. */
export function Envelope3D({ className }: { className?: string }) {
  return (
    // Slightly looser crop than the others: a single solid mass reads
    // bigger than the airy multi-part icons at equal coverage
    <svg viewBox="9 9.5 78 78" className={className} aria-hidden fill="none">
      <defs>
        <SoftDefs p="env3d" />
        {/* Body: the lock's slab lighting */}
        <linearGradient id="env3d-body" x1="0.1" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#e9edab" />
          <stop offset="35%" stopColor="#95d7ad" />
          <stop offset="70%" stopColor="#46a273" />
          <stop offset="100%" stopColor="#27704e" />
        </linearGradient>
        {/* Flap: tilted toward the sky, so a half-step brighter */}
        <linearGradient id="env3d-flap" x1="0.2" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#f7ecae" />
          <stop offset="45%" stopColor="#b9e2bb" />
          <stop offset="100%" stopColor="#58aa7e" />
        </linearGradient>
        <radialGradient id="env3d-sheen" cx="0.26" cy="0.06" r="0.6">
          <stop offset="0%" stopColor="#fffbe8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        {/* Everything drawn over the body stays inside its rounded corners */}
        <clipPath id="env3d-clip">
          <rect x="16" y="25" width="64" height="47" rx="10" />
        </clipPath>
      </defs>

      {/* Body: lit slab + sheen + weighted base + top lip */}
      <rect x="16" y="25" width="64" height="47" rx="10" fill="url(#env3d-body)" />
      <rect x="16" y="25" width="64" height="47" rx="10" fill="url(#env3d-sheen)" />

      <g clipPath="url(#env3d-clip)">
        {/* Side-fold creases rising from the bottom corners */}
        <path
          d="M17.5 70L43 55.5"
          stroke="#1c4733"
          strokeOpacity="0.14"
          strokeWidth="1.6"
          strokeLinecap="round"
          filter="url(#env3d-b1)"
        />
        <path
          d="M78.5 70L53 55.5"
          stroke="#1c4733"
          strokeOpacity="0.14"
          strokeWidth="1.6"
          strokeLinecap="round"
          filter="url(#env3d-b1)"
        />

        {/* Flap: folds down from the top edge to a rounded point, casting a
            soft seam shadow on the body beneath its edges */}
        <path
          d="M14 27h68L54.2 52.8a9.2 9.2 0 0 1 -12.4 0z"
          fill="#1c4733"
          fillOpacity="0.3"
          filter="url(#env3d-b2)"
          transform="translate(0 2.5)"
        />
        <path
          d="M14 24h68L54.2 50.8a9.2 9.2 0 0 1 -12.4 0z"
          fill="url(#env3d-flap)"
        />
        {/* Crisp paper edge along the flap's V */}
        <path
          d="M15.5 25.5L42.5 50a8 8 0 0 0 11 0L80.5 25.5"
          stroke="#ffffff"
          strokeOpacity="0.4"
          strokeWidth="1.4"
          filter="url(#env3d-b1)"
        />
      </g>

      {/* Specular kiss on the flap's lit shoulder */}
      <path
        d="M23 31.5l8 7.2"
        stroke="#ffffff"
        strokeOpacity="0.6"
        strokeWidth="2.6"
        strokeLinecap="round"
        filter="url(#env3d-b1)"
      />
      <rect
        x="16.75"
        y="25.75"
        width="62.5"
        height="45.5"
        rx="9.25"
        stroke="url(#env3d-lip)"
        strokeWidth="1.5"
      />
      {/* Rim light where the bottom edge climbs back into the light */}
      <path
        d="M34 69.6h28"
        stroke="#ffffff"
        strokeOpacity="0.3"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Place setting from ~40° above: a clay plate with real thickness (its
 *  edge shows beneath the top surface), a recessed cream well, and chunky
 *  cutlery in the light secondary material. Cutlery gradients run in user
 *  space so each piece shades as one solid object. */
export function Dinner3D({ className }: { className?: string }) {
  return (
    <svg viewBox="2 1 92.5 92.5" className={className} aria-hidden fill="none">
      <defs>
        <SoftDefs p="plate3d" />
        {/* Plate top: soft radial light landing upper-left of center */}
        <radialGradient id="plate3d-top" cx="0.36" cy="0.26" r="0.95">
          <stop offset="0%" stopColor="#f2efbe" />
          <stop offset="42%" stopColor="#b2dfb3" />
          <stop offset="78%" stopColor="#67b58c" />
          <stop offset="100%" stopColor="#4a9b72" />
        </radialGradient>
        {/* Plate edge: the thickness ring below, turned away from the light */}
        <linearGradient id="plate3d-edge" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f8a63" />
          <stop offset="100%" stopColor="#235c41" />
        </linearGradient>
        {/* Well floor: shadowed near the rim's top, lit cream below */}
        <linearGradient id="plate3d-well" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c3d8a8" />
          <stop offset="50%" stopColor="#eeeccb" />
          <stop offset="100%" stopColor="#f8f4da" />
        </linearGradient>
        {/* Cutlery: shared cylinder shading per piece */}
        <linearGradient
          id="plate3d-fork"
          gradientUnits="userSpaceOnUse"
          x1="5"
          y1="0"
          x2="22"
          y2="0"
        >
          <stop offset="0%" stopColor="#f2e9b4" />
          <stop offset="50%" stopColor="#cfe0a8" />
          <stop offset="100%" stopColor="#7fba8f" />
        </linearGradient>
        <linearGradient
          id="plate3d-knife"
          gradientUnits="userSpaceOnUse"
          x1="74"
          y1="0"
          x2="91"
          y2="0"
        >
          <stop offset="0%" stopColor="#f2e9b4" />
          <stop offset="50%" stopColor="#cfe0a8" />
          <stop offset="100%" stopColor="#7fba8f" />
        </linearGradient>
      </defs>

      {/* Fork: four tines into a shoulder, a waisted neck, a long handle —
          one continuous material */}
      <rect x="6" y="21" width="3" height="12.5" rx="1.5" fill="url(#plate3d-fork)" />
      <rect x="10.1" y="20" width="3" height="13.5" rx="1.5" fill="url(#plate3d-fork)" />
      <rect x="14.2" y="20" width="3" height="13.5" rx="1.5" fill="url(#plate3d-fork)" />
      <rect x="18.3" y="21" width="3" height="12.5" rx="1.5" fill="url(#plate3d-fork)" />
      <path
        d="M6 30.5h15.3v3.2c0 3.6 -2.6 5.6 -4.6 7.2c-1.5 1.2 -2.1 2.4 -2.1 4.1h-2c0 -1.7 -0.6 -2.9 -2.1 -4.1c-2 -1.6 -4.5 -3.6 -4.5 -7.2z"
        fill="url(#plate3d-fork)"
      />
      <rect x="10.3" y="42" width="6.8" height="35" rx="3.4" fill="url(#plate3d-fork)" />
      <ellipse cx="13.7" cy="43" rx="4" ry="1.6" fill="#1c4733" fillOpacity="0.18" filter="url(#plate3d-b1)" />
      <path
        d="M12.3 46v26"
        stroke="#ffffff"
        strokeOpacity="0.5"
        strokeWidth="1.7"
        strokeLinecap="round"
        filter="url(#plate3d-b1)"
      />

      {/* Knife: flat cutting edge toward the plate, rounded spine outside */}
      <path
        d="M78.5 18h3.2c5.6 0.4 8.8 7 8.8 14v6.8c0 3.9 -3 6.7 -6.9 6.7h-5.1c-1.1 0 -1.9 -0.9 -1.9 -1.9V19.9c0 -1.1 0.8 -1.9 1.9 -1.9z"
        fill="url(#plate3d-knife)"
      />
      <ellipse cx="82.8" cy="46.5" rx="4.4" ry="1.6" fill="#1c4733" fillOpacity="0.18" filter="url(#plate3d-b1)" />
      <rect x="79.4" y="46" width="7" height="31" rx="3.5" fill="url(#plate3d-knife)" />
      <path
        d="M80.5 22.5q3.4 -1.6 6.4 0.6"
        stroke="#ffffff"
        strokeOpacity="0.6"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#plate3d-b1)"
      />
      <path
        d="M82.8 50v23"
        stroke="#ffffff"
        strokeOpacity="0.45"
        strokeWidth="1.7"
        strokeLinecap="round"
        filter="url(#plate3d-b1)"
      />

      {/* Plate: thickness ring first, then the lit top surface over it */}
      <ellipse cx="48" cy="57" rx="26.5" ry="20" fill="url(#plate3d-edge)" />
      <ellipse cx="48" cy="53" rx="26.5" ry="20" fill="url(#plate3d-top)" />
      <ellipse
        cx="48"
        cy="53"
        rx="25.8"
        ry="19.3"
        stroke="url(#plate3d-lip)"
        strokeWidth="1.4"
      />

      {/* Well: recessed floor with a blurred self-shadow under its top rim
          and a rim light where the far edge climbs back into the light */}
      <ellipse cx="48" cy="53.5" rx="16.5" ry="11.5" fill="url(#plate3d-well)" />
      <path
        d="M33.5 50A16.5 11.5 0 0 1 62.5 50"
        stroke="#1c4733"
        strokeOpacity="0.32"
        strokeWidth="3.2"
        filter="url(#plate3d-b2)"
      />
      <path
        d="M36 60.5A16.5 11.5 0 0 0 60 60.5"
        stroke="#ffffff"
        strokeOpacity="0.5"
        strokeWidth="2.2"
        filter="url(#plate3d-b1)"
      />

      {/* Specular kiss on the rim's lit shoulder */}
      <path
        d="M25 46a26 19.5 0 0 1 10 -9.5"
        stroke="#ffffff"
        strokeOpacity="0.65"
        strokeWidth="2.6"
        strokeLinecap="round"
        filter="url(#plate3d-b1)"
      />
    </svg>
  );
}

/** Passenger jet in profile, climbing gently: tapered tail, swept fin,
 *  porthole windows, and a near wing sweeping down toward the viewer in
 *  the light secondary material. */
export function Plane3D({ className }: { className?: string }) {
  return (
    <svg viewBox="5 -1 90 90" className={className} aria-hidden fill="none">
      <defs>
        <SoftDefs p="plane3d" />
        {/* Fuselage: lit along its upper-left run */}
        <linearGradient id="plane3d-hull" x1="0.15" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#e9eeb0" />
          <stop offset="38%" stopColor="#9fd6ab" />
          <stop offset="72%" stopColor="#4aa274" />
          <stop offset="100%" stopColor="#2d7251" />
        </linearGradient>
        {/* Tail surfaces: same clay, angled off the light */}
        <linearGradient id="plane3d-fin" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#d3e8ae" />
          <stop offset="100%" stopColor="#2f7a54" />
        </linearGradient>
        {/* Near wing: a half-step lighter than the hull so it reads as the
            same machine, just catching more light */}
        <linearGradient id="plane3d-wing" x1="0.1" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#dfe6ab" />
          <stop offset="50%" stopColor="#a7d6b2" />
          <stop offset="100%" stopColor="#4f9c74" />
        </linearGradient>
      </defs>

      <g transform="rotate(-9 48 48)">
        {/* Swept tail fin and the far stabilizer, behind the fuselage */}
        <path
          d="M27 45L20 24q-1.4 -4.4 3 -4.4h3.8q4.2 0 5.3 3.8L38 45z"
          fill="url(#plane3d-fin)"
        />
        <path
          d="M28 50L18.5 59.5q-2.4 2.2 -4.4 0.2q-1.8 -2 0.4 -4.2L24 47z"
          fill="url(#plane3d-fin)"
        />

        {/* Fuselage: long capsule, round nose right, tail tapering up-left */}
        <path
          d="M20 45C22 41.5 28 40 36 40L68 40C79 40 88 44.5 88 51C88 57.5 79 61.5 68 61.5L40 61.5C30 61.5 22 56 19 49C18.3 47.5 19 46.3 20 45Z"
          fill="url(#plane3d-hull)"
        />
        {/* Belly core shadow + AO where the fin lands */}
        <path
          d="M25 52.5C33 59 46 60.5 68 60C76 59.5 82 56.5 85 52.5"
          stroke="#1c4733"
          strokeOpacity="0.3"
          strokeWidth="3.5"
          filter="url(#plane3d-b2)"
        />
        <ellipse cx="31" cy="42.5" rx="7" ry="2.4" fill="#1c4733" fillOpacity="0.28" filter="url(#plane3d-b2)" />
        {/* Specular run along the spine */}
        <path
          d="M28 44Q50 41.5 68 43"
          stroke="#ffffff"
          strokeOpacity="0.6"
          strokeWidth="2.6"
          strokeLinecap="round"
          filter="url(#plane3d-b1)"
        />

        {/* Cockpit windshield hugging the nose, then a porthole row */}
        <path
          d="M73 43.5C78.5 44.2 82.8 47 84.8 50.6C85.4 51.7 84.6 52.6 83.4 52.6L77 52.6C74.8 52.6 73 50.8 73 48.6Z"
          fill="url(#plane3d-inset)"
          fillOpacity="0.92"
        />
        <circle cx="40" cy="47" r="1.8" fill="url(#plane3d-inset)" fillOpacity="0.85" />
        <circle cx="47" cy="47" r="1.8" fill="url(#plane3d-inset)" fillOpacity="0.85" />
        <circle cx="54" cy="47" r="1.8" fill="url(#plane3d-inset)" fillOpacity="0.85" />
        <circle cx="61" cy="47" r="1.8" fill="url(#plane3d-inset)" fillOpacity="0.85" />

        {/* Near wing: swept back and down toward the viewer, with a cast
            shadow on the hull above its root and a leading-edge light */}
        <path
          d="M59 50q3.4 0 2.6 3.3L43 68.2q-2.6 2 -5 0.4q-2.4 -1.6 -1.3 -4.3L40.5 51.9q0.8 -1.9 3 -1.9z"
          fill="url(#plane3d-wing)"
        />
        <ellipse cx="51" cy="50" rx="9" ry="1.9" fill="#1c4733" fillOpacity="0.28" filter="url(#plane3d-b2)" />
        <path
          d="M58 54L44 66"
          stroke="#ffffff"
          strokeOpacity="0.45"
          strokeWidth="1.8"
          strokeLinecap="round"
          filter="url(#plane3d-b1)"
        />
      </g>
    </svg>
  );
}
