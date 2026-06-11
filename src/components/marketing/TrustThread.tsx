"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

// One exchange that shows real trust: Gigler flags the cost, waits for the
// okay, then confirms. iMessage-styled bubbles, staggered in on scroll.

const MESSAGES = [
  { from: "gigler" as const, text: "Heads up, rebooking the flight is $120. Want me to go ahead?" },
  { from: "user" as const, text: "Go for it 👍" },
  { from: "gigler" as const, text: "Done. New confirmation’s in your email." },
];

const STAGGER_MS = 160;

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

  return (
    <div
      ref={rootRef}
      className={cn("mx-auto flex max-w-lg flex-col gap-3", className)}
    >
      {MESSAGES.map((m, i) => (
        <p
          key={i}
          className={cn(
            "w-fit max-w-[85%] rounded-[22px] px-5 py-3 text-base leading-snug",
            m.from === "user"
              ? "self-end rounded-br-[6px] bg-[#0a7cff] text-white"
              : "self-start rounded-bl-[6px] bg-[#e9e9eb] text-black",
            !reducedMotion &&
              cn(
                "transition-all duration-500 ease-out",
                revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
              )
          )}
          style={reducedMotion ? undefined : { transitionDelay: `${i * STAGGER_MS}ms` }}
        >
          {m.text}
        </p>
      ))}
    </div>
  );
}
