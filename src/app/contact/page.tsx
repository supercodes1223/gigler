import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Save Gigler Contact | Gigler",
  description: "Add Gigler to your contacts for easy access.",
};

export default function ContactPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#007AFF] to-[#34AADC] px-4 text-white">
      <div className="flex max-w-sm flex-col items-center gap-6 rounded-3xl bg-white/10 p-10 backdrop-blur-lg">
        <Image
          src="/gigler-icon.png"
          alt="Gigler"
          width={128}
          height={128}
          className="rounded-[28px] shadow-xl"
          priority
        />
        <h1 className="text-3xl font-bold tracking-tight">Gigler</h1>
        <p className="text-center text-base text-white/80">
          Gig your world. Get stuff done.
        </p>
        <a
          href="/gigler.vcf"
          className="w-full rounded-2xl bg-white py-3.5 text-center text-lg font-semibold text-[#007AFF] shadow-lg transition hover:bg-white/90 active:scale-[0.97]"
        >
          Save Contact
        </a>
        <p className="text-xs text-white/50">
          Text (650) 835-1235 to start a Gig
        </p>
      </div>
    </main>
  );
}
