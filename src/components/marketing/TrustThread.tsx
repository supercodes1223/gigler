"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

// The three trust rules played out as one continuous conversation: each rule
// is a floating chip annotating the exchange that proves it. Messages stagger
// in once the thread scrolls into view.

const THREAD = [
  {
    rule: "Gigler remembers you",
    messages: [
      { from: "user" as const, text: "Dinner with Maya on Friday?" },
      { from: "gigler" as const, text: "Corner table at Osteria, 7:30, your usual. Booked." },
    ],
  },
  {
    rule: "Gigler asks first",
    messages: [
      { from: "gigler" as const, text: "Heads up, rebooking is $120. Want me to go ahead?" },
      { from: "user" as const, text: "Go for it 👍" },
    ],
  },
  {
    rule: "Your data is yours",
    messages: [
      { from: "user" as const, text: "Forget my old address" },
      { from: "gigler" as const, text: "Done. I’ve forgotten your old address." },
    ],
  },
];

// Flattened so chips and bubbles share one stagger sequence.
const ITEMS = THREAD.flatMap((group) => [
  { kind: "chip" as const, text: group.rule, rule: group.rule },
  ...group.messages.map((m) => ({ kind: m.from, text: m.text, rule: group.rule })),
]);

const STAGGER_MS = 110;

type TrustThreadProps = {
  className?: string;
};

export function TrustThread({ className }: TrustThreadProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      setRevealed(true);
      return;
    }
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reducedMotion]);

  let ruleIndex = 0;

  return (
    <div
      ref={rootRef}
      className={cn("mx-auto flex max-w-xl flex-col gap-2.5", className)}
    >
      {ITEMS.map((item, i) => {
        const reveal = reducedMotion
          ? undefined
          : {
              className: cn(
                "transition-all duration-500 ease-out",
                revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              ),
              style: { transitionDelay: `${i * STAGGER_MS}ms` },
            };

        if (item.kind === "chip") {
          ruleIndex += 1;
          return (
            <div
              key={i}
              className={cn("text-center", i > 0 && "mt-6", reveal?.className)}
              style={reveal?.style}
            >
              <span className="inline-block rounded-full bg-spring-leaf/20 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#2f8f63]">
                Rule {ruleIndex} · {item.text}
              </span>
            </div>
          );
        }

        if (item.kind === "user") {
          return (
            <p
              key={i}
              className={cn(
                "w-fit max-w-[75%] self-end rounded-[18px] rounded-br-[4px] bg-foreground px-4 py-2.5 text-sm leading-snug text-background",
                reveal?.className
              )}
              style={reveal?.style}
            >
              {item.text}
            </p>
          );
        }

        return (
          <div
            key={i}
            className={cn("flex max-w-[80%] items-start gap-2.5 self-start", reveal?.className)}
            style={reveal?.style}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#6cc197] to-[#2f8f63] text-[10px] font-semibold text-white">
              G
            </span>
            <p className="rounded-[18px] rounded-bl-[4px] bg-white/55 px-4 py-2.5 text-sm leading-snug text-foreground/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(20,30,40,0.06)] backdrop-blur-sm">
              {item.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
