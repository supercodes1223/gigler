"use client";

import { useState, useEffect, useRef } from "react";

interface Message {
  from: "user" | "gigler";
  text: string;
  delay: number;
}

const CONVERSATIONS: Message[][] = [
  [
    { from: "user", text: "Plan a birthday party for Austin on June 14", delay: 1000 },
    { from: "gigler", text: "On it! I created a gig: \"Austin's Birthday Party\" 🎉\n\nQuick questions:\n• Venue? (backyard, restaurant, hall)\n• Guest count?\n• Budget range?", delay: 3000 },
    { from: "user", text: "Backyard, about 40 people, $2000 budget", delay: 6000 },
    { from: "gigler", text: "Here's your plan:\n✅ Venue: Your backyard\n🍽️ Catering for 40 ($800-1000)\n🎵 Speaker + playlist\n📸 Photo area + collage page\n🎂 Cake ($80-150)\n\nWant me to create the Evite invitations?", delay: 8500 },
    { from: "user", text: "Yes! Add Sabrina 555-123-4567 to help", delay: 12000 },
    { from: "gigler", text: "Done! Sabrina's been added to the gig thread. She'll get a welcome message.\n\nCreating the Evite now — I'll share a preview in a minute. 📨", delay: 14500 },
  ],
  [
    { from: "user", text: "Build me a landing page for my coffee shop", delay: 1000 },
    { from: "gigler", text: "Let's do it! I created a gig: \"Coffee Shop Website\" ☕\n\nWhat's the shop called and what vibe are you going for?", delay: 3000 },
    { from: "user", text: "Brew & Co. Modern, minimal, dark theme", delay: 5500 },
    { from: "gigler", text: "Love it. I'm building it now.\n\nIncluding:\n• Hero with your shop name + hours\n• Menu section\n• Location map\n• Instagram feed\n\nGive me 2 minutes...", delay: 7500 },
    { from: "gigler", text: "Your site is live! 🚀\n\ngigler.ai/brew-co\n\nWant me to set up a custom domain?", delay: 12000 },
  ],
];

export default function SmsDemo() {
  const [conversationIndex, setConversationIndex] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const conversation = CONVERSATIONS[conversationIndex];

  // Auto-scroll to bottom when new messages appear or typing starts
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [visibleMessages, isTyping]);

  useEffect(() => {
    setVisibleMessages(0);
    setIsTyping(false);

    // Reset scroll to top when conversation changes
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    const timers: NodeJS.Timeout[] = [];

    conversation.forEach((msg, i) => {
      if (msg.from === "gigler") {
        timers.push(
          setTimeout(() => setIsTyping(true), msg.delay - 1500)
        );
      }

      timers.push(
        setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages(i + 1);
        }, msg.delay)
      );
    });

    const lastDelay = conversation[conversation.length - 1].delay;
    timers.push(
      setTimeout(() => {
        setConversationIndex((prev) => (prev + 1) % CONVERSATIONS.length);
      }, lastDelay + 5000)
    );

    return () => timers.forEach(clearTimeout);
  }, [conversationIndex, conversation]);

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Phone frame — fixed height, flexbox layout */}
      <div className="rounded-3xl bg-[#faf8f5] border border-[#e8e4de] shadow-2xl shadow-black/30 overflow-hidden flex flex-col h-[540px]">
        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2 shrink-0">
          <span className="text-xs text-[#9c9590] font-medium">9:41 AM</span>
          <span className="text-sm font-bold text-[#1a1816]">Gigler</span>
          <div className="flex gap-1">
            <div className="w-4 h-2 rounded-sm bg-[#4285F4]" />
          </div>
        </div>

        {/* Messages area — fills remaining space, scrolls */}
        <div
          ref={scrollContainerRef}
          className="px-4 pb-4 pt-2 flex-1 min-h-0 overflow-y-auto scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          <style jsx>{`div::-webkit-scrollbar { display: none; }`}</style>
          <div className="space-y-3">
            {conversation.slice(0, visibleMessages).map((msg, i) => (
              <div
                key={`${conversationIndex}-${i}`}
                className={`sms-message flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                style={{ animationDelay: "0s" }}
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

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start sms-message" style={{ animationDelay: "0s" }}>
                <div className="bg-[#e8e4de] rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5">
                  <div className="typing-dot w-2 h-2 rounded-full bg-[#9c9590]" />
                  <div className="typing-dot w-2 h-2 rounded-full bg-[#9c9590]" />
                  <div className="typing-dot w-2 h-2 rounded-full bg-[#9c9590]" />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Input bar — pinned to bottom */}
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
  );
}
