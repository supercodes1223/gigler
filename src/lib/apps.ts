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
  /** Logo asset path. Every logo is a self-contained, full-color rounded tile. */
  logo: string;
  /** Brand color used for the accent ring / glow on the reveal tile. */
  color: string;
  /** Short category label shown under grouped reveals. */
  category: "engine" | "cloud" | "reservations" | "delivery" | "events" | "dev" | "productivity";
  /** Keywords used by the lightweight fallback matcher. */
  keywords: string[];
}

/**
 * The full catalog. Every entry maps to a full-color, self-contained app-icon
 * SVG (rounded brand tile) under /public/logos so the reveal renders in real
 * brand colors on the dark hero.
 */
export const APPS: AppDef[] = [
  // ── AI engines & agents (the orchestration layer) ───────────────────────
  {
    id: "gemini",
    name: "Gemini",
    logo: "/logos/gemini.svg",
    color: "#4285F4",
    category: "engine",
    keywords: ["research", "write", "summary", "plan", "analyze", "draft", "idea"],
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    logo: "/logos/chatgpt.svg",
    color: "#10A37F",
    category: "engine",
    keywords: ["write", "copy", "content", "draft", "brainstorm"],
  },
  {
    id: "codex",
    name: "Codex",
    logo: "/logos/codex.svg",
    color: "#10A37F",
    category: "dev",
    keywords: ["code", "build", "app", "website", "api", "function", "script"],
  },
  {
    id: "claude",
    name: "Claude",
    logo: "/logos/claude.svg",
    color: "#D97757",
    category: "engine",
    keywords: ["code", "build", "app", "debug", "review", "refactor", "analyze", "reason"],
  },
  {
    id: "cursor",
    name: "Cursor",
    logo: "/logos/cursor.svg",
    color: "#CBD2DA",
    category: "dev",
    keywords: ["code", "build", "app", "website", "api", "deploy", "feature", "bug"],
  },
  {
    id: "kimi",
    name: "Kimi",
    logo: "/logos/kimi.svg",
    color: "#8B7BD8",
    category: "engine",
    keywords: ["long", "document", "context", "summarize", "kimi", "research"],
  },
  {
    id: "hermes",
    name: "Hermes",
    logo: "/logos/hermes.svg",
    color: "#6F66C9",
    category: "engine",
    keywords: ["agent", "reason", "open", "hermes", "tool"],
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    logo: "/logos/openclaw.svg",
    color: "#FF6B35",
    category: "dev",
    keywords: ["scrape", "browse", "extract", "crawl", "openclaw", "web"],
  },
  {
    id: "github",
    name: "GitHub",
    logo: "/logos/github.svg",
    color: "#C9D1D9",
    category: "dev",
    keywords: ["code", "repo", "deploy", "pull request", "git", "ship", "app", "website"],
  },
  // ── Cloud ────────────────────────────────────────────────────────────────
  {
    id: "aws",
    name: "AWS",
    logo: "/logos/aws.svg",
    color: "#FF9900",
    category: "cloud",
    keywords: ["deploy", "host", "cloud", "server", "backend", "infrastructure", "app", "website"],
  },
  {
    id: "google-cloud",
    name: "Google Cloud",
    logo: "/logos/google-cloud.svg",
    color: "#4285F4",
    category: "cloud",
    keywords: ["deploy", "host", "cloud", "run", "backend"],
  },
  // ── Reservations ──────────────────────────────────────────────────────────
  {
    id: "opentable",
    name: "OpenTable",
    logo: "/logos/opentable.svg",
    color: "#DA3743",
    category: "reservations",
    keywords: ["reservation", "reserve", "table", "dinner", "restaurant", "book", "brunch", "lunch"],
  },
  {
    id: "resy",
    name: "Resy",
    logo: "/logos/resy.svg",
    color: "#FF2D55",
    category: "reservations",
    keywords: ["reservation", "reserve", "table", "dinner", "restaurant", "book"],
  },
  {
    id: "yelp",
    name: "Yelp",
    logo: "/logos/yelp.svg",
    color: "#FF1A1A",
    category: "reservations",
    keywords: ["restaurant", "review", "find", "best", "near me", "place", "spot"],
  },
  // ── Events ─────────────────────────────────────────────────────────────────
  {
    id: "evite",
    name: "Evite",
    logo: "/logos/evite.svg",
    color: "#00A0DF",
    category: "events",
    keywords: ["invite", "party", "event", "birthday", "rsvp", "celebration", "guest"],
  },
  // ── Delivery / lifestyle ────────────────────────────────────────────────────
  {
    id: "doordash",
    name: "DoorDash",
    logo: "/logos/doordash.svg",
    color: "#FF3008",
    category: "delivery",
    keywords: ["food", "delivery", "order", "takeout", "deliver", "catering"],
  },
  {
    id: "instacart",
    name: "Instacart",
    logo: "/logos/instacart.svg",
    color: "#0AAD0A",
    category: "delivery",
    keywords: ["grocery", "groceries", "instacart", "ingredients", "meal", "shopping"],
  },
  {
    id: "uber",
    name: "Uber",
    logo: "/logos/uber.svg",
    color: "#10847E",
    category: "delivery",
    keywords: ["ride", "uber", "transport", "pickup", "airport", "car"],
  },
  // ── Productivity ────────────────────────────────────────────────────────────
  {
    id: "google",
    name: "Google",
    logo: "/logos/google.svg",
    color: "#4285F4",
    category: "productivity",
    keywords: ["search", "find", "calendar", "schedule", "maps", "directions", "research", "photos", "organize"],
  },
  {
    id: "gmail",
    name: "Gmail",
    logo: "/logos/gmail.svg",
    color: "#EA4335",
    category: "productivity",
    keywords: ["email", "send", "inbox", "reply", "mail", "follow up"],
  },
  {
    id: "slack",
    name: "Slack",
    logo: "/logos/slack.svg",
    color: "#E01E5A",
    category: "productivity",
    keywords: ["team", "slack", "message", "notify", "channel", "everyone"],
  },
  {
    id: "stripe",
    name: "Stripe",
    logo: "/logos/stripe.svg",
    color: "#635BFF",
    category: "productivity",
    keywords: ["payment", "invoice", "charge", "billing", "bill", "bills", "checkout", "stripe", "pay"],
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
 * Curated tool sets per gig type — guarantees an on-topic, good-looking reveal
 * for each kind of gig (these lead, then keyword hits fill any remaining slots).
 */
const TYPE_TOOLSETS: Partial<Record<GigType, string[]>> = {
  coding: ["cursor", "codex", "claude", "github", "aws"],
  reservations: ["opentable", "resy", "yelp"],
  planning: ["opentable", "resy", "evite", "yelp"],
  creative: ["claude", "google", "gmail", "slack"],
  household: ["gmail", "slack", "stripe", "google"],
  scheduling: ["google", "gmail", "slack"],
  lifestyle: ["instacart", "doordash", "uber"],
  education: ["claude", "kimi", "google"],
  professional: ["claude", "stripe", "gmail"],
  business_formation: ["stripe", "gmail", "claude"],
};

/**
 * Lightweight keyword matcher: maps a prompt to a curated set of app ids.
 * Always leads with Gemini (Orca routing) so the reveal feels like real
 * orchestration, then the gig-type tool set, then any extra keyword hits.
 */
export function matchAppsByKeywords(prompt: string): string[] {
  const lower = prompt.toLowerCase();

  // Gemini (Orca routing) always leads the orchestration.
  const ids = new Set<string>(["gemini"]);

  // Curated, on-topic tools for this gig type lead the reveal.
  const type = classifyGigType(prompt);
  for (const id of TYPE_TOOLSETS[type] ?? []) ids.add(id);

  // Fill remaining slots with direct keyword hits (highest first).
  const matched = APPS.map((app) => ({
    id: app.id,
    hits: app.keywords.reduce((n, kw) => (lower.includes(kw) ? n + 1 : n), 0),
  }))
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  for (const m of matched) ids.add(m.id);

  // Cap so the reveal stays tasteful.
  return Array.from(ids).slice(0, 7);
}
