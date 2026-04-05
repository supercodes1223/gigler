import { defineFunction } from "@aws-amplify/backend";

export const giglerReminderScheduler = defineFunction({
  name: "gigler-reminder-scheduler",
  entry: "./handler.ts",
  timeoutSeconds: 60,
  memoryMB: 256,
  environment: {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
    GIGLER_NUMBER: process.env.GIGLER_NUMBER || "",
  },
  resourceGroupName: "data",
});
