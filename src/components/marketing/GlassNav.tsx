import Link from "next/link";
import { WaitlistButton } from "./WaitlistButton";

export function GlassNav() {
  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav className="glass-strong flex w-full max-w-md items-center justify-between rounded-full py-2 pl-5 pr-2">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          Gigler
        </Link>
        <WaitlistButton size="sm" />
      </nav>
    </header>
  );
}
