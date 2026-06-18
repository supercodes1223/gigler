"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface GigStatusContextValue {
  /** True while a gig is underway (started and not yet done). */
  inProgress: boolean;
  /** PromptHero reports its in-progress status here. */
  setInProgress: (value: boolean) => void;
  /** PromptHero registers its reset handler so other UI can reset the hero. */
  registerReset: (handler: () => void) => void;
  /** Reset the prompt hero back to its initial empty state. */
  reset: () => void;
}

const GigStatusContext = createContext<GigStatusContextValue | null>(null);

export function GigStatusProvider({ children }: { children: ReactNode }) {
  const [inProgress, setInProgress] = useState(false);
  const resetRef = useRef<(() => void) | null>(null);

  const registerReset = useCallback((handler: () => void) => {
    resetRef.current = handler;
  }, []);

  const reset = useCallback(() => {
    resetRef.current?.();
  }, []);

  const value = useMemo<GigStatusContextValue>(
    () => ({ inProgress, setInProgress, registerReset, reset }),
    [inProgress, registerReset, reset],
  );

  return <GigStatusContext.Provider value={value}>{children}</GigStatusContext.Provider>;
}

/**
 * Read gig status. Returns safe no-ops when used outside a provider so
 * components like SideRail still work on routes without the provider.
 */
export function useGigStatus(): GigStatusContextValue {
  const ctx = useContext(GigStatusContext);
  if (ctx) return ctx;
  return {
    inProgress: false,
    setInProgress: () => {},
    registerReset: () => {},
    reset: () => {},
  };
}
