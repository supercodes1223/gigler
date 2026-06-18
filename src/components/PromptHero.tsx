"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getApps, type AppDef } from "@/lib/apps";
import { useGigStatus } from "@/components/GigStatusProvider";

type Phase = "idle" | "planning" | "ready" | "phone" | "otp" | "creating" | "done";

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

  const [appsReady, setAppsReady] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [rotationPaused, setRotationPaused] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{
    shortCode: string;
    gigId: string;
    processorTriggered: boolean;
  } | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [busy, setBusy] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const { setInProgress, registerReset } = useGigStatus();

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  /** Minimum "thinking" beat so the planning state never just flashes. */
  const MIN_THINKING_MS = 850;

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

  // A gig is "underway" once it has started and before it reaches "done".
  // Share this with the rest of the app (e.g. SideRail) so navigating away
  // can confirm first.
  useEffect(() => {
    setInProgress(started && phase !== "done");
  }, [started, phase, setInProgress]);

  // Let other UI (the SideRail brand logo) reset this hero to its empty state.
  useEffect(() => {
    registerReset(() => reset());
  }, [registerReset]);

  // Smoothly auto-rotate the example suggestions while idle. Pauses on
  // hover/focus, when a gig has started, and when the user prefers reduced motion.
  useEffect(() => {
    if (started || rotationPaused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const id = setInterval(() => {
      setSuggestionIndex((i) => (i + 1) % EXAMPLE_PROMPTS.length);
    }, 2600);
    return () => clearInterval(id);
  }, [started, rotationPaused]);

  async function handleSubmitPrompt(text: string) {
    const trimmed = text.trim();
    if (!trimmed || phase === "planning" || phase === "creating") return;
    setPrompt(trimmed);
    setError("");
    setAppsReady(false);
    setPhase("planning");

    const startedAt = Date.now();
    let planResult: Plan = { appIds: ["gemini"], title: trimmed };
    try {
      const res = await fetch("/api/gig/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      const data = (await res.json()) as Plan & { error?: string };
      planResult = {
        appIds: Array.isArray(data.appIds) && data.appIds.length ? data.appIds : ["gemini"],
        title: data.title || trimmed,
      };
    } catch {
      planResult = { appIds: ["gemini"], title: trimmed };
    }

    // Keep a brief, classy "thinking" beat even when the API is instant.
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_THINKING_MS) await sleep(MIN_THINKING_MS - elapsed);

    setPlan(planResult);
    setApps(getApps(planResult.appIds));
    setAppsReady(true);

    // Logged in? Create directly. Otherwise, show the tools + a Start CTA that
    // opens the phone modal.
    if (loggedInEmail) {
      await createGig({ email: loggedInEmail });
    } else {
      setPhase("ready");
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid phone number");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/gig/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "Could not send code");
        return;
      }
      setPhase("otp");
    } catch {
      setError("Could not send code. Please try again.");
    } finally {
      setBusy(false);
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
        processorTriggered?: boolean;
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
      setResult({
        shortCode: data.shortCode || "",
        gigId: data.gigId || "",
        processorTriggered: data.processorTriggered ?? false,
      });
      setPhase("done");
    } catch {
      setError("Could not create your gig. Please try again.");
      setPhase(extra.code !== undefined ? "otp" : "phone");
    }
  }

  function handleStart() {
    setError("");
    if (loggedInEmail) {
      void createGig({ email: loggedInEmail });
    } else {
      setPhase("phone");
    }
  }

  function reset() {
    setPhase("idle");
    setPrompt("");
    setPlan(null);
    setApps([]);
    setAppsReady(false);
    setError("");
    setPhone("");
    setCode("");
    setResult(null);
    setNotConfigured(false);
    setBusy(false);
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
          suppressHydrationWarning
          className={`gigler-glow font-bold tracking-tight transition-all duration-500 ${
            started ? "text-2xl md:text-3xl" : "text-4xl md:text-6xl"
          }`}
        >
          Let&apos;s get stuff done.
        </h1>
        {!started && (
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-brand-muted">
            Describe what you need. Gigler plans it, picks the right AI agents and
            apps, and gets the gig done reaching you by text, phone and email when
            it needs you.
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
          className="prompt-glow hero-fade-in rounded-3xl"
        >
          <div className="rounded-3xl border border-brand-border bg-background-alt p-3 shadow-2xl shadow-black/40">
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
        <div className="hero-fade-in rounded-2xl border border-brand-border bg-background-alt/60 px-5 py-4">
          <p className="text-base font-medium leading-relaxed text-foreground">
            {prompt}
          </p>
        </div>
      )}

      {/* Rotating example suggestion */}
      {!started && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSubmitPrompt(EXAMPLE_PROMPTS[suggestionIndex])}
            onMouseEnter={() => setRotationPaused(true)}
            onMouseLeave={() => setRotationPaused(false)}
            onFocus={() => setRotationPaused(true)}
            onBlur={() => setRotationPaused(false)}
            aria-label={`Try this example gig: ${EXAMPLE_PROMPTS[suggestionIndex]}`}
            className="group flex max-w-full items-center gap-2.5 rounded-full border border-brand-border bg-brand-surface/50 py-2.5 pl-4 pr-3 text-sm transition hover:border-brand-accent/50 hover:bg-brand-surface"
          >
            <span className="relative h-5 overflow-hidden text-left">
              <span
                key={suggestionIndex}
                aria-live="polite"
                className="suggestion-cycle block whitespace-nowrap font-medium text-foreground"
              >
                {EXAMPLE_PROMPTS[suggestionIndex]}
              </span>
            </span>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-foreground transition group-hover:bg-foreground/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </button>
          <div className="flex items-center gap-1.5" aria-hidden>
            {EXAMPLE_PROMPTS.map((ex, i) => (
              <span
                key={ex}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === suggestionIndex ? "w-5 bg-brand-accent" : "w-1.5 bg-brand-border"
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Plan / logo reveal */}
      {started && (
        <div className="mt-6">
          {!appsReady ? (
            <>
              <div className="flex items-center gap-2.5 text-sm text-brand-muted">
                <span className="flex gap-1">
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-brand-accent" />
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-brand-accent" />
                  <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-brand-accent" />
                </span>
                <span>Gigler is figuring out which apps &amp; agents to use…</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-2 rounded-xl border border-brand-border bg-brand-surface/30 px-2 py-3"
                  >
                    <span className="shimmer-tile h-11 w-11 rounded-xl" />
                    <span className="shimmer-tile h-2.5 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm text-brand-muted">
                Gigler picked the right tools{plan?.title ? ` for ${plan.title}` : ""}:
              </div>
              {apps.length > 0 && (
                <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-4">
                  {apps.map((app, i) => (
                    <div
                      key={app.id}
                      className="tool-rise flex w-16 flex-col items-center gap-2"
                      style={{ animationDelay: `${i * 90}ms` }}
                    >
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-[14px] transition-transform duration-300 hover:scale-105"
                        style={{ boxShadow: `0 0 0 1px ${app.color}33, 0 8px 22px -8px ${app.color}aa` }}
                      >
                        <Image
                          src={app.logo}
                          alt=""
                          aria-hidden
                          width={48}
                          height={48}
                          unoptimized
                          className="h-12 w-12 rounded-[14px]"
                        />
                      </span>
                      <span className="text-center text-xs font-medium leading-tight text-brand-muted">
                        {app.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {phase === "ready" && (
                <div className="mt-7 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={handleStart}
                    className="inline-flex items-center gap-2 rounded-full bg-foreground px-7 py-3 text-base font-semibold text-background shadow-lg shadow-black/20 transition hover:bg-white"
                  >
                    Start now
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                  <p className="text-xs text-brand-muted">
                    Gigler gets to work and texts you only if it needs something.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Phone / OTP modal */}
      {(phase === "phone" || phase === "otp") && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !busy && setPhase("ready")}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            className="hero-fade-in relative w-full max-w-md rounded-2xl border border-brand-border bg-background-alt p-6 shadow-2xl shadow-black/50"
          >
            {phase === "phone" ? (
              <form onSubmit={handleSendOtp}>
                <h2 className="text-lg font-bold text-foreground">Start your Gig</h2>
                <p className="mt-1 text-sm leading-relaxed text-brand-muted">
                  We&apos;ll text you so Gigler can continue this Gig over the phone if needed.
                </p>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="mt-4 w-full rounded-full border border-brand-border bg-brand-surface px-5 py-3 text-base text-foreground outline-none transition placeholder:text-brand-muted focus:border-brand-accent"
                />
                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-base font-semibold text-background transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Sending…" : "Text me a code"}
                </button>
                <button
                  type="button"
                  onClick={() => setPhase("ready")}
                  className="mt-3 block w-full text-center text-xs text-brand-muted underline-offset-2 hover:text-foreground hover:underline"
                >
                  Cancel
                </button>
                <p className="mt-3 text-center text-xs text-brand-muted">
                  By continuing you agree to receive an SMS verification code. Standard rates may apply.
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndCreate}>
                <h2 className="text-lg font-bold text-foreground">Enter your code</h2>
                <p className="mt-1 text-sm leading-relaxed text-brand-muted">
                  We texted a 6-digit code to {phone}.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="mt-4 w-full rounded-full border border-brand-border bg-brand-surface px-5 py-3 text-center text-lg tracking-[0.4em] text-foreground outline-none transition placeholder:tracking-normal placeholder:text-brand-muted focus:border-brand-accent"
                />
                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
                <button
                  type="submit"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-base font-semibold text-background transition hover:bg-white"
                >
                  Start my Gig
                </button>
                <button
                  type="button"
                  onClick={() => setPhase("phone")}
                  className="mt-3 block w-full text-center text-xs text-brand-muted underline-offset-2 hover:text-foreground hover:underline"
                >
                  Use a different number
                </button>
              </form>
            )}
          </div>
        </div>
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
                {result?.processorTriggered
                  ? "Gigler is on it. We'll text you to keep things moving and to check in when a decision is needed."
                  : "Your gig is saved. Text Gigler to kick it off and we'll take it from there."}
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
