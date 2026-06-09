"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Video } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type Step =
  | { type: "stamp"; text: string; hold: number }
  | { type: "user" | "gigler"; text: string; hold: number }
  | { type: "typing"; hold: number };

// One complete task arc: ask → Gigler works → done, with proof.
const SCRIPT: Step[] = [
  { type: "stamp", text: "Tuesday 2:14 PM", hold: 700 },
  {
    type: "user",
    text: "Can you get us a table for 4 somewhere good Friday at 7?",
    hold: 1300,
  },
  { type: "typing", hold: 1500 },
  {
    type: "gigler",
    text: "On it. You loved Italian last month — checking a couple of spots near you.",
    hold: 1700,
  },
  { type: "typing", hold: 1500 },
  {
    type: "gigler",
    text: "Via Carota has Friday, 7:15 for 4. Want it?",
    hold: 1400,
  },
  { type: "user", text: "Yes — book it", hold: 1200 },
  { type: "typing", hold: 1500 },
  {
    type: "gigler",
    text: "Done ✓ Friday at 7:15 PM, party of 4. Confirmation's in your email — I'll remind you that afternoon.",
    hold: 5200,
  },
];

export function IphoneDemo() {
  const frameRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  // Play while in view; pause (and later restart the loop) when scrolled away.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || reducedMotion) return;
    const observer = new IntersectionObserver(
      ([entry]) => setPlaying(entry.isIntersecting),
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    const step = SCRIPT[cursor];
    const timer = setTimeout(() => {
      setCursor((c) => (c + 1 < SCRIPT.length ? c + 1 : 0));
    }, step.hold);
    return () => clearTimeout(timer);
  }, [playing, cursor, reducedMotion]);

  const visible = reducedMotion
    ? SCRIPT.filter((s) => s.type !== "typing")
    : SCRIPT.slice(0, cursor + 1).filter(
        (s, i) => s.type !== "typing" || i === cursor
      );

  const lastUserIndex = visible.reduce(
    (acc, s, i) => (s.type === "user" ? i : acc),
    -1
  );
  const giglerReplied = visible.some(
    (s, i) => s.type === "gigler" && i > lastUserIndex
  );

  return (
    <div ref={frameRef} className="relative mx-auto w-[300px] sm:w-[340px]">
      {/* Device frame */}
      <div className="rounded-[3.2rem] border border-white/70 bg-white/55 p-2 shadow-[0_24px_80px_-32px_rgba(20,30,40,0.35)] backdrop-blur-xl">
        <div className="relative flex h-[600px] flex-col overflow-hidden rounded-[2.7rem] border border-black/5 bg-white">
          {/* Dynamic island */}
          <div className="absolute left-1/2 top-2.5 z-20 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />

          {/* iMessage header */}
          <div className="z-10 flex items-end justify-between border-b border-black/5 bg-white/90 px-4 pb-2 pt-12 backdrop-blur-md">
            <ChevronLeft className="size-5 text-[#0a7cff]" aria-hidden />
            <div className="flex flex-col items-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-spring-leaf to-spring-sky text-sm font-semibold text-white">
                G
              </span>
              <span className="mt-0.5 text-[11px] font-medium text-foreground">
                Gigler
              </span>
            </div>
            <Video className="size-5 text-[#0a7cff]" aria-hidden />
          </div>

          {/* Conversation */}
          <div className="flex flex-1 flex-col justify-end gap-1.5 overflow-hidden px-3 pb-3">
            {visible.map((step, i) => {
              if (step.type === "stamp") {
                return (
                  <p
                    key={i}
                    className="bubble-in py-1 text-center text-[10px] font-medium text-black/35"
                  >
                    {step.text}
                  </p>
                );
              }
              if (step.type === "typing") {
                return (
                  <div
                    key={i}
                    className="bubble-in flex w-fit items-center gap-1 rounded-3xl rounded-bl-md bg-[#e9e9eb] px-3.5 py-2.5"
                  >
                    <span className="typing-dot size-1.5 rounded-full bg-black/40" />
                    <span className="typing-dot size-1.5 rounded-full bg-black/40" />
                    <span className="typing-dot size-1.5 rounded-full bg-black/40" />
                  </div>
                );
              }
              const isUser = step.type === "user";
              return (
                <div key={i} className={cn("bubble-in flex flex-col", isUser && "items-end")}>
                  <p
                    className={cn(
                      "max-w-[78%] rounded-3xl px-3.5 py-2 text-[13px] leading-snug",
                      isUser
                        ? "rounded-br-md bg-[#0a7cff] text-white"
                        : "rounded-bl-md bg-[#e9e9eb] text-black"
                    )}
                  >
                    {step.text}
                  </p>
                  {isUser && i === lastUserIndex && giglerReplied && (
                    <span className="mt-0.5 pr-1 text-[9px] font-medium text-black/35">
                      Delivered
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-2 border-t border-black/5 bg-white px-3 pb-5 pt-2">
            <div className="flex h-8 flex-1 items-center rounded-full border border-black/10 px-3 text-[12px] text-black/30">
              iMessage
            </div>
            <div className="h-1 w-0" />
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-1.5 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-black/80" />
        </div>
      </div>

      {/* Floating glass annotations (desktop only) */}
      <div className="glass absolute -right-36 top-24 hidden w-44 rounded-2xl p-3 lg:block">
        <p className="text-xs font-medium text-foreground">Reservation made ✓</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          Real bookings, real confirmations — not just advice.
        </p>
      </div>
      <div className="glass absolute -left-36 bottom-32 hidden w-44 rounded-2xl p-3 lg:block">
        <p className="text-xs font-medium text-foreground">It remembers</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          &ldquo;You loved Italian last month&rdquo; — no re-explaining.
        </p>
      </div>
    </div>
  );
}
