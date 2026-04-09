import { defineFunction } from "@aws-amplify/backend";

export const giglerReminderScheduler = defineFunction({
  name: "gigler-reminder-scheduler",
  entry: "./handler.ts",
  timeoutSeconds: 120,
  memoryMB: 256,
  environment: {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
    GIGLER_NUMBER: process.env.GIGLER_NUMBER || "",
    TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID || "",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  },
  resourceGroupName: "data",
});
