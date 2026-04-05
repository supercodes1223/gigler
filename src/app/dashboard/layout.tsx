import type { ReactNode } from "react";
import Link from "next/link";
import { AmplifyProvider } from "@/components/AmplifyProvider";
import { AuthGuard } from "@/components/AuthGuard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AmplifyProvider>
      <AuthGuard>
        <div className="flex-1">
          <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-brand-border">
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
          {children}
        </div>
      </AuthGuard>
    </AmplifyProvider>
  );
}
