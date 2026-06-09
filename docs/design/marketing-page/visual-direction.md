# Visual Direction

> The aesthetic brief: what the page looks and feels like. References live in
> [inspo/](inspo/README.md); this doc is the synthesis.

## North star

**Technical but human.** The page must signify polish and trust while being
tech-forward. It should feel like a product Apple could have shipped — clean,
calm, premium — not like a startup dashboard or an AI demo.

Mood words: **clean tech, spring, clarity, Apple.** Light, fresh, airy —
spring informs the palette and the feeling of the page (bright canvas, soft
organic warmth through glass), not literal seasonal imagery.

We are iOS-first, and an Apple-quality iOS companion app (for managing your
assistant) is coming. The website should feel like it belongs to that same
family: anyone looking at the page should believe the iOS app will be beautiful.

## Calibration: the 6.5

On a scale where **1 = Vercel** (sharp lines, clear boundaries, minimal, clean)
and **10 = Mercury** (flowers and grass, organic photography, heavy rounded
glass), **Gigler sits at 6.5** — leaning Luma:

- Light glass on a light background
- Small, clear lines
- Clean, organized, **rounded** — modern iOS (Liquid Glass era) more than
  editorial nature photography
- Organic warmth stays in the direction, but photography is an accent,
  not a main ingredient

When a design choice is ambiguous, resolve it toward "rounded iOS glass on a
clean light canvas," not toward "sharp dev-tool grid" and not toward
"nature-photo editorial."

## Core aesthetic ingredients

- **Light website background — hard requirement.** The page is light. Apple-style
  light/dark *aesthetic sensibility* applies to type and contrast, but the site
  itself is not dark.
- **Frosted glass** surfaces (Luma-style) — cards, nav, overlays. The lead ingredient.
- **Rounded, modern-iOS geometry** — generous corner radii, soft glass edges,
  organized card layouts
- **Thin, small, precise lines** (Cursor / shadcn-style) — hairline borders, fine dividers
- **A reactive mesh / generative element in the hero** — the "alive" tech signal
- **Grainy nature photography wrapped in glass** — an *accent* for organic warmth,
  used sparingly (see Calibration below), not a main ingredient
- **Apple-grade typography** — clean, confident, generous whitespace

The blend is the point: organic + glass + precise lines = technical but human.
No single ingredient should dominate.

## Hero interactive element

**Decision direction: a cursor-reactive mesh gradient** — soft color blobs on the
light canvas that drift slowly on their own and respond fluidly to cursor movement.

Spec (the vibe constraints matter more than the library):

- **Palette:** spring pastels on white — soft greens, sky blues, lilac; never neon
- **Motion:** slow, fluid, calm. The cursor adds gentle distortion/attraction —
  a ripple, not a chase. It should feel like light under frosted glass.
- **Restraint:** the mesh sits *behind* the H1/CTA and must never fight them for
  attention. If in doubt, lower the opacity.
- **Grain:** a subtle grain pass over the mesh ties into the "grainy organic"
  accent without needing photography.
- **Fallbacks:** idle ambient animation on touch devices (no cursor); static
  gradient for `prefers-reduced-motion`; pause when offscreen.

### Library candidates (researched 2026-06)

1. **`@paper-design/shaders-react`** (Paper Shaders) — zero-dependency canvas
   shaders, npm-installable, "ultra fast." Has `MeshGradient`, *static mesh
   gradient*, and a **grain gradient** that matches our grain note. Cursor
   reactivity not built in everywhere — may pair with a small pointer-uniform
   layer. Best fit for our stack (Next.js, lightweight, code-owned).
2. **Unicorn Studio** — designer WebGL tool with native mouse-interaction
   effects, ~29kb runtime, pauses offscreen, exports embeds. Fastest path to a
   truly fluid cursor ripple without writing GLSL; tradeoff is an external
   tool/embed rather than code we own.
3. **`@mesh-gradient/react`** — "Apple-inspired" WebGL mesh gradient component,
   up to 4 colors, auto-pauses out of viewport. Simple, but interaction depth unclear.
4. **Stripe-style mesh (whatamesh)** — the canonical ambient mesh; animated but
   not cursor-reactive out of the box.
5. **Custom shader (React Three Fiber / OGL)** — full control, real fluid
   cursor distortion; most effort. Reserve as the "if nothing else feels right" path.

**Recommendation:** prototype with Paper Shaders (mesh + grain, light palette)
plus a light pointer-distortion layer; if the cursor feel isn't fluid enough,
build the hero in Unicorn Studio.

## Layout & structure

- Structure and hero: **t3.codes**-inspired
- Overall layout: **Vercel**-clean, but *simpler* — fewer sections, less density
- Components: **shadcn/ui** as the component vocabulary
- Product demos: **Apple**-style — polished, focused, show-don't-tell

## Light/dark

**The page is light background. Non-negotiable.** Apple's light/dark aesthetic
informs typography, contrast, and polish — it does not mean the site ships dark.
Dark imagery/photography can appear *inside* glass-wrapped elements, but the
canvas stays light.

## What this aesthetic must avoid

- Dark-mode-only "AI startup" look
- Neon gradients, sci-fi glow, robot imagery
- Dense developer-tool layouts (we borrow Vercel's cleanliness, not its density)
- Anything that reads "technical product for technical people"

## Open questions

- Exact type choice (SF-adjacent? Geist? custom?)
- Where exactly the sparing photography accents land (resolved in spirit by the
  6.5 calibration: glass leads, photos are accents — exact placement TBD in
  structure.md)
