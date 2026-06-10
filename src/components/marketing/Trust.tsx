import { SectionHeader } from "./SectionHeader";
import { LockDuotone } from "@/components/ui/sf-icons";
import { cn } from "@/lib/utils";

const POINTS = [
  {
    title: "Gigler remembers you",
    body: "Your preferences, your people, your plans. You never re-explain yourself.",
    example: "“Corner table at Osteria, 7:30, your usual. Booked.”",
  },
  {
    title: "Gigler asks first",
    body: "Anything big, expensive, or irreversible gets your okay before it happens.",
    example: "“Heads up, rebooking is $120. Want me to go ahead?”",
  },
  {
    title: "Your data is yours",
    body: "See everything it knows. Edit it. Or just say “forget that,” and it does.",
    example: "“Done. I’ve forgotten your old address.”",
  },
];

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
          <div
            className="absolute -inset-36 -translate-x-16 -translate-y-10 rounded-full blur-3xl"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(207,229,247,0.8) 0%, transparent 70%)",
            }}
            aria-hidden
          />
          <div
            className="absolute -inset-32 translate-x-20 translate-y-12 rounded-full blur-3xl"
            style={{
              backgroundImage:
                "radial-gradient(circle, rgba(226,220,245,0.65) 0%, transparent 72%)",
            }}
            aria-hidden
          />
          <div
            className="absolute -inset-20 rounded-full blur-2xl"
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
          <div className="glass relative flex size-20 items-center justify-center rounded-[1.45rem] md:size-24 md:rounded-[1.7rem]">
            {/* Opacity on the element, not the stroke color — alpha strokes
                double-darken where the shackle overlaps the body */}
            <LockDuotone className="size-14 text-foreground opacity-75 md:size-16" />
          </div>
        </div>

        <SectionHeader
          className="mt-12"
          eyebrow="Trust"
          title="Built to be trusted."
          subtitle="Real-world actions need real trust. Gigler plays by three rules."
        />

        {/* One unified glass bar, hairline-divided — quieter than a card grid
            so the lock stays the focal point */}
        <div className="glass mt-14 grid rounded-[2rem] md:grid-cols-3">
          {POINTS.map((point, i) => (
            <article
              key={point.title}
              className={cn(
                "flex flex-col p-7",
                i > 0 && "border-t border-foreground/[0.08] md:border-l md:border-t-0"
              )}
            >
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                {point.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/65">
                {point.body}
              </p>
              <div className="mt-auto pt-5">
                <div className="flex items-start gap-2.5 rounded-2xl bg-white/55 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(20,30,40,0.06)]">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#6cc197] to-[#2f8f63] text-[10px] font-semibold text-white">
                    G
                  </span>
                  <p className="text-sm leading-snug text-foreground/70">
                    {point.example}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
