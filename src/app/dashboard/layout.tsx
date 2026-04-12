import type { ReactNode } from "react";
import Link from "next/link";
import { AmplifyProvider } from "@/components/AmplifyProvider";
import { AuthGuard } from "@/components/AuthGuard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AmplifyProvider>
      <AuthGuard>
        <div className="flex-1 flex flex-col">
          <nav className="fixed top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-brand-border">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-2xl font-bold text-brand-primary">
                Gigler
              </Link>
              <div className="flex items-center gap-6 text-sm">
                <Link
                  href="/dashboard"
                  className="text-brand-muted hover:text-foreground transition"
                >
                  Gigs
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="text-brand-muted hover:text-foreground transition"
                >
                  Settings
                </Link>
              </div>
            </div>
          </nav>
          <div className="flex-1">{children}</div>
          <footer className="py-12 border-t border-brand-border">
            <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-brand-muted">
                &copy; {new Date().getFullYear()} Gigler. All rights reserved.
              </div>
              <div className="flex gap-6 text-sm text-brand-muted items-center">
                <span>Built in Carmel, CA with <span className="text-red-500">&#10084;</span></span>
                <Link href="/about" className="hover:text-foreground transition">About</Link>
                <Link href="/pricing" className="hover:text-foreground transition">Pricing</Link>
                <Link href="/careers" className="hover:text-foreground transition">Careers</Link>
                <Link href="/dashboard" className="hover:text-foreground transition">Login</Link>
              </div>
            </div>
          </footer>
        </div>
      </AuthGuard>
    </AmplifyProvider>
  );
}
