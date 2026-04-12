"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Message {
  from: "user" | "gigler";
  text: string;
  delay: number;
}

interface WorkspaceFile {
  name: string;
  icon: string;
  delay: number;
  status: "pending" | "processing" | "done";
}

interface Scenario {
  conversation: Message[];
  workspaceTitle: string;
  statusSteps: string[];
  files: WorkspaceFile[];
  preview: "bills" | "website";
}

const SCENARIOS: Scenario[] = [
  {
    conversation: [
      { from: "user", text: "Track my utility bills", delay: 1000 },
      {
        from: "gigler",
        text: 'On it! I created a gig:\n"Bobby\'s Utility Bills Tracker" 📊\n\nSend me photos of your bills and I\'ll handle the rest.',
        delay: 3500,
      },
      { from: "user", text: "Here's my power bill for $528.93", delay: 6000 },
      {
        from: "gigler",
        text: "Got it! Extracted:\n✅ Power — $528.93\n\nBuilding your dashboard now...",
        delay: 8000,
      },
    ],
    workspaceTitle: "Bobby's Utility Bills Tracker",
    statusSteps: [
      "Analyzing bill photo...",
      "Extracting vendor & amount...",
      "Building dashboard...",
      "Deliverable ready →  gigler.ai/0ab8pt",
    ],
    files: [
      { name: "bills-dashboard", icon: "📊", delay: 400, status: "done" },
      { name: "bill-photo-001.jpg", icon: "🖼️", delay: 1200, status: "done" },
      { name: "monthly-report.pdf", icon: "📄", delay: 2400, status: "done" },
    ],
    preview: "bills",
  },
  {
    conversation: [
      { from: "user", text: "Build me a landing page for my coffee shop", delay: 1000 },
      {
        from: "gigler",
        text: 'Let\'s do it! I created a gig:\n"Coffee Shop Website" ☕\n\nWhat\'s the shop called?',
        delay: 3500,
      },
      { from: "user", text: "Brew & Co. Modern, minimal, dark theme", delay: 5500 },
      {
        from: "gigler",
        text: "Love it. Building now with hero, menu section, location map, and Instagram feed...",
        delay: 7500,
      },
    ],
    workspaceTitle: "Brew & Co. Website",
    statusSteps: [
      "Generating layout...",
      "Building hero section...",
      "Adding menu & location...",
      "Site live →  gigler.ai/brew-co",
    ],
    files: [
      { name: "index.html", icon: "🌐", delay: 400, status: "done" },
      { name: "menu-section", icon: "☕", delay: 1200, status: "done" },
      { name: "location-map", icon: "📍", delay: 2000, status: "done" },
      { name: "instagram-feed", icon: "📸", delay: 2800, status: "done" },
    ],
    preview: "website",
  },
];

function TypingDots() {
  return (
    <div className="flex justify-start hero-fade-in">
      <div className="bg-[#e8e4de] rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
        <div className="typing-dot w-2 h-2 rounded-full bg-[#9c9590]" />
        <div className="typing-dot w-2 h-2 rounded-full bg-[#9c9590]" />
        <div className="typing-dot w-2 h-2 rounded-full bg-[#9c9590]" />
      </div>
    </div>
  );
}

function BillsPreview({ step }: { step: number }) {
  return (
    <div className="text-[10px] font-mono">
      <div className="flex gap-2 text-[9px] uppercase tracking-wider text-zinc-500 border-b border-zinc-700 pb-1 mb-1.5">
        <span className="flex-1">Bill</span>
        <span className="w-14 text-right">Amount</span>
        <span className="w-14 text-right">Status</span>
      </div>
      <div
        className={`flex gap-2 items-center transition-opacity duration-500 ${step >= 1 ? "opacity-100" : "opacity-0"}`}
      >
        <span className="flex-1 text-zinc-300">Power</span>
        <span className="w-14 text-right text-zinc-300 tabular-nums">$528.93</span>
        <span className="w-14 text-right">
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">
            Submitted
          </span>
        </span>
      </div>
      <div
        className={`flex gap-2 items-center mt-1 transition-opacity duration-500 ${step >= 2 ? "opacity-100" : "opacity-0"}`}
      >
        <span className="flex-1 text-zinc-500">Total</span>
        <span className="w-14 text-right text-zinc-300 font-bold tabular-nums">$528.93</span>
        <span className="w-14"></span>
      </div>
    </div>
  );
}

