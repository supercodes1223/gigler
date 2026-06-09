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
