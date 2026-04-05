import { defineFunction } from "@aws-amplify/backend";

export const giglerVoiceBridge = defineFunction({
  name: "gigler-voice-bridge",
  entry: "./handler.ts",
  timeoutSeconds: 300,
  memoryMB: 512,
  environment: {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
    GIGLER_NUMBER: process.env.GIGLER_NUMBER || "",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  },
  resourceGroupName: "data",
});
