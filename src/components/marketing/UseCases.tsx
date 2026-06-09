import { SectionHeader } from "./SectionHeader";
import { cn } from "@/lib/utils";

function MiniBubble({
  from,
  children,
  stamp,
}: {
  from: "user" | "gigler";
  children: React.ReactNode;
  stamp?: string;
}) {
  const isUser = from === "user";
  return (
    <div className={cn("flex flex-col gap-1", isUser && "items-end")}>
      {stamp && (
        <span className="text-[10px] font-medium text-black/35">{stamp}</span>
      )}
      <p
        className={cn(
          "w-fit max-w-[92%] rounded-2xl px-3 py-2 text-xs leading-snug",
          isUser
            ? "rounded-br-md bg-[#0a7cff] text-white"
            : "rounded-bl-md bg-[#e9e9eb] text-black"
        )}
      >
        {children}
      </p>
    </div>
  );
}

const CASES = [
  {
    title: "It texts you first",
    body: "Gigler reaches out at the right moment — reminders that actually arrive, not a chat window waiting for you to remember.",
    visual: (
      <div className="flex flex-col gap-2">
        <MiniBubble from="user">Remind me to call Mom on Sunday</MiniBubble>
        <MiniBubble from="gigler" stamp="Sunday 4:02 PM">
          Good window to call Mom — you&apos;re free until 5. Want me to ring
          you both?
        </MiniBubble>
      </div>
    ),
  },
  {
    title: "It works while you live",
    body: "Ask at lunch, get the answer mid-afternoon — with the work already done. Gigler keeps going after you put your phone away.",
    visual: (
      <div className="flex flex-col gap-2">
        <MiniBubble from="user" stamp="12:31 PM">
          Find me a flight to NYC under $300 next Friday
        </MiniBubble>
        <MiniBubble from="gigler" stamp="3:02 PM">
          Found one — $284 nonstop, lands 9:40 AM. Held it for you ✈️
        </MiniBubble>
      </div>
    ),
  },
  {
    title: "Forward it an email",
    body: "The confusing insurance letter, the endless thread — forward it and say “deal with this.” Gigler replies, schedules, and follows up.",
    visual: (
      <div className="flex flex-col gap-2">
        <div className="rounded-2xl border border-black/8 bg-white px-3 py-2 shadow-sm">
          <p className="text-[10px] font-medium text-black/40">
            Fwd: Your policy renewal — action required
          </p>
          <p className="mt-0.5 truncate text-xs text-black/70">
            Dear customer, your coverage will change unless…
          </p>
        </div>
        <MiniBubble from="user">deal with this</MiniBubble>
        <MiniBubble from="gigler">
          Handled — replied with your details and put the deadline on your
          calendar.
        </MiniBubble>
      </div>
    ),
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="What it does"
          title="Things a chatbot can't do."
          subtitle="Gigler doesn't just answer — it acts, remembers, and reaches out. In your texts, your calls, and your inbox."
        />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {CASES.map((c) => (
            <article key={c.title} className="glass flex flex-col rounded-3xl p-6">
              <div className="min-h-44 rounded-2xl bg-white/55 p-4">{c.visual}</div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
                {c.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/65">
                {c.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
