import { MessageSquare, Phone, Mail } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

// The three ways to reach Gigler — same actions you'd see on a saved iOS contact.
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
          title="No app. No setup. No learning curve."
          subtitle="Save one contact, then reach it the way you'd reach a real assistant. Text it, call it, or forward it an email. It works on whatever you already use."
        />

        <div className="mt-14 grid items-center gap-10 md:grid-cols-2 md:gap-16">
          {/* Faux iOS contact card — the channels live where you'd actually find them */}
          <div className="glass mx-auto w-full max-w-sm rounded-[2rem] p-8">
            <div className="flex flex-col items-center text-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-b from-[#6cc197] to-[#2f8f63] text-3xl font-semibold text-white shadow-sm">
                G
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                Gigler
              </h3>
              <p className="text-sm text-foreground/55">Personal assistant</p>
            </div>

            <div className="mt-7 flex items-start justify-center gap-4">
              {CHANNELS.map((c) => (
                <div key={c.label} className="flex flex-col items-center gap-2">
                  <span className="flex size-16 items-center justify-center rounded-2xl bg-spring-mint/60">
                    <c.icon className="size-6 text-[#2f8f63]" aria-hidden />
                  </span>
                  <span className="text-xs font-medium text-[#2f8f63]">
                    {c.label}
                  </span>
                </div>
              ))}
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
