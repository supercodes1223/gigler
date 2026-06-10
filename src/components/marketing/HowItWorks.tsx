import { ChevronLeft, MessageSquare, Phone, Mail } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { Iphone17Pro } from "@/components/ui/iphone-17-pro";
import { IosStatusBar } from "@/components/ui/ios-status-bar";

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
            <Iphone17Pro className="w-full">
              <div className="font-ios relative h-full bg-[#f2f2f7]">
                <IosStatusBar className="text-black" />

                {/* Floating nav — iOS 26 liquid glass capsules */}
                <div className="absolute inset-x-0 top-[6.3%] z-20 flex items-center justify-between px-2.5">
                  <span className="glass flex h-8 items-center rounded-full pl-1.5 pr-3 text-[13px] font-medium text-[#2f8f63]">
                    <ChevronLeft className="size-[18px]" aria-hidden />
                    Lists
                  </span>
                  <span className="glass flex h-8 items-center rounded-full px-3.5 text-[13px] font-medium text-[#2f8f63]">
                    Edit
                  </span>
                </div>

                {/* Contact detail */}
                <div className="absolute inset-0 overflow-hidden px-4 pb-4 pt-[88px]">
                  {/* Header */}
                  <div className="flex flex-col items-center text-center">
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
                        className="flex flex-col items-center gap-1 rounded-2xl bg-white py-2.5 shadow-[0_1px_2px_rgba(20,30,40,0.06)]"
                      >
                        <c.icon className="size-[22px] text-[#2f8f63]" aria-hidden />
                        <span className="text-[11px] font-medium text-[#2f8f63]">
                          {c.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Info rows */}
                  <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(20,30,40,0.06)]">
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
                  <div className="mt-4 rounded-2xl bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(20,30,40,0.06)]">
                    <p className="text-[11px] text-black/45">notes</p>
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
