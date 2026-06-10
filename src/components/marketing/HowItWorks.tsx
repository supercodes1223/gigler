import { ChevronLeft, ChevronRight } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { Iphone17Pro } from "@/components/ui/iphone-17-pro";
import { IosStatusBar } from "@/components/ui/ios-status-bar";
import {
  MessageFill,
  PhoneFill,
  EnvelopeFill,
  StarFill,
} from "@/components/ui/sf-icons";

// The three ways to reach Gigler — the action row of a saved iOS contact.
const CHANNELS = [
  { icon: MessageFill, label: "text" },
  { icon: PhoneFill, label: "call" },
  { icon: EnvelopeFill, label: "email" },
];

const STEPS = [
  {
    title: "Save the contact",
    body: "Gigler is just a phone number. Save it like you'd save a friend.",
  },
  {
    title: "Reach it any way you like",
    body: "Text it, call it, or forward it an email. Plain English, no commands, nothing to learn.",
  },
  {
    title: "It gets it done",
    body: "Real work, real results, and it checks with you before anything big.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          eyebrow="How it works"
          title="No setup. No learning curve."
          subtitle="Save one contact, then reach it the way you'd reach an assistant. Text it, call it, or forward it an email. It works on whatever you already use."
        />

        <div className="mt-14 grid items-center gap-12 md:grid-cols-2 md:gap-16">
          {/* A real iPhone Contacts page — same device frame as the hero demo */}
          <div className="relative mx-auto w-[300px] sm:w-[340px]">
            <Iphone17Pro className="w-full">
              {/* iOS 26 contact card: full-screen poster tint (brand mint
                  here), big centered photo, icon-only glass action circles,
                  translucent grouped cells */}
              <div className="font-ios relative h-full bg-gradient-to-b from-[#ddeee4] via-[#d2e6da] to-[#c5dccd]">
                <IosStatusBar className="text-black" />

                {/* Floating nav — glass circle back, Edit pill */}
                <div className="absolute inset-x-0 top-[6.3%] z-20 flex items-center justify-between px-2.5">
                  <span className="glass flex size-8 items-center justify-center rounded-full">
                    <ChevronLeft
                      className="size-[18px] -translate-x-px text-black/70"
                      aria-hidden
                    />
                  </span>
                  <span className="glass flex h-8 items-center rounded-full px-3.5 text-[13px] font-medium text-black/75">
                    Edit
                  </span>
                </div>

                {/* Contact detail */}
                <div className="absolute inset-0 overflow-hidden px-4 pt-[76px]">
                  {/* Big poster photo + name */}
                  <div className="flex flex-col items-center text-center">
                    <div className="flex size-[140px] items-center justify-center rounded-full bg-gradient-to-b from-[#6cc197] to-[#2f8f63] text-6xl font-semibold text-white shadow-[0_10px_30px_-12px_rgba(20,30,40,0.35)]">
                      G
                    </div>
                    <h3 className="mt-3.5 text-[26px] font-bold tracking-tight text-black">
                      Gigler
                    </h3>
                  </div>

                  {/* Action row — icon-only glass circles */}
                  <div className="mt-3.5 flex justify-center gap-3">
                    {CHANNELS.map((c) => (
                      <div
                        key={c.label}
                        className="flex size-12 items-center justify-center rounded-full bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(20,30,40,0.08)] backdrop-blur-md"
                        title={c.label}
                      >
                        <c.icon className="size-5 text-black/70" />
                      </div>
                    ))}
                  </div>

                  {/* Contact Photo & Poster row */}
                  <div className="mt-4 flex items-center gap-2.5 rounded-2xl bg-white/50 py-2.5 pl-3 pr-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(20,30,40,0.08)] backdrop-blur-md">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#6cc197] to-[#2f8f63] text-[10px] font-semibold text-white">
                      G
                    </span>
                    <span className="flex-1 text-[13px] font-medium text-black/80">
                      Contact Photo &amp; Poster
                    </span>
                    <ChevronRight className="size-4 text-black/35" aria-hidden />
                  </div>

                  {/* Info rows — translucent grouped cells */}
                  <div className="mt-4 overflow-hidden rounded-2xl bg-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(20,30,40,0.08)] backdrop-blur-md">
                    <div className="flex items-center justify-between px-4 py-2">
                      <div>
                        <p className="text-[12px] text-black/55">mobile</p>
                        <p className="text-[15px] text-black/85">
                          +1 (415) 555-0142
                        </p>
                      </div>
                      <StarFill className="size-3.5 text-black/25" />
                    </div>
                    <div className="ml-4 h-px bg-black/[0.07]" />
                    <div className="px-4 py-2">
                      <p className="text-[12px] text-black/55">email</p>
                      <p className="text-[15px] text-black/85">hey@gigler.com</p>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mt-4 rounded-2xl bg-white/50 px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_1px_2px_rgba(20,30,40,0.08)] backdrop-blur-md">
                    <p className="text-[12px] text-black/55">notes</p>
                    <p className="mt-0.5 text-[14px] leading-snug text-black/80">
                      Just text it like a person. No app, no commands, nothing to
                      learn.
                    </p>
                  </div>
                </div>

                {/* Home indicator */}
                <div className="absolute bottom-1.5 left-1/2 z-30 h-1 w-28 -translate-x-1/2 rounded-full bg-black/80" />
              </div>
            </Iphone17Pro>
          </div>

          {/* Steps — a quiet numbered list, not three competing cards */}
          <ol className="space-y-7">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-foreground/10 text-xs font-semibold text-foreground/50">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/65">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
