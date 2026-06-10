import Image from "next/image";
import { SectionHeader } from "./SectionHeader";
import { Iphone17Pro } from "@/components/ui/iphone-17-pro";
import { IosStatusBar } from "@/components/ui/ios-status-bar";
import {
  SpeakerWave2Fill,
  VideoFill,
  MicSlashFill,
  EllipsisFill,
  PhoneDownFill,
  KeypadDotsFill,
} from "@/components/ui/sf-icons";
import { cn } from "@/lib/utils";

// iOS 26 in-call control grid: Speaker / FaceTime / Mute on top,
// More / End (red, center) / Keypad below.
const CALL_CONTROLS = [
  { icon: SpeakerWave2Fill, label: "Speaker", end: false },
  { icon: VideoFill, label: "FaceTime", end: false },
  { icon: MicSlashFill, label: "Mute", end: false },
  { icon: EllipsisFill, label: "More", end: false },
  { icon: PhoneDownFill, label: "End", end: true },
  { icon: KeypadDotsFill, label: "Keypad", end: false },
];

// Overlapping logo cluster for the "plugged into your tools" tile.
// Order matters: later entries stack on top, so Slack sits last.
const TOOLS = [
  { src: "/logos/gmail.svg", alt: "Gmail" },
  { src: "/logos/google-calendar.svg", alt: "Google Calendar" },
  { src: "/logos/notion.svg", alt: "Notion" },
  { src: "/logos/slack.svg", alt: "Slack" },
];

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
          "w-fit max-w-[78%] leading-snug",
          size === "sm" ? "rounded-[18px] px-3 py-2 text-xs" : "rounded-[20px] px-4 py-2.5 text-sm",
          isUser
            ? "bg-[#0a7cff] text-white"
            : "bg-[#e9e9eb] text-black"
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
          subtitle="Gigler doesn't just suggest. One okay from you, and it books, sends, and follows through."
        />

        {/* Bento grid: one large action-arc tile + two stacked tiles */}
        <div className="mt-14 grid gap-5 md:grid-cols-6 md:grid-rows-2">
          {/* Large tile: found it → asks → books it */}
          <article className="glass flex flex-col rounded-[2rem] p-7 md:col-span-4 md:row-span-2 md:p-9">
            <div className="flex flex-1 flex-col justify-center gap-2 rounded-3xl bg-white/55 p-5 md:p-7">
              <MiniBubble from="user" stamp="12:31 PM" size="md">
                Find me a flight to NYC under $300 next Friday
              </MiniBubble>
              <MiniBubble from="gigler" stamp="12:33 PM" size="md">
                Delta nonstop, LAX to JFK, $284. Leaves 9:30 AM, lands 6:05 PM.
                Book it?
              </MiniBubble>
              <MiniBubble from="user" size="md">
                Yes! And a hotel near SoHo for Friday and Saturday
              </MiniBubble>
              <MiniBubble from="gigler" size="md">
                Flight&apos;s booked. The Dominick in SoHo is $219 a night,
                rated 4.7 stars. Grab both nights?
              </MiniBubble>
              <MiniBubble from="user" size="md">
                Perfect, book it
              </MiniBubble>
              <MiniBubble from="gigler" size="md">
                Done. I&apos;ll send your boarding pass Thursday and call the
                hotel to confirm a week out. Uber to LAX at 6:30 AM Friday?
              </MiniBubble>
              <MiniBubble from="user" size="md">
                Yes, and let Maya know when I land
              </MiniBubble>
              <MiniBubble from="gigler" size="md">
                Done. Uber&apos;s set, Maya gets your landing time, and the
                whole trip is on your calendar. Have a great trip.
              </MiniBubble>
            </div>
            <h3 className="mt-6 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              Doesn&apos;t just find it. Books it.
            </h3>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-foreground/65 md:text-base">
              A chatbot hands you links and wishes you luck. Gigler asks once,
              then handles the booking, the confirmation, and the follow-up,
              while your phone sits in your pocket.
            </p>
          </article>

          {/* Tile: proactive with the move already planned */}
          <article className="glass flex flex-col rounded-3xl p-6 md:col-span-2">
            <div className="flex flex-1 flex-col justify-center rounded-2xl bg-white/55 p-4">
              <div className="flex flex-col gap-1.5">
                <MiniBubble from="gigler" stamp="Monday 9:15 AM">
                  Mom&apos;s birthday is Thursday. Want me to send the peonies
                  she liked? $45, arrives Wednesday.
                </MiniBubble>
                <MiniBubble from="user">yes please</MiniBubble>
                <MiniBubble from="gigler">
                  Ordered. I&apos;ll text you when they&apos;re delivered.
                </MiniBubble>
              </div>
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
              Gigler thinks ahead
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/65">
              Gigler knows the dates that matter and shows up with the plan already
              made, approved with one text.
            </p>
          </article>

          {/* Tile: connects to your tools */}
          <article className="glass @container flex flex-col rounded-3xl p-6 md:col-span-2">
            <div className="flex flex-1 flex-col justify-center rounded-2xl bg-white/55 p-4">
              <div className="flex flex-col gap-1.5">
                <MiniBubble from="user">What&apos;s new in Slack?</MiniBubble>
                <MiniBubble from="gigler">One sec, checking Slack.</MiniBubble>
                <MiniBubble from="gigler">
                  Standup moved to 10am, and Sam needs your sign-off on the Q3
                  deck.
                </MiniBubble>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <h3 className="whitespace-nowrap text-lg font-semibold tracking-tight text-foreground">
                Plugged into your tools
              </h3>
              {/* Hidden when the tile is too narrow to fit them beside the
                  heading on one line; the heading never wraps */}
              <div className="hidden shrink-0 -space-x-2 @min-[19rem]:flex">
                {TOOLS.map((tool) => (
                  <span
                    key={tool.alt}
                    className="flex size-8 items-center justify-center rounded-[10px] bg-white ring-1 ring-black/[0.06] shadow-sm"
                    title={tool.alt}
                  >
                    <Image
                      src={tool.src}
                      alt={tool.alt}
                      width={18}
                      height={18}
                      className="size-[18px]"
                    />
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/65">
              Slack, your calendar, your inbox. Ask in plain English and it
              checks the right place, then answers. No tabs, no logins.
            </p>
          </article>

          {/* Tile: call it — iPhone on a live call with Gigler */}
          <article className="glass flex flex-col items-center gap-7 rounded-3xl p-7 md:col-span-3 md:flex-row">
            <div className="shrink-0">
              <Iphone17Pro className="w-[200px]" screenClassName="bg-[#0e120f]">
                {/* Screen content authored at the 300px-frame design scale,
                    scaled by 2/3 (200/300) so status bar / island geometry
                    matches the main demo exactly */}
                <div
                  className="origin-top-left"
                  style={{
                    width: "150%",
                    height: "150%",
                    transform: "scale(0.66667)",
                  }}
                >
                  <div className="font-ios relative flex h-full flex-col bg-gradient-to-b from-[#2c3833] via-[#1b231e] to-[#0e120f] text-white">
                    <IosStatusBar className="text-white" />

                    {/* Caller — top-left cluster, iOS 26: small avatar beside
                        timer-over-name */}
                    <div className="flex items-center gap-3 px-6 pt-[64px]">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#6cc197] to-[#2f8f63] text-lg font-semibold">
                        G
                      </span>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-white/60">
                          00:42
                        </span>
                        <span className="text-[26px] font-bold leading-tight tracking-tight">
                          Gigler
                        </span>
                      </div>
                    </div>

                    {/* Empty wallpaper middle, then the iOS 26 control grid:
                        two rows of three labeled glass circles, End red in
                        the bottom-center */}
                    <div className="mt-auto px-6 pb-12">
                      <div className="grid grid-cols-3 gap-x-5 gap-y-5">
                        {CALL_CONTROLS.map((c) => (
                          <div
                            key={c.label}
                            className="flex flex-col items-center gap-1.5"
                          >
                            <span
                              className={cn(
                                "flex size-[60px] items-center justify-center rounded-full text-white",
                                c.end
                                  ? "bg-[#ff3b30] shadow-lg"
                                  : "border border-white/10 bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-md"
                              )}
                            >
                              <c.icon className="size-6" />
                            </span>
                            <span className="text-[12px] text-white/80">
                              {c.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Home indicator */}
                    <div className="absolute bottom-2 left-1/2 h-[5px] w-32 -translate-x-1/2 rounded-full bg-white/80" />
                  </div>
                </div>
              </Iphone17Pro>
            </div>

            <div className="text-center md:text-left">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Or just call and talk
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-foreground/65">
                Prefer your voice? Call Gigler like you&apos;d call a person. It
                listens, takes care of it, and texts you the details after you
                hang up.
              </p>
            </div>
          </article>

          {/* Tile: it sends emails too */}
          <article className="glass flex flex-col rounded-3xl p-6 md:col-span-3">
            <div className="flex flex-1 flex-col justify-center rounded-2xl bg-white/55 p-4">
              {/* A real sent email, not a text thread */}
              <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-sm">
                <p className="text-[15px] font-semibold tracking-tight text-black">
                  Kitchen leak repair request
                </p>
                <div className="mt-3 flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#6cc197] to-[#2f8f63] text-xs font-semibold text-white">
                    G
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-black">Gigler</p>
                    <p className="truncate text-[11px] text-black/45">
                      to Westside Property
                    </p>
                  </div>
                  <span className="rounded-full bg-spring-mint/70 px-2.5 py-0.5 text-[10px] font-medium text-[#2f8f63]">
                    Sent
                  </span>
                </div>
                <div className="mt-3 h-px bg-black/[0.06]" />
                <div className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-black/70">
                  <p>Hi,</p>
                  <p>
                    The kitchen sink has been leaking since Monday. Could you
                    send a plumber out this week?
                  </p>
                  <p>
                    Thanks,
                    <br />
                    Alex
                  </p>
                </div>
              </div>
            </div>
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
              Gigler sends emails too
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground/65">
              Ask in a text and it writes the email, sends it, and follows up
              when they reply.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