function WebsitePreview({ step }: { step: number }) {
  return (
    <div className="text-[10px] font-mono space-y-2">
      <div
        className={`h-8 rounded bg-zinc-800 flex items-center justify-center transition-opacity duration-500 ${step >= 1 ? "opacity-100" : "opacity-0"}`}
      >
        <span className="text-zinc-300 font-bold text-xs">Brew & Co.</span>
      </div>
      <div className="flex gap-1.5">
        <div
          className={`h-5 flex-1 rounded bg-zinc-800 flex items-center justify-center transition-opacity duration-500 ${step >= 2 ? "opacity-100" : "opacity-0"}`}
        >
          <span className="text-zinc-500 text-[8px]">Menu</span>
        </div>
        <div
          className={`h-5 flex-1 rounded bg-zinc-800 flex items-center justify-center transition-opacity duration-500 ${step >= 3 ? "opacity-100" : "opacity-0"}`}
        >
          <span className="text-zinc-500 text-[8px]">Location</span>
        </div>
      </div>
      <div
        className={`h-4 rounded bg-zinc-800 flex items-center justify-center transition-opacity duration-500 ${step >= 4 ? "opacity-100" : "opacity-0"}`}
      >
        <span className="text-zinc-500 text-[8px]">Instagram Feed</span>
      </div>
    </div>
  );
}

