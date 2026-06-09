import { UserPlus, MessageCircle, CheckCheck } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const STEPS = [
  {
    icon: UserPlus,
    title: "Save the contact",
    body: "Gigler is a phone number. Save it like you'd save a friend.",
  },
  {
    icon: MessageCircle,
    title: "Text it like a person",
    body: "Plain English. No commands, no prompts, nothing to learn.",
  },
  {
    icon: CheckCheck,
    title: "It gets it done",
    body: "Real work, real results — and it checks with you before anything big.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-5xl">
        <SectionHeader
          eyebrow="How it works"
          title="No app. No setup. No learning curve."
        />
        <ol className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="glass relative rounded-3xl p-6">
              <span className="absolute right-5 top-5 text-4xl font-semibold tracking-tight text-foreground/8">
                {i + 1}
              </span>
              <span className="flex size-10 items-center justify-center rounded-xl bg-spring-mint/70">
                <step.icon className="size-5 text-foreground/80" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/65">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
