import { defineFunction } from "@aws-amplify/backend";

export const giglerMediaProcessor = defineFunction({
  name: "gigler-media-processor",
  entry: "./handler.ts",
  timeoutSeconds: 120,
  memoryMB: 1024,
  environment: {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    GIGLER_NUMBER: process.env.GIGLER_NUMBER || "",
    TWILIO_MESSAGING_SERVICE_SID: process.env.TWILIO_MESSAGING_SERVICE_SID || "",
    CLOUDFRONT_DOMAIN: process.env.CLOUDFRONT_DOMAIN || "",
  },
  resourceGroupName: "data",
});
