"use client";

import { useState } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";

export default function InviteRequestForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setState("error");
      setMessage("Please enter your email to request an invite.");
      return;
    }

    setState("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/invite-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(result.error || "Could not submit invite request.");
      }

      setState("success");
      setSubmittedEmail(trimmedEmail);
      setEmail("");
      setMessage(
        result.message ||
          "Request submitted. Gigler is currently invite-only, and we'll follow up if we can add you to the closed beta.",
      );
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not submit invite request. Please try again.",
      );
    }
  }

  if (state === "success") {
    return (
      <div
        id="request-invite"
        className="mx-auto mt-8 max-w-xl rounded-3xl border border-green-500/30 bg-green-500/10 p-6 text-left shadow-2xl shadow-black/20"
        aria-live="polite"
      >
        <div className="mb-3 inline-flex rounded-full border border-green-500/40 bg-green-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-300">
          Request submitted
        </div>
        <h3 className="text-2xl font-bold text-foreground">You&apos;re on the list.</h3>
        <p className="mt-3 text-sm leading-relaxed text-brand-muted">
          {message ||
            "Gigler is currently invite-only. We'll review your request and follow up if we can add you to the closed beta."}
        </p>
        {submittedEmail ? (
          <p className="mt-4 rounded-2xl border border-brand-border bg-background px-4 py-3 text-sm text-foreground">
            Submitted email: <span className="font-semibold">{submittedEmail}</span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      id="request-invite"
      onSubmit={handleSubmit}
      className="mx-auto mt-8 max-w-xl rounded-3xl border border-brand-border bg-background p-4 shadow-2xl shadow-black/20 sm:flex sm:items-center sm:gap-3"
    >
      <div className="flex-1">
        <label htmlFor="invite-email" className="sr-only">
          Email address
        </label>
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          className="w-full rounded-full border border-brand-border bg-brand-surface px-5 py-3 text-base text-foreground outline-none transition placeholder:text-brand-muted focus:border-brand-primary"
          disabled={state === "submitting" || state === "success"}
        />
      </div>
      <button
        type="submit"
        disabled={state === "submitting" || state === "success"}
        className="mt-3 w-full rounded-full bg-foreground px-6 py-3 text-base font-semibold text-background transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 sm:mt-0 sm:w-auto"
      >
        {state === "submitting" ? "Submitting..." : "Request Invite"}
      </button>
      {message ? (
        <p
          className="mt-4 text-sm leading-relaxed text-red-400 sm:absolute sm:left-1/2 sm:top-full sm:mt-3 sm:w-full sm:max-w-xl sm:-translate-x-1/2"
          aria-live="polite"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
