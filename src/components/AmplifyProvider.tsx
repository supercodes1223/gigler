"use client";

import { type ReactNode } from "react";
import { configureAmplify } from "@/lib/amplify-utils";

configureAmplify();

export function AmplifyProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
