/**
 * Shared registry of the apps / tools / AI engines that Gigler can orchestrate
 * to complete a gig. Used by both the `/api/gig/plan` route (server, keyword +
 * Gemini matching) and the home-page hero (client, rendering the logos).
 *
 * This module is intentionally framework-agnostic (no React, no Node-only
 * APIs) so it can be imported from both server route handlers and client
 * components.
 */

import type { Schema } from "../../amplify/data/resource";

/** Gig type union derived directly from the Amplify data schema. */
export type GigType = NonNullable<Schema["Gig"]["type"]["type"]>;

export interface AppDef {
  /** Stable id — also the basename of the logo file in /public/logos. */
  id: string;
  name: string;
  /** Logo asset path. Monochrome logos are tinted white on a dark tile. */
  logo: string;
  /** True when the asset is a single-color silhouette (rendered white). */
  monochrome: boolean;
  /** Brand color used for the accent ring / glow on the reveal tile. */
  color: string;
  /** Short category label shown under grouped reveals. */
  category: "engine" | "cloud" | "reservations" | "delivery" | "events" | "dev" | "productivity";
  /** Keywords used by the lightweight fallback matcher. */
  keywords: string[];
}

/**
 * The full catalog. `engine`/`cloud` entries reuse the existing monochrome
 * brand SVGs; everything else uses lightweight colored app-icon SVGs added
 * under /public/logos.
 */
export const APPS: AppDef[] = [
  // ── AI engines & agents (the orchestration layer) ───────────────────────
  {
    id: "gemini",
    name: "Gemini",
    logo: "/logos/gemini.svg",
    monochrome: true,
    color: "#4285F4",
    category: "engine",
    keywords: ["research", "write", "summary", "plan", "analyze", "draft", "idea"],
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    logo: "/logos/chatgpt.svg",
    monochrome: true,
    color: "#10a37f",
    category: "engine",
    keywords: ["write", "copy", "content", "email", "draft", "brainstorm"],
  },
  {
    id: "claude",
    name: "Claude",
    logo: "/logos/claude.svg",
    monochrome: true,
    color: "#d97757",
    category: "engine",
    keywords: ["code", "build", "app", "debug", "review", "refactor", "analyze"],
  },
  {
    id: "cursor",
    name: "Cursor",
    logo: "/logos/cursor.svg",
    monochrome: true,
    color: "#6e6e6e",
    category: "dev",
    keywords: ["code", "build", "app", "website", "api", "deploy", "feature", "bug"],
  },
  {
    id: "github",
    name: "GitHub",
    logo: "/logos/github.svg",
    monochrome: false,
    color: "#8b8b8b",
    category: "dev",
    keywords: ["code", "repo", "deploy", "pull request", "git", "ship", "app", "website"],
  },
  // ── Cloud ────────────────────────────────────────────────────────────────
  {
    id: "aws",
    name: "AWS",
    logo: "/logos/aws.svg",
    monochrome: true,
    color: "#FF9900",
    category: "cloud",
    keywords: ["deploy", "host", "cloud", "server", "backend", "infrastructure", "app", "website"],
  },
  {
    id: "google-cloud",
    name: "Google Cloud",
    logo: "/logos/google-cloud.svg",
    monochrome: true,
    color: "#4285F4",
    category: "cloud",
    keywords: ["deploy", "host", "cloud", "run", "backend"],
  },
  // ── Reservations ──────────────────────────────────────────────────────────
  {
    id: "opentable",
    name: "OpenTable",
    logo: "/logos/opentable.svg",
    monochrome: false,
    color: "#DA3743",
    category: "reservations",
    keywords: ["reservation", "reserve", "table", "dinner", "restaurant", "book", "brunch", "lunch"],
  },
  {
    id: "resy",
    name: "Resy",
    logo: "/logos/resy.svg",
    monochrome: false,
    color: "#C5283D",
    category: "reservations",
    keywords: ["reservation", "reserve", "table", "dinner", "restaurant", "book"],
  },
  {
    id: "yelp",
    name: "Yelp",
    logo: "/logos/yelp.svg",
    monochrome: false,
    color: "#FF1A1A",
    category: "reservations",
    keywords: ["restaurant", "review", "find", "best", "near me", "place", "spot"],
  },
  // ── Events ─────────────────────────────────────────────────────────────────
  {
    id: "evite",
    name: "Evite",
    logo: "/logos/evite.svg",
    monochrome: false,
    color: "#00A0DF",
    category: "events",
    keywords: ["invite", "party", "event", "birthday", "rsvp", "celebration", "guest"],
  },
  // ── Delivery / lifestyle ────────────────────────────────────────────────────
  {
    id: "doordash",
    name: "DoorDash",
    logo: "/logos/doordash.svg",
    monochrome: false,
    color: "#FF3008",
    category: "delivery",
    keywords: ["food", "delivery", "order", "takeout", "deliver", "catering"],
  },
  {
    id: "instacart",
    name: "Instacart",
    logo: "/logos/instacart.svg",
    monochrome: false,
    color: "#43B02A",
    category: "delivery",
    keywords: ["grocery", "groceries", "instacart", "ingredients", "meal", "shopping"],
  },
  {
    id: "uber",
    name: "Uber",
    logo: "/logos/uber.svg",
    monochrome: false,
    color: "#10847e",
    category: "delivery",
    keywords: ["ride", "uber", "transport", "pickup", "airport", "car"],
  },
  // ── Productivity ────────────────────────────────────────────────────────────
  {
    id: "google",
    name: "Google",
    logo: "/logos/google.svg",
    monochrome: false,
    color: "#4285F4",
    category: "productivity",
    keywords: ["search", "find", "calendar", "schedule", "maps", "directions", "research"],
  },
  {
    id: "gmail",
    name: "Gmail",
    logo: "/logos/gmail.svg",
    monochrome: false,
    color: "#EA4335",
    category: "productivity",
    keywords: ["email", "send", "inbox", "reply", "mail", "follow up"],
  },
  {
    id: "slack",
    name: "Slack",
    logo: "/logos/slack.svg",
    monochrome: false,
    color: "#611f69",
    category: "productivity",
    keywords: ["team", "slack", "message", "notify", "channel", "update everyone"],
  },
  {
    id: "stripe",
    name: "Stripe",
    logo: "/logos/stripe.svg",
    monochrome: false,
    color: "#635BFF",
    category: "productivity",
    keywords: ["payment", "invoice", "charge", "billing", "checkout", "stripe", "pay"],
  },
];

