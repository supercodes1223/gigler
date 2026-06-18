"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { useGigStatus } from "@/components/GigStatusProvider";

interface RailItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** Match the active state on exact path or path prefix. */
  match?: (pathname: string) => boolean;
}

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const NEW_GIG: RailItem = {
  href: "/",
  label: "New gig",
  icon: (
    <svg {...iconProps}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  match: (p) => p === "/",
};

const ITEMS: RailItem[] = [
  {
    href: "/dashboard",
    label: "Gigs",
    icon: (
      <svg {...iconProps}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    match: (p) => p === "/dashboard" || (p.startsWith("/dashboard/") && !p.startsWith("/dashboard/settings")),
  },
  {
    href: "/dashboard",
    label: "Folders",
    icon: (
      <svg {...iconProps}>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    href: "/about",
    label: "About",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </svg>
    ),
    match: (p) => p === "/about",
  },
  {
    href: "/pricing",
    label: "Plans",
    icon: (
      <svg {...iconProps}>
        <path d="M12 2l2.4 5.2 5.6.6-4.2 3.8 1.2 5.6L12 20l-5 2.7 1.2-5.6L4 13.3l5.6-.6z" />
      </svg>
    ),
    match: (p) => p === "/pricing",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: (
      <svg {...iconProps}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </svg>
    ),
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
  const router = useRouter();
  const { inProgress, reset } = useGigStatus();
  // Active highlighting depends on the URL, which can differ between the static
  // prerender and the client. Defer it until after mount so the first client
  // paint matches the server exactly (no hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isActive = (match?: (p: string) => boolean) => mounted && (match?.(pathname) ?? false);

  // The brand mark returns home. If a gig is underway we confirm first so the
  // user doesn't lose in-progress work; on the home route we reset the hero in
  // place rather than triggering a full navigation.
  const handleBrandClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (inProgress) {
      const ok = window.confirm(
        "A gig is already underway. Leave and start over? Your current progress will be lost.",
      );
      if (!ok) return;
    }
    if (pathname === "/") {
      reset();
    } else {
      router.push("/");
    }
  };

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
        <svg {...iconProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
        <Tooltip label="Account" />
      </Link>
    </aside>
  );
}
