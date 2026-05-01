import Image from "next/image";
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="py-12 border-t border-brand-border">
      <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-center">
          <Image
            src="/nvidia-inception-member-badge-dark.jpg"
            alt="NVIDIA Inception Program Partner"
            width={224}
            height={88}
            className="h-auto w-56"
          />
          <div className="text-center md:text-left">
            <div className="text-sm font-semibold text-foreground">
              Member of NVIDIA Inception
            </div>
            <div className="mt-1 max-w-xs text-xs leading-relaxed text-brand-muted">
              Building AI work orchestration with NVIDIA startup resources.
            </div>
            <div className="mt-3 text-sm text-brand-muted">
              &copy; {new Date().getFullYear()} Gigler. All rights reserved.
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 text-sm text-brand-muted items-center">
          <span className="whitespace-nowrap">
            Built in Carmel, CA with <span className="text-red-500">&#10084;</span>
          </span>
          <div className="flex gap-6 items-center">
            <Link href="/about" className="hover:text-foreground transition">
              About
            </Link>
            <Link href="/pricing" className="hover:text-foreground transition">
              Pricing
            </Link>
            <Link href="/careers" className="hover:text-foreground transition">
              Careers
            </Link>
            <Link href="/dashboard" className="hover:text-foreground transition">
              Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
