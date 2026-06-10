"use client";

import Link from "next/link";
import { WaitlistButton } from "./WaitlistButton";
import { useLiquidGlass } from "@/components/ui/liquid-glass";

export function GlassNav() {
  // Refraction on Chromium; Safari/Firefox keep the .glass-strong frosted look.
  const { ref, style, filter } = useLiquidGlass<HTMLElement>({
    blur: 10,
    saturate: 1.8,
    background: "rgba(255, 255, 255, 0.5)",
  });

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        ref={ref}
        style={style}
        className="glass-strong flex w-full max-w-md items-center justify-between rounded-full py-2 pl-5 pr-2"
      >
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          Gigler
        </Link>
        <WaitlistButton size="sm" />
      </nav>
      {filter}
    </header>
  );
}
