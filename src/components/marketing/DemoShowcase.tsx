"use client";

import { useCallback, useState, type ComponentType } from "react";
import {
  Dinner3D,
  Envelope3D,
  Phone3D,
  Plane3D,
} from "@/components/marketing/Demo3DIcons";
import { IphoneDemo } from "@/components/marketing/IphoneDemo";
import { SCENARIOS, type Scenario } from "@/components/marketing/demo-scenarios";
import { cn } from "@/lib/utils";

// Clay-render icon per scenario, floating above the rotating headline.
// Record over Scenario["id"] so a new scenario can't ship without one.
const SCENARIO_ICONS: Record<
  Scenario["id"],
  ComponentType<{ className?: string }>
> = {
  dinner: Dinner3D,
  trip: Plane3D,
  calls: Phone3D,
  email: Envelope3D,
};

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
              widest phrase, so swaps never shift layout. Each scenario's
              clay icon flows inline right after the phrase's last word —
              bound to it with a nowrap span so it can never wrap alone.
              Negative icon margins keep the line box at text height.
              Decorative rotation — inactive phrases are aria-hidden. */}
          <span className="mt-1 grid">
            {SCENARIOS.map((s, i) => {
              const Icon = SCENARIO_ICONS[s.id];
              const words = s.phrase.split(" ");
              const last = words.pop();
              return (
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
                  {words.join(" ")}{" "}
                  <span className="whitespace-nowrap">
                    {last}
                    <Icon className="-my-3 ml-2.5 inline-block size-14 align-middle sm:ml-3 sm:size-16" />
                  </span>
                </span>
              );
            })}
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
