"use client";

import { useCallback, useState } from "react";
import { IphoneDemo } from "@/components/marketing/IphoneDemo";
import { SCENARIOS } from "@/components/marketing/demo-scenarios";
import { cn } from "@/lib/utils";

// Rotating scenario showcase: headline + dots on the left, phone on the
// right. One state machine (the active index) drives the headline, the dots,
// the phone script, and the annotations, so they can never drift apart.
export function DemoShowcase() {
  const [active, setActive] = useState(0);

  // Stable identity so IphoneDemo's step-timer effect doesn't restart on
  // every parent render.
  const advance = useCallback(
    () => setActive((i) => (i + 1) % SCENARIOS.length),
    []
  );

  const scenario = SCENARIOS[active];

  return (
    <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
        <h2 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl">
          Gigler can
          {/* All phrases stacked in one grid cell: the cell sizes to the
              widest phrase, so swaps never shift layout. Decorative rotation
              — inactive phrases are aria-hidden, nothing is announced. */}
          <span className="mt-1 grid">
            {SCENARIOS.map((s, i) => (
              <span
                key={s.id}
                aria-hidden={i !== active}
                className={cn(
                  "col-start-1 row-start-1 transition-all duration-500 ease-out motion-reduce:transition-none",
                  i === active
                    ? "translate-y-0 opacity-100"
                    : i < active
                      ? "-translate-y-3 opacity-0"
                      : "translate-y-3 opacity-0"
                )}
              >
                {s.phrase}
              </span>
            ))}
          </span>
        </h2>

        {/* iOS page-indicator dots: lowkey, active one elongated */}
        <div className="mt-8 flex items-center gap-2">
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show the ${s.label} demo`}
              aria-current={i === active}
              onClick={() => setActive(i)}
              className={cn(
                "h-[7px] rounded-full transition-all duration-300 motion-reduce:transition-none",
                i === active
                  ? "w-5 bg-foreground/70"
                  : "w-[7px] bg-foreground/20 hover:bg-foreground/40"
              )}
            />
          ))}
        </div>
      </div>

      {/* Re-key per scenario: the conversation cursor and intersection
          observer reset cleanly on every rotation or dot click. */}
      <IphoneDemo key={scenario.id} scenario={scenario} onComplete={advance} />
    </div>
  );
}
