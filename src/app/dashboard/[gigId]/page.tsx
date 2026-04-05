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

function ConversationThread() {
  // TODO: Fetch messages from Message table (gigId + timestamp composite key)
  return (
    <div className="rounded-xl border border-brand-border flex flex-col h-[600px]">
      <div className="p-4 border-b border-brand-border">
        <h2 className="font-semibold">Conversation</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <p className="text-sm text-brand-muted text-center py-8">
          Conversation messages will appear here once the gig has activity.
        </p>
      </div>
      <div className="p-4 border-t border-brand-border">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Send a message via the dashboard..."
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
  );
}

function MediaGallery() {
  return (
    <div className="rounded-xl border border-brand-border p-4">
      <h2 className="font-semibold mb-3">Media</h2>
      <div className="grid grid-cols-3 gap-2">
        <p className="col-span-3 text-sm text-brand-muted text-center py-4">
          Photos and files will appear here.
        </p>
      </div>
    </div>
  );
}

function DeliverablesList() {
  return (
    <div className="rounded-xl border border-brand-border p-4">
      <h2 className="font-semibold mb-3">Deliverables</h2>
      <p className="text-sm text-brand-muted">
        PDFs, hosted pages, and other deliverables will appear here.
      </p>
    </div>
  );
}

function ParticipantsList() {
  return (
    <div className="rounded-xl border border-brand-border p-4">
      <h2 className="font-semibold mb-3">Participants</h2>
      <div className="space-y-2">
        <p className="text-sm text-brand-muted">
          Gig participants will appear here.
        </p>
      </div>
      <button
        className="mt-3 w-full rounded-lg border border-brand-border px-3 py-1.5 text-sm hover:bg-brand-surface transition"
        disabled
      >
        + Add Participant
      </button>
    </div>
  );
}

function RemindersList() {
  return (
    <div className="rounded-xl border border-brand-border p-4">
      <h2 className="font-semibold mb-3">Reminders</h2>
      <p className="text-sm text-brand-muted">
        Scheduled reminders and check-ins will appear here.
      </p>
      <button
        className="mt-3 w-full rounded-lg border border-brand-border px-3 py-1.5 text-sm hover:bg-brand-surface transition"
        disabled
      >
        + Add Reminder
      </button>
    </div>
  );
}

export default async function GigDetailPage({ params }: PageProps) {
  const { gigId } = await params;
  // TODO: Fetch gig from DynamoDB by ID

  return (
    <main className="flex-1 pt-24">
      <div className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-brand-muted hover:text-foreground transition mb-2 inline-block"
            >
              ← Back to Gigs
            </Link>
            <h1 className="text-2xl font-bold">Gig Detail</h1>
            <p className="text-sm text-brand-muted mt-1">
              ID: <code className="bg-brand-surface px-1.5 py-0.5 rounded text-xs">{gigId}</code>
            </p>
          </div>
          <div className="flex gap-2">
            <button className="rounded-lg border border-brand-border px-4 py-2 text-sm hover:bg-brand-surface transition">
              Pause
            </button>
            <button className="rounded-lg border border-brand-border px-4 py-2 text-sm hover:bg-brand-surface transition text-red-600">
              Archive
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ConversationThread />
          </div>
          <div className="space-y-6">
            <ParticipantsList />
            <DeliverablesList />
            <MediaGallery />
            <RemindersList />
          </div>
        </div>
      </div>
    </main>
  );
}
