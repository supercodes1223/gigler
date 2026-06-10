"use client";

import { useEffect, useRef, useState } from "react";
import { Apple, ChevronLeft, Video } from "lucide-react";
import { Iphone17Pro } from "@/components/ui/iphone-17-pro";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

// iOS status bar: time on the left of the Dynamic Island, radios on the right.
function StatusBar() {
  return (
    <div className="flex h-[30px] shrink-0 items-center justify-between px-6 pt-1">
      <span className="text-[11px] font-semibold tracking-tight text-black">
        2:14
      </span>
      <div className="flex items-center gap-1">
        {/* Cellular bars */}
        <svg viewBox="0 0 16 11" className="h-[10px] w-auto" aria-hidden>
          <rect x="0" y="7" width="2.6" height="4" rx="0.8" fill="black" />
          <rect x="4.4" y="5" width="2.6" height="6" rx="0.8" fill="black" />
          <rect x="8.8" y="2.5" width="2.6" height="8.5" rx="0.8" fill="black" />
          <rect x="13.2" y="0" width="2.6" height="11" rx="0.8" fill="black" />
        </svg>
        {/* Wi-Fi */}
        <svg viewBox="0 0 16 11" className="h-[10px] w-auto" aria-hidden>
          <path
            d="M8 9.4 L5.6 7a3.4 3.4 0 0 1 4.8 0Z"
            fill="black"
          />
          <path
            d="M3.7 5.1a6.1 6.1 0 0 1 8.6 0l-1.5 1.5a4 4 0 0 0-5.6 0Z"
            fill="black"
          />
          <path
            d="M1.3 2.7a9.5 9.5 0 0 1 13.4 0l-1.5 1.5a7.4 7.4 0 0 0-10.4 0Z"
            fill="black"
          />
        </svg>
        {/* Battery */}
        <svg viewBox="0 0 25 12" className="h-[11px] w-auto" aria-hidden>
          <rect
            x="0.5"
            y="0.5"
            width="21"
            height="11"
            rx="3.2"
            stroke="black"
            strokeOpacity="0.35"
            fill="none"
          />
          <rect x="2" y="2" width="15.5" height="8" rx="1.8" fill="black" />
          <path
            d="M23 4 a2.2 2.2 0 0 1 0 4 Z"
            fill="black"
            fillOpacity="0.35"
          />
        </svg>
      </div>
    </div>
  );
}

type Step =
  | { type: "stamp"; text: string; hold: number }
  | { type: "user" | "gigler"; text: string; hold: number }
  | { type: "typing"; hold: number }
  | { type: "map"; place: string; city: string; hold: number };

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
    text: "On it. You loved Italian last month, checking a couple of spots near you.",
    hold: 1700,
  },
  { type: "typing", hold: 1500 },
  {
    type: "gigler",
    text: "Via Carota has Friday, 7:15 for 4. Want it?",
    hold: 1400,
  },
  { type: "user", text: "Yes, book it", hold: 1200 },
  { type: "typing", hold: 1500 },
  {
    type: "gigler",
    text: "Done. Table for 4, Friday 7:15 PM. Confirmation's in your email, and here's the spot:",
    hold: 1400,
  },
  { type: "map", place: "Via Carota", city: "New York, NY", hold: 5200 },
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
      <Iphone17Pro className="w-full drop-shadow-[0_28px_55px_rgba(20,30,40,0.35)]">
        <div className="flex h-full flex-col bg-white">
          {/* iOS status bar (Dynamic Island renders above this, in the frame) */}
          <StatusBar />

          {/* iMessage header */}
          <div className="z-10 flex items-end justify-between border-b border-black/5 bg-white/90 px-4 pb-2 pt-1 backdrop-blur-md">
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
                    className="bubble-in flex w-fit items-center gap-1 rounded-[18px] bg-[#e9e9eb] px-3.5 py-2.5"
                  >
                    <span className="typing-dot size-1.5 rounded-full bg-black/40" />
                    <span className="typing-dot size-1.5 rounded-full bg-black/40" />
                    <span className="typing-dot size-1.5 rounded-full bg-black/40" />
                  </div>
                );
              }
              if (step.type === "map") {
                return (
                  <div key={i} className="bubble-in flex flex-col items-start">
                    <div className="w-[210px] overflow-hidden rounded-[18px] bg-[#e9e9eb]">
                      {/* Faux Apple Maps tile */}
                      <div className="relative h-28 overflow-hidden bg-[#eaf3ea]">
                        {/* parkland */}
                        <div className="absolute -left-2 top-3 h-16 w-24 rotate-[12deg] rounded-lg bg-[#cfe7cf]" />
                        <div className="absolute bottom-2 right-1 h-12 w-16 -rotate-6 rounded-lg bg-[#cfe7cf]" />
                        {/* roads */}
                        <div className="absolute -left-4 top-10 h-2 w-[140%] -rotate-[18deg] bg-white" />
                        <div className="absolute left-1/2 -top-4 h-[150%] w-2 rotate-[24deg] bg-white" />
                        <div className="absolute -left-4 bottom-3 h-1.5 w-[140%] -rotate-[8deg] bg-white/80" />
                        {/* location pin */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
                          <div className="size-4 rounded-full border-2 border-white bg-[#ff3b30] shadow-md" />
                        </div>
                      </div>
                      {/* footer */}
                      <div className="bg-white px-3 py-2">
                        <p className="text-[13px] font-semibold leading-tight text-black">
                          {step.place}
                        </p>
                        <p className="text-[11px] text-black/45">{step.city}</p>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-black/45">
                          <Apple className="size-3 fill-current" aria-hidden />
                          <span>Maps</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              const isUser = step.type === "user";
              return (
                <div key={i} className={cn("bubble-in flex flex-col", isUser && "items-end")}>
                  <p
                    className={cn(
                      "w-fit max-w-[78%] rounded-[18px] px-3.5 py-2 text-[13px] leading-snug",
                      isUser
                        ? "bg-[#0a7cff] text-white"
                        : "bg-[#e9e9eb] text-black"
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
      </Iphone17Pro>

      {/* Floating glass annotations (desktop only) */}
      <div className="glass absolute -right-36 top-24 hidden w-44 rounded-2xl p-3 lg:block">
        <p className="text-xs font-medium text-foreground">Reservation made</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          Real bookings, real confirmations. Not just advice.
        </p>
      </div>
      <div className="glass absolute -left-36 bottom-32 hidden w-44 rounded-2xl p-3 lg:block">
        <p className="text-xs font-medium text-foreground">It remembers</p>
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
          &ldquo;You loved Italian last month.&rdquo; No re-explaining.
        </p>
      </div>
    </div>
  );
}
