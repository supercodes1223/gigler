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
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  },
  resourceGroupName: "data",
});
