import { SectionHeader } from "./SectionHeader";
import { cn } from "@/lib/utils";

function MiniBubble({
  from,
  children,
  stamp,
  size = "sm",
}: {
  from: "user" | "gigler";
  children: React.ReactNode;
  stamp?: string;
  size?: "sm" | "md";
}) {
  const isUser = from === "user";
  return (
    <div className={cn("flex flex-col gap-1", isUser && "items-end")}>
      {stamp && (
        <span className="text-[10px] font-medium text-black/35">{stamp}</span>
      )}
      <p
        className={cn(
          "w-fit max-w-[92%] leading-snug",
          size === "sm" ? "rounded-2xl px-3 py-2 text-xs" : "rounded-3xl px-4 py-2.5 text-sm",
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

export function UseCases() {
  return (
    <section id="use-cases" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="What it does"
          title="Things a chatbot can't do."
          subtitle="Gigler doesn't stop at suggestions. It asks once — then books, sends, and follows through."
        />

        {/* Bento grid: one large action-arc tile + two stacked tiles */}
        <div className="mt-14 grid gap-5 md:grid-cols-6 md:grid-rows-2">
          {/* Large tile: found it → asks → books it */}
          <article className="glass flex flex-col rounded-[2rem] p-7 md:col-span-4 md:row-span-2 md:p-9">
            <div className="flex flex-1 flex-col justify-center gap-2.5 rounded-3xl bg-white/55 p-5 md:p-7">
              <MiniBubble from="user" stamp="12:31 PM" size="md">
                Find me a flight to NYC under $300 next Friday
              </MiniBubble>
              <MiniBubble from="gigler" stamp="3:02 PM" size="md">
                Found you this one — Delta nonstop, $284, lands 9:40 AM.
                Should I book it for you now?
              </MiniBubble>
              <MiniBubble from="user" size="md">
                Yes!
              </MiniBubble>
              <MiniBubble from="gigler" size="md">
                Booked ✓ Confirmation and boarding pass are in your email.
                I&apos;ll check you in Thursday.
              </MiniBubble>
            </div>
            <h3 className="mt-6 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              It doesn&apos;t just find it. It books it.
            </h3>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-foreground/65 md:text-base">
              A chatbot hands you links and wishes you luck. Gigler asks once,
              then handles the booking, the confirmation, and the follow-up —
              while your phone sits in your pocket.
            </p>
          </article>

          {/* Tile: proactive with the move already planned */}
          <article className="glass flex flex-col rounded-3xl p-6 md:col-span-2">
            <div className="rounded-2xl bg-white/55 p-4">
              <div className="flex flex-col gap-2">
                <MiniBubble from="gigler" stamp="Monday 9:15 AM">
                  Mom&apos;s birthday is Thursday. Want me to send the peonies
                  she liked? $45, arrives Wednesday.
                </MiniBubble>
                <MiniBubble from="user">yes 🙏</MiniBubble>
                <MiniBubble from="gigler">
                  Ordered ✓ I&apos;ll text you when they&apos;re delivered.
                </MiniBubble>
              </div>
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
              It thinks ahead
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/65">
              It knows the dates that matter and shows up with the plan already
              made — approved with one text.
            </p>
          </article>

          {/* Tile: email channel */}
          <article className="glass flex flex-col rounded-3xl p-6 md:col-span-2">
            <div className="rounded-2xl bg-white/55 p-4">
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
                  Handled — replied with your details and put the deadline on
                  your calendar.
                </MiniBubble>
              </div>
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
              Forward it an email
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/65">
              The confusing insurance letter, the endless thread — forward it
              and say &ldquo;deal with this.&rdquo; Gigler replies, schedules,
              and follows up.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
