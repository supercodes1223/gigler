"use client";

import { useState, useRef } from "react";

interface VerifyFormProps {
  shortCode: string;
}

export function VerifyForm({ shortCode }: VerifyFormProps) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/d/${shortCode}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setStep("code");
      setTimeout(() => codeInputRef.current?.focus(), 100);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/d/${shortCode}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid code");
        return;
      }

      window.location.reload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "phone") {
    return (
      <form onSubmit={handleSendCode} className="space-y-4">
        <p className="text-sm text-brand-muted">
          Enter the phone number you use with Gigler to verify access.
        </p>
        <input
          type="tel"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-brand-border bg-brand-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          required
          autoFocus
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || phone.replace(/\D/g, "").length < 10}
          className="w-full rounded-lg bg-brand-accent px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send verification code"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyCode} className="space-y-4">
      <p className="text-sm text-brand-muted">
        We sent a 6-digit code to your phone. Enter it below.
      </p>
      <input
        ref={codeInputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        className="w-full rounded-lg border border-brand-border bg-brand-surface px-4 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-primary"
        required
        autoFocus
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading || code.length !== 6}
        className="w-full rounded-lg bg-brand-accent px-4 py-3 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
      >
        {loading ? "Verifying..." : "Verify & view"}
      </button>
      <button
        type="button"
        onClick={() => { setStep("phone"); setCode(""); setError(""); }}
        className="w-full text-sm text-brand-muted hover:text-foreground transition"
      >
        Use a different number
      </button>
    </form>
  );
}
