import Image from "next/image";
import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="py-12 border-t border-brand-border">
      <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/nvidia-inception-program-badge-dark.jpg"
            alt="NVIDIA Inception Program"
            width={350}
            height={130}
            className="h-auto w-56 sm:w-72 md:w-80"
          />
          <div className="text-sm font-semibold text-foreground">
            NVIDIA Inception Program
          </div>
          <div className="text-sm text-brand-muted">
            &copy; {new Date().getFullYear()} Gigler. All rights reserved.
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