const APP_BY_ID = new Map(APPS.map((a) => [a.id, a]));

export function getApp(id: string): AppDef | undefined {
  return APP_BY_ID.get(id);
}

export function getApps(ids: string[]): AppDef[] {
  const seen = new Set<string>();
  const result: AppDef[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const app = APP_BY_ID.get(id);
    if (app) {
      seen.add(id);
      result.push(app);
    }
  }
  return result;
}

export const ALL_APP_IDS = APPS.map((a) => a.id);

// ── Gig type classification (keyword fallback) ──────────────────────────────

const GIG_TYPE_KEYWORDS: Array<{ type: GigType; words: string[] }> = [
  { type: "coding", words: ["code", "build", "app", "website", "api", "deploy", "debug", "feature", "bug", "landing page"] },
  { type: "reservations", words: ["reservation", "reserve", "table", "book a table", "restaurant", "hotel", "flight"] },
  { type: "scheduling", words: ["remind", "reminder", "schedule", "wake", "every", "calendar", "recurring"] },
  { type: "business_formation", words: ["llc", "incorporate", "business", "company", "ein", "operating agreement"] },
  { type: "creative", words: ["design", "logo", "image", "video", "photo", "collage", "flyer", "menu"] },
  { type: "professional", words: ["resume", "legal", "contract", "consult", "advisory", "review"] },
  { type: "education", words: ["study", "learn", "research", "course", "tutor", "language", "exam"] },
  { type: "household", words: ["bill", "bills", "chore", "household", "move", "moving", "clean"] },
  { type: "lifestyle", words: ["meal", "grocery", "gift", "shopping", "workout", "trip", "travel"] },
  { type: "planning", words: ["plan", "party", "event", "birthday", "wedding", "coordinate", "organize", "invite"] },
];

export function classifyGigType(prompt: string): GigType {
  const lower = prompt.toLowerCase();
  for (const { type, words } of GIG_TYPE_KEYWORDS) {
    if (words.some((w) => lower.includes(w))) return type;
  }
  return "custom";
}

/**
 * Lightweight keyword matcher: maps a prompt to a curated set of app ids.
 * Always returns at least the orchestration engines so the reveal feels real.
 */
export function matchAppsByKeywords(prompt: string): string[] {
  const lower = prompt.toLowerCase();
  const scored = APPS.map((app) => {
    const hits = app.keywords.reduce((n, kw) => (lower.includes(kw) ? n + 1 : n), 0);
    return { id: app.id, category: app.category, hits };
  });

  const matched = scored.filter((s) => s.hits > 0).sort((a, b) => b.hits - a.hits);

  const ids = new Set<string>();
  // Gemini (Orca routing) is always part of orchestration.
  ids.add("gemini");

  for (const m of matched) ids.add(m.id);

  // If the prompt looks like coding, make sure the dev tools show up.
  const type = classifyGigType(prompt);
  if (type === "coding") {
    ["claude", "cursor", "github", "aws"].forEach((id) => ids.add(id));
  }
  if (type === "planning" || type === "reservations") {
    ids.add("opentable");
  }

  // Cap so the reveal stays tasteful.
  return Array.from(ids).slice(0, 7);
}
