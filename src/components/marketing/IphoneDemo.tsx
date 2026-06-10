"use client";

import { useEffect, useRef, useState } from "react";
import { Apple, ChevronLeft, ChevronRight, Mic, Plus } from "lucide-react";
import { Iphone17Pro } from "@/components/ui/iphone-17-pro";
import { IosStatusBar } from "@/components/ui/ios-status-bar";
import { VideoFill } from "@/components/ui/sf-icons";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type Step =
  | { type: "user" | "gigler"; text: string; hold: number }
  | { type: "typing"; hold: number }
  | { type: "map"; place: string; city: string; hold: number };

// Rendered with the first message — iMessage never shows a timestamp alone.
const TIMESTAMP = "Tuesday 2:14 PM";

// One complete task arc: ask → Gigler works → done, with proof.
const SCRIPT: Step[] = [
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
    text: "Give me one sec to call them and see what tables they have.",
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
      <Iphone17Pro className="w-full">
        <div className="font-ios relative h-full bg-white">
          {/* iOS status bar (Dynamic Island renders above this, in the frame) */}
          <IosStatusBar className="text-black" />

          {/* Top scrim: content fades out beneath the status/nav area */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[112px] bg-[linear-gradient(to_bottom,#fff_0px,#fff_40px,rgba(255,255,255,0.9)_72px,transparent_112px)]"
          />

          {/* Floating nav — iOS 26 liquid glass capsules over the content.
              Percentage top so it tracks the island (bottom at 5.62% of
              screen height) at every frame width, unlike a px offset. */}
          <div className="absolute inset-x-0 top-[6.8%] z-20 flex items-start justify-between px-2.5">
            <div
              aria-hidden
              className="glass mt-0.5 flex size-8 items-center justify-center rounded-full"
            >
              <ChevronLeft className="size-[18px] -translate-x-px text-[#0a7cff]" />
            </div>
            <div className="flex flex-col items-center">
              {/* Same saturated avatar green as the call/email tiles — the
                  spring pastels read as a white wash at this size */}
              <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-b from-[#6cc197] to-[#2f8f63] text-[13px] font-semibold text-white ring-1 ring-black/5">
                G
              </span>
              <span className="glass-strong mt-[5px] flex items-center rounded-full py-[3px] pl-2.5 pr-1.5 text-[11px] font-semibold text-foreground">
                Gigler
                <ChevronRight
                  className="size-2.5 text-black/35"
                  aria-hidden
                />
              </span>
            </div>
            <div
              aria-hidden
              className="glass mt-0.5 flex size-8 items-center justify-center rounded-full"
            >
              <VideoFill className="size-4 text-[#0a7cff]" />
            </div>
          </div>

          {/* Conversation — runs edge to edge, under the floating chrome */}
          <div className="absolute inset-0 flex flex-col justify-end gap-1.5 overflow-hidden px-3 pb-[58px] pt-[106px]">
            {visible.map((step, i) => {
              if (step.type === "typing") {
                return (
                  <div
                    key={i}
                    className="bubble-in bubble-tail-gigler flex w-fit items-center gap-1 rounded-[18px] bg-[#e9e9eb] px-3.5 py-2.5"
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
                        {/* location pin — tip lands on the road junction */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
                          <svg
                            viewBox="0 0 24 32"
                            className="h-[22px] w-auto drop-shadow-md"
                            aria-hidden
                          >
                            <path
                              fill="#0a7cff"
                              stroke="#fff"
                              strokeWidth="2"
                              d="M12 1C5.9 1 1 5.9 1 12c0 8.25 11 19 11 19s11-10.75 11-19C23 5.9 18.1 1 12 1Z"
                            />
                            <circle cx="12" cy="12" r="4" fill="#fff" />
                          </svg>
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
              // iOS tails only the last bubble of a same-sender run
              const next = visible[i + 1];
              const hasTail = !next || next.type !== step.type;
              return (
                <div key={i} className={cn("bubble-in flex flex-col", isUser && "items-end")}>
                  {i === 0 && (
                    <p className="self-center py-1 text-center text-[10px] font-medium text-black/35">
                      {TIMESTAMP}
                    </p>
                  )}
                  <p
                    className={cn(
                      "w-fit max-w-[78%] rounded-[18px] px-3.5 py-2 text-[13px] leading-snug",
                      isUser
                        ? "bg-[#0a7cff] text-white"
                        : "bg-[#e9e9eb] text-black",
                      hasTail && (isUser ? "bubble-tail-user" : "bubble-tail-gigler")
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

          {/* Floating compose bar — liquid glass */}
          <div className="absolute inset-x-0 bottom-[14px] z-20 flex items-center gap-1.5 px-2.5">
            <div
              aria-hidden
              className="glass flex size-9 shrink-0 items-center justify-center rounded-full"
            >
              <Plus className="size-[18px] text-black/55" />
            </div>
            <div className="glass flex h-9 flex-1 items-center justify-between rounded-full pl-4 pr-2.5">
              <span className="text-[12px] text-black/35">iMessage</span>
              <Mic className="size-4 text-black/35" aria-hidden />
            </div>
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-1.5 left-1/2 z-30 h-1 w-28 -translate-x-1/2 rounded-full bg-black/80" />
        </div>
      </Iphone17Pro>

      {/* Floating glass annotations (desktop only) */}
      {/* Padding >= corner radius so text clears the corner curves */}
      <div className="absolute -right-36 top-24 hidden w-48 rounded-2xl bg-white/55 px-4 py-3.5 shadow-[0_8px_24px_-12px_rgba(20,30,40,0.15)] backdrop-blur-xl lg:block">
        <p className="text-xs font-medium text-foreground">Reservation made</p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Real bookings, real confirmations. Not just advice.
        </p>
      </div>
      <div className="absolute -left-36 bottom-32 hidden w-48 rounded-2xl bg-white/55 px-4 py-3.5 shadow-[0_8px_24px_-12px_rgba(20,30,40,0.15)] backdrop-blur-xl lg:block">
        <p className="text-xs font-medium text-foreground">It remembers</p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          &ldquo;You loved Italian last month.&rdquo; No re-explaining.
        </p>
      </div>
    </div>
  );
}
