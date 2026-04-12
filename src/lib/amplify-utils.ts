"use client";

import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";

let isConfigured = false;

export function configureAmplify() {
  if (isConfigured) return;
  Amplify.configure(outputs as Record<string, unknown>, { ssr: true });
  isConfigured = true;
}
