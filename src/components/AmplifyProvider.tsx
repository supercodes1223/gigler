"use client";

import { useEffect, useState, type ReactNode } from "react";
import { configureAmplify } from "@/lib/amplify-utils";

/**
 * Wraps children with Amplify configuration.
 * Safe to render even before amplify_outputs.json exists.
 */
export function AmplifyProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    configureAmplify();
    setReady(true);
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
