import { defineFunction } from "@aws-amplify/backend";

export const giglerInboundSms = defineFunction({
  name: "gigler-inbound-sms",
  entry: "./handler.ts",
  timeoutSeconds: 60,
  memoryMB: 512,
  environment: {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
    GIGLER_NUMBER: process.env.GIGLER_NUMBER || "",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  },
  resourceGroupName: "data",
});
