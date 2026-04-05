import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ shortCode: string }>;
}

const RESERVED_PATHS = new Set([
  "dashboard",
  "settings",
  "pricing",
  "login",
  "signup",
  "api",
  "examples",
]);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { shortCode } = await params;

  if (RESERVED_PATHS.has(shortCode)) return {};

  // TODO: Phase 7 -- Fetch gig/deliverable from DynamoDB by shortCode GSI
  // For now, return generic metadata
  return {
    title: `Gig Review — ${shortCode}`,
    description: "View this Gigler gig — deliverables, photos, timeline, and more.",
    openGraph: {
      title: `Gig Review — ${shortCode}`,
      description: "View this Gigler gig — deliverables, photos, timeline, and more.",
    },
    robots: { index: false, follow: false },
  };
}

export default async function GigReviewPage({ params }: PageProps) {
  const { shortCode } = await params;

  if (RESERVED_PATHS.has(shortCode)) notFound();

  // TODO: Phase 7 -- Look up deliverable/gig by shortCode in DynamoDB
  // const deliverable = await getDeliverableByShortCode(shortCode);
  // if (!deliverable) notFound();

  return (
    <main className="flex-1 pt-24">
      <div className="mx-auto max-w-3xl px-6 pb-24">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-brand-muted hover:text-foreground transition"
          >
            ← gigler.ai
          </Link>
        </div>

        <div className="rounded-xl border border-brand-border p-8 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h1 className="text-2xl font-bold mb-2">Gig Review Page</h1>
          <p className="text-brand-muted mb-6">
            This page will display the gig&apos;s deliverables, photos, timeline,
            and participant info once Phase 7 is implemented.
          </p>
          <p className="text-sm text-brand-muted">
            Short code: <code className="bg-brand-surface px-2 py-0.5 rounded">{shortCode}</code>
          </p>
        </div>

        {/* AI Chat Widget placeholder */}
        <div className="mt-8 rounded-xl border border-brand-border p-6">
          <h2 className="text-lg font-semibold mb-2">AI Chat</h2>
          <p className="text-sm text-brand-muted mb-4">
            Gig owners can chat with Gigler here to refine their gig review page.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. &quot;Change the hero image&quot; or &quot;Add a section about parking&quot;"
              className="flex-1 rounded-lg border border-brand-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              disabled
            />
            <button
              className="rounded-lg bg-brand-primary px-4 py-2 text-sm text-white font-medium opacity-50 cursor-not-allowed"
              disabled
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
