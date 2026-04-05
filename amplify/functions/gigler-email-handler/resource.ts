import { defineFunction } from "@aws-amplify/backend";

export const giglerEmailHandler = defineFunction({
  name: "gigler-email-handler",
  entry: "./handler.ts",
  timeoutSeconds: 60,
  memoryMB: 512,
  environment: {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
    GIGLER_NUMBER: process.env.GIGLER_NUMBER || "",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    SES_FROM_EMAIL: process.env.SES_FROM_EMAIL || "notifications@gigler.ai",
  },
  resourceGroupName: "data",
});
