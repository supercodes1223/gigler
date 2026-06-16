"use strict";

const LambdaForwarder = require("aws-lambda-ses-forwarder");

// Forwarding target is supplied via the FORWARD_TO_EMAIL env var at deploy time
// so the real destination inbox is never committed to the repo.
const forwardTo = process.env.FORWARD_TO_EMAIL || "forwarding-target@example.com";

const overrides = {
  config: {
    fromEmail: "notifications@gigler.ai",
    subjectPrefix: "",
    emailBucket: "gigler-inbound-emails",
    emailKeyPrefix: "emails/",
    allowPlusSign: true,
    forwardMapping: {
      "@gigler.ai": [forwardTo],
    },
  },
};

exports.handler = function (event, context, callback) {
  return LambdaForwarder.handler(event, context, callback, overrides);
};
