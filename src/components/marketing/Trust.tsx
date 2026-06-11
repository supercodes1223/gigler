import { SectionHeader } from "./SectionHeader";
import { Lock3D } from "./Lock3D";
import { TrustThread } from "./TrustThread";

export function Trust() {
  return (
    <section id="trust" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        {/* Lock centerpiece — sits above the header, the section's one visual
            moment. Glass tile + gradient badge, echoing the "G" avatar, with
            concentric rings that fade out before reaching the header. */}
        <div className="relative mx-auto flex w-fit items-center justify-center">
          {/* Inline styles, not bg-[...] arbitrary classes: Tailwind's JIT
              fails to generate CSS for these positioned radial gradients */}
          {/* Three glow sources with staggered centers — mint anchored on the
              lock, sky drifting up-left, lilac down-right — so the wash reads
              like the hero mesh, not a single bullseye */}
          {/* Each glow fades out via mask before reaching the eyebrow/title
              below — same trick as the rings */}
          <div
            className="absolute -inset-36 -translate-x-16 -translate-y-10 rounded-full blur-3xl [mask-image:linear-gradient(to_bottom,black_55%,transparent_78%)]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(207,229,247,0.8) 0%, transparent 70%)",
            }}
            aria-hidden
          />
          <div
            className="absolute -inset-32 translate-x-20 translate-y-12 rounded-full blur-3xl [mask-image:linear-gradient(to_bottom,black_45%,transparent_70%)]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(226,220,245,0.65) 0%, transparent 72%)",
            }}
            aria-hidden
          />
          <div
            className="absolute -inset-20 rounded-full blur-2xl [mask-image:linear-gradient(to_bottom,black_60%,transparent_85%)]"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(143,201,168,0.55) 0%, transparent 65%)",
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute [mask-image:linear-gradient(to_bottom,black_45%,transparent_72%)]"
            aria-hidden
          >
            <div className="relative flex size-72 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-foreground/[0.06]" />
              <div className="absolute inset-9 rounded-full border border-foreground/[0.08]" />
              <div className="absolute inset-[4.5rem] rounded-full border border-foreground/[0.1]" />
            </div>
          </div>
          {/* Floats free over the glow like a rendered object — no tile, the
              drop shadow does the grounding */}
          <Lock3D className="relative size-28 drop-shadow-[0_16px_26px_rgba(47,143,99,0.35)] md:size-32" />
        </div>

        <SectionHeader
          className="mt-8"
          eyebrow="Trust"
          title="Built to be trusted."
          subtitle="Real-world actions need real trust. Gigler plays by three rules."
        />

        {/* The three rules played out as one conversation — each rule chip
            annotates the exchange that proves it (see TrustThread) */}
        <TrustThread className="mt-14" />
      </div>
    </section>
  );
}
