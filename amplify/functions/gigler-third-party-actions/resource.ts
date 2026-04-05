import { defineFunction } from "@aws-amplify/backend";

export const giglerThirdPartyActions = defineFunction({
  name: "gigler-third-party-actions",
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
