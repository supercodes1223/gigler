"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

interface AuthUser {
  userId: string;
  username: string;
  signInDetails?: {
    loginId?: string;
  };
}

/**
 * Protects dashboard routes with Cognito authentication.
 * Shows a sign-in prompt if the user is not authenticated.
 * Falls back gracefully when Amplify is not yet configured.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [amplifyAvailable, setAmplifyAvailable] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { getCurrentUser } = await import("aws-amplify/auth");
        setAmplifyAvailable(true);
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center pt-24">
        <div className="text-brand-muted">Loading...</div>
      </div>
    );
  }

  if (!amplifyAvailable) {
    return (
      <div className="flex-1 pt-24">
        <div className="mx-auto max-w-md px-6 text-center">
          <div className="rounded-xl border border-brand-border p-8">
            <h2 className="text-xl font-semibold mb-4">Authentication Not Configured</h2>
            <p className="text-brand-muted text-sm mb-6">
              Cognito auth will be available after the first Amplify deployment.
              For now, the dashboard is accessible without login.
            </p>
          </div>
        </div>
        {children}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 pt-24">
        <div className="mx-auto max-w-md px-6 text-center">
          <div className="rounded-xl border border-brand-border p-8">
            <h2 className="text-xl font-semibold mb-4">Sign In to Gigler</h2>
            <p className="text-brand-muted text-sm mb-6">
              Sign in with your email to access your dashboard and manage your gigs.
            </p>
            <SignInForm onSignIn={setUser} />
            <p className="mt-6 text-sm text-brand-muted">
              Don&apos;t have an account?{" "}
              <Link href="/dashboard" className="text-brand-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function SignInForm({ onSignIn }: { onSignIn: (user: AuthUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const { signIn, getCurrentUser } = await import("aws-amplify/auth");
      await signIn({ username: email, password });
      const currentUser = await getCurrentUser();
      onSignIn(currentUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-brand-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-brand-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          required
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-brand-primary py-2.5 text-white font-medium hover:bg-brand-primary-hover transition disabled:opacity-50"
      >
        {submitting ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
