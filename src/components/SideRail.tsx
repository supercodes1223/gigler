"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Folder, Info, ListChecks, Plus, Settings, User } from "lucide-react";
import { useReturnHome } from "@/components/GigStatusProvider";

interface RailItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** Match the active state on exact path or path prefix. */
  match?: (pathname: string) => boolean;
}

const ICON_SIZE = 20;
const ICON_STROKE = 1.8;

function railIcon(Icon: ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>): ReactNode {
  return <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />;
}

const NEW_GIG: RailItem = {
  href: "/",
  label: "New gig",
  icon: railIcon(Plus),
  match: (p) => p === "/",
};

const ITEMS: RailItem[] = [
  {
    href: "/dashboard",
    label: "Gigs",
    icon: railIcon(ListChecks),
    match: (p) => p === "/dashboard" || (p.startsWith("/dashboard/") && !p.startsWith("/dashboard/settings")),
  },
  {
    href: "/dashboard",
    label: "Folders",
    icon: railIcon(Folder),
  },
  {
    href: "/about",
    label: "About",
    icon: railIcon(Info),
    match: (p) => p === "/about",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: railIcon(Settings),
    match: (p) => p.startsWith("/dashboard/settings"),
  },
];

function railItemClass(active: boolean): string {
  return [
    "group relative flex h-10 w-10 items-center justify-center rounded-xl transition",
    active
      ? "bg-brand-surface text-foreground"
      : "text-brand-muted hover:bg-brand-surface/70 hover:text-foreground",
  ].join(" ");
}

function Tooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-12 z-50 whitespace-nowrap rounded-md border border-brand-border bg-background-alt px-2 py-1 text-xs font-medium text-foreground opacity-0 shadow-lg transition group-hover:opacity-100">
      {label}
    </span>
  );
}

export default function SideRail() {
  const pathname = usePathname() || "/";
  // Shared return-home behavior (confirm if a gig is underway, reset in place
  // on the home route, navigate home otherwise).
  const handleBrandClick = useReturnHome();
  // Active highlighting depends on the URL, which can differ between the static
  // prerender and the client. Defer it until after mount so the first client
  // paint matches the server exactly (no hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isActive = (match?: (p: string) => boolean) => mounted && (match?.(pathname) ?? false);

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-14 flex-col items-center border-r border-brand-border bg-background-alt/80 py-3 backdrop-blur-md md:flex">
      {/* Brand */}
      <Link
        href="/"
        aria-label="Gigler home"
        onClick={handleBrandClick}
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-accent to-purple-500 text-sm font-extrabold text-white shadow-lg shadow-black/30"
      >
        G
      </Link>

      <div className="h-px w-7 bg-brand-border" />

      {/* New gig */}
      <div className="mt-3">
        <Link href={NEW_GIG.href} aria-label={NEW_GIG.label} className={railItemClass(isActive(NEW_GIG.match))}>
          {NEW_GIG.icon}
          <Tooltip label={NEW_GIG.label} />
        </Link>
      </div>

      {/* Primary nav */}
      <nav className="mt-2 flex flex-col items-center gap-1">
        {ITEMS.map((item) => {
          const active = isActive(item.match);
          return (
            <Link key={item.label} href={item.href} aria-label={item.label} className={railItemClass(active)}>
              {item.icon}
              <Tooltip label={item.label} />
            </Link>
          );
        })}
      </nav>

      {/* Profile pinned at bottom */}
      <Link
        href="/dashboard"
        aria-label="Account"
        className="group relative mt-auto flex h-10 w-10 items-center justify-center rounded-full border border-brand-border text-brand-muted transition hover:text-foreground"
      >
        <User size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden />
        <Tooltip label="Account" />
      </Link>
    </aside>
  );
}