export default function GiglerHeroDemo() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [phase, setPhase] = useState<"sms" | "workspace">("sms");
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [workspaceStep, setWorkspaceStep] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scenario = SCENARIOS[scenarioIndex];

  const resetAndAdvance = useCallback(() => {
    setScenarioIndex((prev) => (prev + 1) % SCENARIOS.length);
    setWorkspaceStep(0);
    setStatusIndex(0);
    setPhase("sms");
    setVisibleMessages(0);
    setIsTyping(false);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [visibleMessages, isTyping]);

  // Phase 1: SMS conversation
  useEffect(() => {
    if (phase !== "sms") return;
    setVisibleMessages(0);
    setIsTyping(false);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    const timers: NodeJS.Timeout[] = [];

    scenario.conversation.forEach((msg, i) => {
      if (msg.from === "gigler") {
        timers.push(setTimeout(() => setIsTyping(true), msg.delay - 1500));
      }
      timers.push(
        setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages(i + 1);
        }, msg.delay),
      );
    });

    const lastDelay = scenario.conversation[scenario.conversation.length - 1].delay;
    timers.push(setTimeout(() => setPhase("workspace"), lastDelay + 2000));

    return () => timers.forEach(clearTimeout);
  }, [phase, scenario, scenarioIndex]);

  // Phase 2: Workspace animation
  useEffect(() => {
    if (phase !== "workspace") return;
    setWorkspaceStep(0);
    setStatusIndex(0);

    const timers: NodeJS.Timeout[] = [];
    const totalFiles = scenario.files.length;
    const totalStatuses = scenario.statusSteps.length;

    for (let i = 0; i < totalFiles; i++) {
      timers.push(setTimeout(() => setWorkspaceStep(i + 1), scenario.files[i].delay));
    }

    for (let i = 0; i < totalStatuses; i++) {
      timers.push(setTimeout(() => setStatusIndex(i), i * 1800));
    }

    const totalDuration = Math.max(
      scenario.files[totalFiles - 1].delay + 1000,
      totalStatuses * 1800,
    );
    timers.push(setTimeout(resetAndAdvance, totalDuration + 3000));

    return () => timers.forEach(clearTimeout);
  }, [phase, scenario, resetAndAdvance]);

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <div className="relative h-[560px] sm:h-[580px]">
        {/* Phase 1: SMS view */}
        <div
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${
            phase === "sms"
              ? "opacity-100 scale-100"
              : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <div className="rounded-3xl bg-[#faf8f5] border border-[#e8e4de] shadow-2xl shadow-black/30 overflow-hidden flex flex-col h-full">
            <div className="flex items-center justify-between px-6 pt-4 pb-2 shrink-0">
              <span className="text-xs text-[#9c9590] font-medium">9:41 AM</span>
              <span className="text-sm font-bold text-[#1a1816]">Gigler</span>
              <div className="flex gap-1">
                <div className="w-4 h-2 rounded-sm bg-[#4285F4]" />
              </div>
            </div>

            <div
              ref={scrollRef}
              className="px-4 pb-4 pt-2 flex-1 min-h-0 overflow-y-auto scroll-smooth"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="space-y-3">
                {scenario.conversation.slice(0, visibleMessages).map((msg, i) => (
                  <div
                    key={`${scenarioIndex}-${i}`}
                    className={`hero-fade-in flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line leading-relaxed ${
                        msg.from === "user"
                          ? "bg-[#4285F4] text-white rounded-br-md"
                          : "bg-[#e8e4de] text-[#1a1816] rounded-bl-md"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && <TypingDots />}
              </div>
            </div>

            <div className="px-4 pb-4 shrink-0">
              <div className="flex items-center gap-2 bg-white rounded-full border border-[#e8e4de] px-4 py-2.5">
                <span className="text-[#9c9590] text-sm flex-1">Text Gigler anything...</span>
                <div className="w-7 h-7 rounded-full bg-[#4285F4] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 2: Workspace view */}
        <div
          className={`absolute inset-0 transition-all duration-700 ease-in-out ${
            phase === "workspace"
              ? "opacity-100 scale-100"
              : "opacity-0 scale-105 pointer-events-none"
          }`}
        >
          <div className="rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/50 overflow-hidden flex flex-col h-full">
            {/* Workspace header */}
            <div className="flex items-center gap-2 px-5 pt-4 pb-3 border-b border-zinc-800 shrink-0">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <span className="text-xs text-zinc-400 font-mono ml-2 truncate">
                gigler — {scenario.workspaceTitle}
              </span>
            </div>

            <div className="flex flex-1 min-h-0">
              {/* File tree sidebar */}
              <div className="w-[140px] sm:w-[160px] border-r border-zinc-800 p-3 shrink-0">
                <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2 font-semibold">
                  Files
                </div>
                <div className="space-y-1.5">
                  {scenario.files.map((file, i) => (
                    <div
                      key={file.name}
                      className={`flex items-center gap-1.5 text-[11px] transition-all duration-500 ${
                        i < workspaceStep
                          ? "opacity-100 translate-x-0"
                          : "opacity-0 -translate-x-2"
                      }`}
                    >
                      <span className="text-xs">{file.icon}</span>
                      <span className="text-zinc-400 truncate">{file.name}</span>
                      <svg
                        className={`w-3 h-3 text-green-500 shrink-0 ml-auto transition-opacity duration-300 ${
                          i < workspaceStep ? "opacity-100" : "opacity-0"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main workspace area */}
              <div className="flex-1 p-4 flex flex-col gap-3 min-w-0">
                {/* Preview area */}
                <div className="flex-1 rounded-lg bg-zinc-900 border border-zinc-800 p-3 overflow-hidden">
                  <div className="text-[9px] uppercase tracking-wider text-zinc-600 mb-2">
                    Preview
                  </div>
                  {scenario.preview === "bills" ? (
                    <BillsPreview step={workspaceStep} />
                  ) : (
                    <WebsitePreview step={workspaceStep} />
                  )}
                </div>

                {/* Status / progress */}
                <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        statusIndex < scenario.statusSteps.length - 1
                          ? "bg-yellow-500 animate-pulse"
                          : "bg-green-500"
                      }`}
                    />
                    <span className="text-[11px] font-mono text-zinc-400 truncate workspace-status-text">
                      {scenario.statusSteps[statusIndex]}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-1000 ease-out"
                      style={{
                        width: `${((statusIndex + 1) / scenario.statusSteps.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
