import { Brain, ShieldCheck, KeyRound } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const POINTS = [
  {
    icon: Brain,
    title: "Gigler remembers you",
    body: "Your preferences, your people, your plans. You never re-explain yourself.",
    example: "“Corner table at Osteria, 7:30, your usual. Booked.”",
  },
  {
    icon: ShieldCheck,
    title: "Gigler asks first",
    body: "Anything big, expensive, or irreversible gets your okay before it happens.",
    example: "“Heads up, rebooking is $120. Want me to go ahead?”",
  },
  {
    icon: KeyRound,
    title: "Your data is yours",
    body: "See everything it knows. Edit it. Or just say “forget that,” and it does.",
    example: "“Done. I’ve forgotten your old address.”",
  },
];

export function Trust() {
  return (
    <section id="trust" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <SectionHeader eyebrow="Trust" title="Built to be trusted." />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {POINTS.map((point) => (
            <article key={point.title} className="glass flex flex-col rounded-3xl p-6">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(20,30,40,0.08)]">
                <point.icon className="size-5 text-foreground/75" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                {point.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/65">
                {point.body}
              </p>
              <div className="mt-auto pt-5">
                <div className="h-px bg-foreground/10" />
                <div className="mt-4 flex items-start gap-2.5">
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
