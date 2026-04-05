import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard — Your Gigs",
  description: "View and manage all your Gigler gigs from one place.",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  // TODO: Phase 13 -- Protect with Cognito Authenticator
  // TODO: Phase 13 -- Fetch user's gigs from DynamoDB (byOwner GSI)

  return (
    <main className="flex-1 pt-24">
      <div className="mx-auto max-w-5xl px-6 pb-24">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Your Gigs</h1>
          <Link
            href="/dashboard/settings"
            className="text-sm text-brand-muted hover:text-foreground transition"
          >
            Settings
          </Link>
        </div>

        <div className="rounded-xl border border-dashed border-brand-border p-12 text-center">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-xl font-semibold mb-2">No gigs yet</h2>
          <p className="text-brand-muted mb-6">
            Text Gigler to create your first gig, or start one here.
          </p>
          <p className="text-sm text-brand-muted">
            Dashboard implementation coming in Phase 13.
          </p>
        </div>
      </div>
    </main>
  );
}
