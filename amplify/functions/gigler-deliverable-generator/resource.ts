import { defineFunction } from "@aws-amplify/backend";

export const giglerDeliverableGenerator = defineFunction({
  name: "gigler-deliverable-generator",
  entry: "./handler.ts",
  timeoutSeconds: 120,
  memoryMB: 1024,
  environment: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
    CLOUDFRONT_DOMAIN: process.env.CLOUDFRONT_DOMAIN || "",
  },
  resourceGroupName: "data",
});
