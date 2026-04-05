import type { Metadata } from "next";
import Link from "next/link";

interface PageProps {
  params: Promise<{ gigId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { gigId } = await params;
  return {
    title: `Gig Detail — ${gigId}`,
    robots: { index: false, follow: false },
  };
}

export default async function GigDetailPage({ params }: PageProps) {
  const { gigId } = await params;

  // TODO: Phase 13 -- Fetch gig detail from DynamoDB
  // TODO: Phase 13 -- Render conversation thread, media gallery, deliverables, participants, reminders

  return (
    <main className="flex-1 pt-24">
      <div className="mx-auto max-w-5xl px-6 pb-24">
        <Link
          href="/dashboard"
          className="text-sm text-brand-muted hover:text-foreground transition mb-6 inline-block"
        >
          ← Back to Gigs
        </Link>

        <h1 className="text-2xl font-bold mb-4">Gig Detail</h1>
        <p className="text-brand-muted mb-8">
          Gig ID: <code className="bg-brand-surface px-2 py-0.5 rounded text-sm">{gigId}</code>
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-xl border border-brand-border p-6">
            <h2 className="font-semibold mb-4">Conversation</h2>
            <p className="text-sm text-brand-muted">
              Full conversation thread will render here in Phase 13.
            </p>
          </div>
          <div className="space-y-6">
            <div className="rounded-xl border border-brand-border p-6">
              <h2 className="font-semibold mb-4">Participants</h2>
              <p className="text-sm text-brand-muted">Coming in Phase 13.</p>
            </div>
            <div className="rounded-xl border border-brand-border p-6">
              <h2 className="font-semibold mb-4">Deliverables</h2>
              <p className="text-sm text-brand-muted">Coming in Phase 7.</p>
            </div>
            <div className="rounded-xl border border-brand-border p-6">
              <h2 className="font-semibold mb-4">Reminders</h2>
              <p className="text-sm text-brand-muted">Coming in Phase 8.</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
