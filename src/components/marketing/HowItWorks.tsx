import { ChevronLeft, MessageSquare, Phone, Mail } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

// The three ways to reach Gigler — the action row of a saved iOS contact.
const CHANNELS = [
  { icon: MessageSquare, label: "text" },
  { icon: Phone, label: "call" },
  { icon: Mail, label: "email" },
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
            <div className="rounded-[3.2rem] border border-white/70 bg-white/55 p-2 shadow-[0_24px_80px_-32px_rgba(20,30,40,0.35)] backdrop-blur-xl">
              <div className="relative flex h-[600px] flex-col overflow-hidden rounded-[2.7rem] border border-black/5 bg-[#f2f2f7]">
                {/* Dynamic island */}
                <div className="absolute left-1/2 top-2.5 z-20 h-7 w-28 -translate-x-1/2 rounded-full bg-black" />

                {/* Nav bar */}
                <div className="z-10 flex items-center justify-between bg-[#f2f2f7]/90 px-3 pb-2 pt-12 backdrop-blur-md">
                  <span className="flex items-center text-[15px] text-[#2f8f63]">
                    <ChevronLeft className="size-5" aria-hidden />
                    Lists
                  </span>
                  <span className="text-[15px] text-[#2f8f63]">Edit</span>
                </div>

                {/* Contact detail */}
                <div className="flex-1 overflow-hidden px-4 pb-4">
                  {/* Header */}
                  <div className="flex flex-col items-center pt-2 text-center">
                    <div className="flex size-[84px] items-center justify-center rounded-full bg-gradient-to-b from-[#6cc197] to-[#2f8f63] text-4xl font-semibold text-white shadow-sm">
                      G
                    </div>
                    <h3 className="mt-3 text-[22px] font-semibold tracking-tight text-black">
                      Gigler
                    </h3>
                    <p className="text-[13px] text-black/45">Personal assistant</p>
                  </div>

                  {/* Action row */}
                  <div className="mt-5 grid grid-cols-3 gap-2.5">
                    {CHANNELS.map((c) => (
                      <div
                        key={c.label}
                        className="flex flex-col items-center gap-1 rounded-xl bg-white py-2.5 shadow-sm"
                      >
                        <c.icon className="size-[22px] text-[#2f8f63]" aria-hidden />
                        <span className="text-[11px] font-medium text-[#2f8f63]">
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Info rows */}
                  <div className="mt-4 overflow-hidden rounded-xl bg-white">
                    <div className="px-4 py-2.5">
                      <p className="text-[11px] text-black/45">mobile</p>
                      <p className="text-[15px] text-[#2f8f63]">
                        +1 (415) 555-0142
                      </p>
                    </div>
                    <div className="ml-4 h-px bg-black/[0.06]" />
                    <div className="px-4 py-2.5">
                      <p className="text-[11px] text-black/45">email</p>
                      <p className="text-[15px] text-[#2f8f63]">hey@gigler.com</p>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mt-4 rounded-xl bg-white px-4 py-2.5">
                    <p className="text-[11px] text-black/45">notes</p>
                    <p className="mt-0.5 text-[14px] leading-snug text-black/80">
                      Just text it like a person. No app, no commands, nothing to
                      learn.
                    </p>
                  </div>
                </div>
              </div>
            </div>
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
