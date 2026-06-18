"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getApps, type AppDef } from "@/lib/apps";

type Phase = "idle" | "planning" | "phone" | "otp" | "creating" | "done";

interface Plan {
  appIds: string[];
  title: string;
}

const EXAMPLE_PROMPTS = [
  "Build a landing page for my coffee shop",
  "Plan a birthday dinner for 20 people",
  "Reserve a table for 4 on Friday night",
  "Track these utility bills and remind everyone",
  "Organize our tournament photos by player",
];

export default function PromptHero() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [apps, setApps] = useState<AppDef[]>([]);
  const [error, setError] = useState("");

  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{ shortCode: string; gigId: string } | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getCurrentUser } = await import("aws-amplify/auth");
        const user = await getCurrentUser();
        if (!cancelled) {
          setLoggedInEmail(user.signInDetails?.loginId || user.username || null);
        }
      } catch {
        if (!cancelled) setLoggedInEmail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const started = phase !== "idle";

  async function handleSubmitPrompt(text: string) {
    const trimmed = text.trim();
    if (!trimmed || phase === "planning" || phase === "creating") return;
    setPrompt(trimmed);
    setError("");
    setPhase("planning");

    try {
      const res = await fetch("/api/gig/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = (await res.json()) as Plan & { error?: string };
      const planResult: Plan = {
        appIds: Array.isArray(data.appIds) && data.appIds.length ? data.appIds : ["gemini"],
        title: data.title || trimmed,
      };
      setPlan(planResult);
      setApps(getApps(planResult.appIds));
    } catch {
      setPlan({ appIds: ["gemini"], title: trimmed });
      setApps(getApps(["gemini"]));
    }

    // Logged in? Create directly. Otherwise, collect a phone number.
    if (loggedInEmail) {
      await createGig({ email: loggedInEmail });
    } else {
      setPhase("phone");
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number");
      return;
    }
    setPhase("creating");
    try {
      const res = await fetch("/api/gig/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not send code");
        setPhase("phone");
        return;
      }
      setPhase("otp");
    } catch {
      setError("Could not send code. Please try again.");
      setPhase("phone");
    }
  }

  async function handleVerifyAndCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (code.replace(/\D/g, "").length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    await createGig({ phone, code });
  }

  async function createGig(extra: { email?: string; phone?: string; code?: string }) {
    setPhase("creating");
    setError("");
    try {
      const res = await fetch("/api/gig/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          apps: plan?.appIds ?? [],
          title: plan?.title,
          ...extra,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        configured?: boolean;
        needsPhone?: boolean;
        needsCode?: boolean;
        shortCode?: string;
        gigId?: string;
      };

      if (res.status === 503 && data.configured === false) {
        setNotConfigured(true);
        setPhase("done");
        return;
      }
      if (!res.ok || !data.ok) {
        if (data.needsPhone) {
          setError(data.error || "A phone number is required");
          setPhase("phone");
          return;
        }
        setError(data.error || "Could not create your gig");
        setPhase(extra.code !== undefined ? "otp" : "phone");
        return;
      }
      setResult({ shortCode: data.shortCode || "", gigId: data.gigId || "" });
      setPhase("done");
    } catch {
      setError("Could not create your gig. Please try again.");
      setPhase(extra.code !== undefined ? "otp" : "phone");
    }
  }

  function reset() {
    setPhase("idle");
    setPrompt("");
    setPlan(null);
    setApps([]);
    setError("");
    setPhone("");
    setCode("");
    setResult(null);
    setNotConfigured(false);
  }

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      {/* Heading */}
      <div
        className={`text-center transition-all duration-500 ${
          started ? "mb-6 opacity-90" : "mb-8"
        }`}
      >
        <h1
          className={`gigler-glow font-bold tracking-tight transition-all duration-500 ${
            started ? "text-2xl md:text-3xl" : "text-4xl md:text-6xl"
          }`}
        >
          Let&apos;s get stuff done.
        </h1>
        {!started && (
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-brand-muted">
            Describe what you need. Gigler plans it, picks the right apps and
            agents, and gets the gig done — reaching you by text when it needs you.
          </p>
        )}
      </div>

      {/* Prompt box */}
      {!started ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmitPrompt(prompt);
          }}
          className="gradient-frame hero-fade-in rounded-3xl"
        >
          <div className="rounded-3xl border border-brand-border bg-background-alt/90 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmitPrompt(prompt);
                }
              }}
              placeholder="Let's get stuff done"
              rows={3}
              className="w-full resize-none bg-transparent px-4 py-3 text-lg text-foreground outline-none placeholder:text-brand-muted"
            />
            <div className="flex items-center justify-between gap-3 px-2 pb-1">
              <span className="text-xs text-brand-muted">
                Press <kbd className="rounded border border-brand-border px-1">Enter</kbd> to start a Gig
              </span>
              <button
                type="submit"
                disabled={!prompt.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Get it done
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="hero-fade-in rounded-2xl border border-brand-border bg-background-alt/70 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-muted">
            Your gig
          </p>
          <p className="mt-1 text-base font-medium text-foreground">{prompt}</p>
        </div>
      )}

      {/* Example chips */}
      {!started && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => void handleSubmitPrompt(ex)}
              className="rounded-full border border-brand-border bg-brand-surface/60 px-4 py-2 text-sm text-brand-muted transition hover:border-brand-accent/50 hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {/* Plan / logo reveal */}
      {started && (
        <div className="mt-6">
          <div className="flex items-center gap-2 text-sm text-brand-muted">
            {phase === "planning" ? (
              <span className="flex items-center gap-2">
                <span className="flex gap-1">
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-brand-accent" />
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-brand-accent" />
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-brand-accent" />
                </span>
                Orca is routing your gig…
              </span>
            ) : (
              <span>
                Gigler will use{plan?.title ? ` — ${plan.title}` : ""}:
              </span>
            )}
          </div>

          {apps.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {apps.map((app, i) => (
                <div
                  key={app.id}
                  className="sms-message flex flex-col items-center gap-2 rounded-xl border border-brand-border bg-brand-surface/55 px-2 py-3"
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ boxShadow: `0 0 0 1px ${app.color}55, 0 0 18px ${app.color}22` }}
                  >
                    <Image
                      src={app.logo}
                      alt={app.name}
                      width={28}
                      height={28}
                      className={app.monochrome ? "h-7 w-7 brightness-0 invert" : "h-9 w-9"}
                    />
                  </span>
                  <span className="text-center text-xs font-medium leading-tight text-foreground">
                    {app.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Phone step */}
      {phase === "phone" && (
        <form onSubmit={handleSendOtp} className="hero-fade-in mt-8 rounded-2xl border border-brand-border bg-background-alt/70 p-6">
          <h2 className="text-lg font-bold text-foreground">One quick step</h2>
          <p className="mt-1 text-sm leading-relaxed text-brand-muted">
            We&apos;ll text you to continue this Gig over the phone if needed.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="flex-1 rounded-full border border-brand-border bg-brand-surface px-5 py-3 text-base text-foreground outline-none transition placeholder:text-brand-muted focus:border-brand-accent"
            />
            <button
              type="submit"
              className="rounded-full bg-foreground px-6 py-3 text-base font-semibold text-background transition hover:bg-white"
            >
              Text me a code
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <p className="mt-3 text-xs text-brand-muted">
            By continuing you agree to receive an SMS verification code. Standard rates may apply.
          </p>
        </form>
      )}

      {/* OTP step */}
      {phase === "otp" && (
        <form onSubmit={handleVerifyAndCreate} className="hero-fade-in mt-8 rounded-2xl border border-brand-border bg-background-alt/70 p-6">
          <h2 className="text-lg font-bold text-foreground">Enter your code</h2>
          <p className="mt-1 text-sm leading-relaxed text-brand-muted">
            We texted a 6-digit code to {phone}.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="flex-1 rounded-full border border-brand-border bg-brand-surface px-5 py-3 text-center text-lg tracking-[0.4em] text-foreground outline-none transition placeholder:tracking-normal placeholder:text-brand-muted focus:border-brand-accent"
            />
            <button
              type="submit"
              className="rounded-full bg-foreground px-6 py-3 text-base font-semibold text-background transition hover:bg-white"
            >
              Start my Gig
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <button
            type="button"
            onClick={() => setPhase("phone")}
            className="mt-3 text-xs text-brand-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            Use a different number
          </button>
        </form>
      )}

      {/* Creating spinner */}
      {phase === "creating" && (
        <div className="hero-fade-in mt-8 flex items-center justify-center gap-3 rounded-2xl border border-brand-border bg-background-alt/70 p-6 text-brand-muted">
          <span className="flex gap-1">
            <span className="typing-dot inline-block h-2 w-2 rounded-full bg-brand-accent" />
            <span className="typing-dot inline-block h-2 w-2 rounded-full bg-brand-accent" />
            <span className="typing-dot inline-block h-2 w-2 rounded-full bg-brand-accent" />
          </span>
          Setting up your Gig…
        </div>
      )}

      {/* Done */}
      {phase === "done" && (
        <div className="hero-fade-in mt-8 rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
          <div className="mb-2 inline-flex rounded-full border border-green-500/40 bg-green-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-300">
            {notConfigured ? "Plan ready" : "Gig created"}
          </div>
          {notConfigured ? (
            <>
              <h2 className="text-2xl font-bold text-foreground">Here&apos;s the plan.</h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                Gigler&apos;s live backend isn&apos;t connected in this environment, but
                above is exactly how Orca would orchestrate your request. Text
                Gigler to run it for real.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-foreground">Your Gig is live.</h2>
              <p className="mt-2 text-sm leading-relaxed text-brand-muted">
                Gigler is on it. We&apos;ll text you to keep things moving and to
                check in when a decision is needed.
              </p>
              {result?.shortCode && (
                <p className="mt-4 inline-block rounded-xl border border-brand-border bg-background px-4 py-2 text-sm text-foreground">
                  Gig code: <span className="font-mono font-semibold">{result.shortCode}</span>
                </p>
              )}
            </>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-foreground px-6 py-2.5 text-sm font-semibold text-background transition hover:bg-white"
            >
              Start another Gig
            </button>
            <Link
              href="/dashboard"
              className="rounded-full border border-brand-border px-6 py-2.5 text-sm font-semibold text-foreground transition hover:bg-brand-surface"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
