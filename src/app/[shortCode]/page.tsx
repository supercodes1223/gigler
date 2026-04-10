"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { VerifyForm } from "./verify-form";

const RESERVED_PATHS = new Set([
  "dashboard", "settings", "pricing", "login", "signup",
  "api", "examples", "about", "careers", "d", "contact",
]);

interface DeliverableMeta {
  title: string;
  type: string;
  createdAt: string;
}

type PageState =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "verify"; meta: DeliverableMeta }
  | { status: "ready" };

export default function ShortCodePage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    if (!shortCode || RESERVED_PATHS.has(shortCode)) {
      setState({ status: "not-found" });
      return;
    }

    async function check() {
      try {
        const res = await fetch(`/api/d/${shortCode}`, { redirect: "manual" });

        if (res.status === 401) {
          const data = await res.json();
          if (data.code === "AUTH_REQUIRED" && data.title) {
            setState({
              status: "verify",
              meta: { title: data.title, type: data.type, createdAt: data.createdAt },
            });
          } else {
            setState({ status: "not-found" });
          }
          return;
        }

        if (res.status === 404) {
          setState({ status: "not-found" });
          return;
        }

        if (res.status === 200 || res.status === 302 || res.status === 0) {
          setState({ status: "ready" });
          window.location.href = `/api/d/${shortCode}`;
          return;
        }

        setState({ status: "not-found" });
      } catch {
        setState({ status: "not-found" });
      }
    }

    check();
  }, [shortCode]);

  if (state.status === "loading") {
    return (
      <main className="flex-1 pt-24">
        <div className="mx-auto max-w-sm px-6 pb-24">
          <div className="rounded-xl border border-brand-border p-8 text-center">
            <div className="animate-pulse text-brand-muted">Loading...</div>
          </div>
        </div>
      </main>
    );
  }

  if (state.status === "not-found") {
    return (
      <main className="flex-1 pt-24">
        <div className="mx-auto max-w-sm px-6 pb-24">
          <div className="mb-8">
            <Link href="/" className="text-sm text-brand-muted hover:text-foreground transition">
              &larr; gigler.ai
            </Link>
          </div>
          <div className="rounded-xl border border-brand-border p-8 text-center">
            <h1 className="text-2xl font-bold mb-2">Not Found</h1>
            <p className="text-brand-muted">
              This link doesn&apos;t match any deliverable. It may have expired or the code is incorrect.
            </p>
            <p className="text-sm text-brand-muted mt-4">
              Code: <code className="bg-brand-surface px-2 py-0.5 rounded">{shortCode}</code>
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (state.status === "ready") {
    return (
      <main className="flex-1 pt-24">
        <div className="mx-auto max-w-sm px-6 pb-24">
          <div className="rounded-xl border border-brand-border p-8 text-center">
            <div className="text-brand-muted">Redirecting to your deliverable...</div>
          </div>
        </div>
      </main>
    );
  }

  const { meta } = state;
  return (
    <main className="flex-1 pt-24">
      <div className="mx-auto max-w-sm px-6 pb-24">
        <div className="mb-8">
          <Link href="/" className="text-sm text-brand-muted hover:text-foreground transition">
            &larr; gigler.ai
          </Link>
        </div>
        <div className="rounded-xl border border-brand-border p-8">
          <h1 className="text-xl font-bold mb-1">{meta.title}</h1>
          <p className="text-brand-muted text-sm mb-6">
            {meta.type.replace(/_/g, " ")}
            {meta.createdAt && (
              <> &middot; {new Date(meta.createdAt).toLocaleDateString()}</>
            )}
          </p>
          <VerifyForm shortCode={shortCode} />
        </div>
      </div>
    </main>
  );
}
