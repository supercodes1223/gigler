import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Settings — Profile & Billing",
  robots: { index: false, follow: false },
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    features: ["5 active gigs", "SMS only", "1 deliverable/gig"],
    current: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$20/mo",
    features: ["Unlimited gigs", "Voice calls", "Group gigs (5)", "Unlimited deliverables"],
    current: false,
  },
  {
    id: "team",
    name: "Team",
    price: "$50/mo",
    features: ["Everything in Pro", "10 users", "Group gigs (20)", "Team dashboard"],
    current: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    features: ["Unlimited", "SSO", "Custom integrations", "Dedicated support"],
    current: false,
  },
];

export default function SettingsPage() {
  // TODO: Fetch user profile from DynamoDB or Amplify auth
  // TODO: Stripe billing integration

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
          {/* Profile Section */}
          <section className="rounded-xl border border-brand-border p-6">
            <h2 className="text-lg font-semibold mb-4">Profile</h2>
            <form className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-brand-border bg-background text-foreground px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    className="w-full rounded-lg border border-brand-border px-4 py-2 text-sm bg-brand-surface cursor-not-allowed"
                    placeholder="+1 (555) 000-0000"
                    disabled
                  />
                  <p className="text-xs text-brand-muted mt-1">Phone is set via SMS</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    className="w-full rounded-lg border border-brand-border bg-background text-foreground px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Timezone</label>
                  <select className="w-full rounded-lg border border-brand-border bg-background text-foreground px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
                    <option>America/Chicago</option>
                    <option>America/New_York</option>
                    <option>America/Denver</option>
                    <option>America/Los_Angeles</option>
                    <option>America/Anchorage</option>
                    <option>Pacific/Honolulu</option>
                  </select>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Notifications</h3>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded" />
                  SMS notifications
                </label>
                <label className="flex items-center gap-2 text-sm mt-1">
                  <input type="checkbox" className="rounded" />
                  Email notifications
                </label>
              </div>
              <button
                type="submit"
                className="rounded-lg bg-brand-primary px-6 py-2 text-sm text-white font-medium hover:bg-brand-primary-hover transition"
              >
                Save Changes
              </button>
            </form>
          </section>

          {/* Billing Section */}
          <section className="rounded-xl border border-brand-border p-6">
            <h2 className="text-lg font-semibold mb-4">Plan & Billing</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-lg border p-4 ${
                    plan.current
                      ? "border-brand-primary ring-2 ring-brand-primary"
                      : "border-brand-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{plan.name}</h3>
                    {plan.current && (
                      <span className="text-xs bg-brand-primary text-white px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold mb-3">{plan.price}</p>
                  <ul className="space-y-1 mb-4">
                    {plan.features.map((f, i) => (
                      <li key={i} className="text-xs text-brand-muted">
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!plan.current && (
                    <button className="w-full rounded-lg border border-brand-border px-3 py-1.5 text-sm hover:bg-brand-surface transition">
                      {plan.id === "enterprise" ? "Contact Us" : "Upgrade"}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-brand-muted mt-4">
              Stripe billing integration coming soon. Upgrade flows will use Stripe Checkout.
            </p>
          </section>

          {/* Danger Zone */}
          <section className="rounded-xl border border-red-200 p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Delete Account</p>
                <p className="text-xs text-brand-muted">
                  Permanently delete your account and all associated data.
                </p>
              </div>
              <button className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                Delete Account
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
