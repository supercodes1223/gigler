import { Brain, ShieldCheck, KeyRound } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const POINTS = [
  {
    icon: Brain,
    title: "It remembers you",
    body: "Your preferences, your people, your plans. You never re-explain yourself.",
  },
  {
    icon: ShieldCheck,
    title: "It asks first",
    body: "Anything big, expensive, or irreversible gets your okay before it happens.",
  },
  {
    icon: KeyRound,
    title: "Your data is yours",
    body: "See everything it knows. Edit it. Or just say “forget that” — and it does.",
  },
];

export function Trust() {
  return (
    <section id="trust" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <SectionHeader eyebrow="Trust" title="Built to be trusted." />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {POINTS.map((point) => (
            <div key={point.title} className="flex flex-col items-center text-center">
              <span className="glass flex size-14 items-center justify-center rounded-2xl">
                <point.icon className="size-6 text-foreground/75" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                {point.title}
              </h3>
              <p className="mt-1.5 max-w-60 text-sm leading-relaxed text-foreground/65">
                {point.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
