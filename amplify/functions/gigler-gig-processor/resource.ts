import { defineFunction } from "@aws-amplify/backend";

export const giglerGigProcessor = defineFunction({
  name: "gigler-gig-processor",
  entry: "./handler.ts",
  timeoutSeconds: 120,
  memoryMB: 512,
  environment: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.1-pro-preview",
    GEMINI_JUDGE_MODEL: process.env.GEMINI_JUDGE_MODEL || "gemini-2.5-flash",
    QUALITY_LOOP_ENABLED: process.env.QUALITY_LOOP_ENABLED || "true",
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
    TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID || "",
    TWILIO_CONVERSATIONS_SERVICE_SID: process.env.TWILIO_CONVERSATIONS_SERVICE_SID || "",
    GIGLER_NUMBER: process.env.GIGLER_NUMBER || "",
    GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
    GITHUB_ORG: process.env.GITHUB_ORG || "",
    WEB_GIG_SHARED_SECRET: process.env.WEB_GIG_SHARED_SECRET || "",
  },
  resourceGroupName: "data",
});
