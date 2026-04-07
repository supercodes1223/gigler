import { defineFunction } from "@aws-amplify/backend";

export const giglerGigProcessor = defineFunction({
  name: "gigler-gig-processor",
  entry: "./handler.ts",
  timeoutSeconds: 120,
  memoryMB: 512,
  environment: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-3.1-pro-preview",
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
    TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID || "",
    GIGLER_NUMBER: process.env.GIGLER_NUMBER || "",
  },
  resourceGroupName: "data",
});
