import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard — Your Gigs",
  description: "View and manage all your Gigler gigs.",
  robots: { index: false, follow: false },
};

const GIG_TYPE_ICONS: Record<string, string> = {
  coding: "💻",
  planning: "🎉",
  creative: "🎨",
  professional: "📋",
  lifestyle: "🏠",
  scheduling: "⏰",
  education: "📚",
  business_formation: "🏢",
  reservations: "🍽️",
};

const GIG_STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  paused: "bg-yellow-100 text-yellow-800",
  completed: "bg-blue-100 text-blue-800",
  archived: "bg-gray-100 text-gray-500",
};

interface GigCardProps {
  id: string;
  title: string;
  type: string;
  status: string;
  lastMessage?: string;
  participantCount: number;
  createdAt: string;
}

function GigCard({ id, title, type, status, lastMessage, participantCount, createdAt }: GigCardProps) {
  const icon = GIG_TYPE_ICONS[type] || "📌";
  const statusClass = GIG_STATUS_COLORS[status] || GIG_STATUS_COLORS.active;
  const typeLabel = type.replace("_", " ");

  return (
    <Link
      href={`/dashboard/${id}`}
      className="block rounded-xl border border-brand-border p-5 hover:shadow-md transition group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="font-semibold group-hover:text-brand-primary transition">
              {title}
            </h3>
            <span className="text-xs text-brand-muted capitalize">{typeLabel}</span>
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}`}>
          {status}
        </span>
      </div>

      {lastMessage && (
        <p className="text-sm text-brand-muted line-clamp-2 mb-3">
          {lastMessage}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-brand-muted">
        <span>{participantCount} participant{participantCount !== 1 ? "s" : ""}</span>
        <span>{new Date(createdAt).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  // TODO: Fetch user's gigs from DynamoDB (byOwner GSI)
  // This is a static placeholder -- will be replaced with real data fetching

  const mockGigs: GigCardProps[] = [];

  return (
    <main className="flex-1 pt-24">
      <div className="mx-auto max-w-5xl px-6 pb-24">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Your Gigs</h1>
          <div className="flex gap-3">
            <select className="rounded-lg border border-brand-border px-3 py-2 text-sm">
              <option>All Types</option>
              <option>Coding</option>
              <option>Planning</option>
              <option>Creative</option>
              <option>Professional</option>
              <option>Scheduling</option>
              <option>Lifestyle</option>
              <option>Education</option>
              <option>Business</option>
              <option>Reservations</option>
            </select>
            <select className="rounded-lg border border-brand-border px-3 py-2 text-sm">
              <option>Active</option>
              <option>All Statuses</option>
              <option>Paused</option>
              <option>Completed</option>
              <option>Archived</option>
            </select>
          </div>
        </div>

        {mockGigs.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {mockGigs.map((gig) => (
              <GigCard key={gig.id} {...gig} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-brand-border p-12 text-center">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-xl font-semibold mb-2">No gigs yet</h2>
            <p className="text-brand-muted mb-6 max-w-md mx-auto">
              Text Gigler to create your first gig. Plan a party, build a website,
              form an LLC — whatever you need, just text it.
            </p>
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium">
                Text <span className="text-brand-primary font-bold">(512) 555-GIGLER</span> to start
              </p>
              <span className="text-xs text-brand-muted">or</span>
              <Link
                href="/examples"
                className="text-sm text-brand-primary font-medium hover:underline"
              >
                Browse gig examples →
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
