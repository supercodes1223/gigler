import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Settings — Profile & Billing",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  // TODO: Phase 13 -- Protect with Cognito Authenticator
  // TODO: Phase 14 -- Stripe billing integration

  return (
    <main className="flex-1 pt-24">
      <div className="mx-auto max-w-3xl px-6 pb-24">
        <Link
          href="/dashboard"
          className="text-sm text-brand-muted hover:text-foreground transition mb-6 inline-block"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="space-y-8">
          <section className="rounded-xl border border-brand-border p-6">
            <h2 className="text-lg font-semibold mb-4">Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-brand-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="Your name"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full rounded-lg border border-brand-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="your@email.com"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  className="w-full rounded-lg border border-brand-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="+1 (555) 000-0000"
                  disabled
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Timezone</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-brand-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  placeholder="America/Chicago"
                  disabled
                />
              </div>
            </div>
            <p className="text-xs text-brand-muted mt-4">
              Profile editing coming in Phase 13.
            </p>
          </section>

          <section className="rounded-xl border border-brand-border p-6">
            <h2 className="text-lg font-semibold mb-4">Billing & Plan</h2>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-sm text-brand-muted">Current plan:</span>
                <span className="ml-2 font-semibold">Free</span>
              </div>
              <button
                className="rounded-lg bg-brand-primary px-4 py-2 text-sm text-white font-medium opacity-50 cursor-not-allowed"
                disabled
              >
                Upgrade
              </button>
            </div>
            <p className="text-xs text-brand-muted">
              Stripe billing integration coming in Phase 14.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
