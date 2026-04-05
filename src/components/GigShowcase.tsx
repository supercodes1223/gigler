"use client";

import { useState } from "react";

interface GigCard {
  title: string;
  examples: string[];
}

interface GigCategory {
  id: string;
  label: string;
  icon: string;
  gradient: string;
  cards: GigCard[];
}

const GIG_CATEGORIES: GigCategory[] = [
  {
    id: "coding",
    label: "Coding",
    icon: "💻",
    gradient: "from-indigo-900/40 to-violet-900/40",
    cards: [
      { title: "Build & Deploy", examples: ["Scaffold a full-stack app", "Build a landing page", "Set up database + API + hosting"] },
      { title: "Debug & Fix", examples: ["Paste an error, get a fix", "Code review over text", "Performance optimization"] },
      { title: "Ship It", examples: ["Create a GitHub repo with CI/CD", "Deploy to production", "Set up monitoring"] },
    ],
  },
  {
    id: "business",
    label: "Business",
    icon: "🏢",
    gradient: "from-emerald-900/40 to-teal-900/40",
    cards: [
      { title: "Form Your LLC", examples: ["Name search + articles of org", "Get your EIN", "Register for state tax IDs"] },
      { title: "Set Up Operations", examples: ["Business bank account", "Business email + domain", "Draft operating agreement"] },
      { title: "Legal & Compliance", examples: ["Contract drafting", "Trademark guidance", "Annual filings reminders"] },
    ],
  },
  {
    id: "planning",
    label: "Planning",
    icon: "🎉",
    gradient: "from-amber-900/40 to-orange-900/40",
    cards: [
      { title: "Events", examples: ["Graduation parties", "Weddings with group threads", "Birthday coordination"] },
      { title: "Travel", examples: ["Road trip itineraries", "Hotel + flight bookings", "Group travel logistics"] },
      { title: "Big Projects", examples: ["Moving to a new city", "Home renovation", "Family reunion planning"] },
    ],
  },
  {
    id: "creative",
    label: "Creative",
    icon: "🎨",
    gradient: "from-pink-900/40 to-rose-900/40",
    cards: [
      { title: "AI Images", examples: ["Generate invite graphics", "AI-powered photo editing", "Brand asset creation"] },
      { title: "Documents", examples: ["PDF flyers + invitations", "Photo collages", "Portfolio pages"] },
      { title: "Media", examples: ["Video slideshows", "Voice notes + audio", "Social media content"] },
    ],
  },
  {
    id: "professional",
    label: "Professional",
    icon: "📋",
    gradient: "from-slate-800/40 to-zinc-800/40",
    cards: [
      { title: "Legal & Docs", examples: ["Document review + drafting", "Contract negotiation", "NDA templates"] },
      { title: "Career", examples: ["Resume + cover letter", "Interview prep", "Salary negotiation advice"] },
      { title: "Strategy", examples: ["Business consulting", "Market research", "Competitive analysis"] },
    ],
  },
  {
    id: "scheduling",
    label: "Scheduling",
    icon: "⏰",
    gradient: "from-cyan-900/40 to-sky-900/40",
    cards: [
      { title: "Daily Rituals", examples: ["Morning wake-up calls", "Daily to-do nudges", "Habit tracking"] },
      { title: "Calendar", examples: ["Schedule appointments", "Meeting prep briefings", "Deadline reminders"] },
      { title: "Productivity", examples: ["Focus time blocks", "Weekly reviews", "Goal tracking"] },
    ],
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    icon: "🏠",
    gradient: "from-lime-900/40 to-green-900/40",
    cards: [
      { title: "Home", examples: ["Meal planning + grocery lists", "Home maintenance reminders", "Moving checklists"] },
      { title: "Personal", examples: ["Gift shopping recs", "Pet care reminders", "Workout plans"] },
      { title: "Wellness", examples: ["Meditation reminders", "Health tracking", "Self-care routines"] },
    ],
  },
  {
    id: "education",
    label: "Education",
    icon: "📚",
    gradient: "from-blue-900/40 to-indigo-900/40",
    cards: [
      { title: "Study", examples: ["Exam prep with reminders", "Topic breakdown plans", "Flashcard sessions"] },
      { title: "Learn", examples: ["Daily language practice", "Research assistant", "Summarize articles"] },
      { title: "Apply", examples: ["College app coordination", "Deadline tracking", "Essay feedback"] },
    ],
  },
  {
    id: "reservations",
    label: "Reservations",
    icon: "🍽️",
    gradient: "from-purple-900/40 to-fuchsia-900/40",
    cards: [
      { title: "Dining", examples: ["OpenTable reservations", "Resy bookings", "Group dinner coordination"] },
      { title: "Events", examples: ["Evite creation + invites", "RSVP tracking", "Event page hosting"] },
      { title: "Travel", examples: ["Hotel bookings", "Flight searches", "Rental cars"] },
    ],
  },
];

export default function GigShowcase() {
  const [activeId, setActiveId] = useState("coding");
  const active = GIG_CATEGORIES.find((c) => c.id === activeId)!;

  return (
    <section id="categories" className="py-24 bg-background">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Everything starts with a text.
        </h2>
        <p className="text-center text-brand-muted mb-12 max-w-2xl mx-auto">
          9 categories. Dozens of gig types. Pick one and see what Gigler can
          do&mdash;all over text.
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {GIG_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveId(cat.id)}
              className={`tab-pill ${cat.id === activeId ? "active" : ""}`}
            >
              <span className="mr-1.5">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {active.cards.map((card, i) => (
            <div
              key={`${active.id}-${i}`}
              className={`gig-card bg-gradient-to-br ${active.gradient}`}
            >
              <div className="text-4xl mb-4">{active.icon}</div>
              <h3 className="text-xl font-bold mb-4">{card.title}</h3>
              <ul className="space-y-2.5">
                {card.examples.map((ex, j) => (
                  <li
                    key={j}
                    className="text-sm text-brand-muted flex items-start gap-2.5"
                  >
                    <span className="text-brand-primary mt-0.5 shrink-0">
                      &rarr;
                    </span>
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
