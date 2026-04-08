/**
 * Server-side and client-side Amplify utilities.
 * Configures the Amplify client for use in Next.js SSR and CSR contexts.
 */

"use client";

import { Amplify } from "aws-amplify";

let isConfigured = false;
let outputsPromise: Promise<Record<string, unknown> | null> | null = null;

async function loadAmplifyOutputs(): Promise<Record<string, unknown> | null> {
  if (!outputsPromise) {
    outputsPromise = fetch("/amplify_outputs.json")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as Record<string, unknown>;
      })
      .catch(() => null);
  }
  return outputsPromise;
}

export async function configureAmplify() {
  if (isConfigured) return;

  const outputs = await loadAmplifyOutputs();
  if (outputs) {
    Amplify.configure(outputs, { ssr: true });
    isConfigured = true;
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[Amplify] amplify_outputs.json not found yet. Run npx ampx generate outputs after first deployment.");
  }
}
