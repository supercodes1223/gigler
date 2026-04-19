"use strict";

const LambdaForwarder = require("aws-lambda-ses-forwarder");

const overrides = {
  config: {
    fromEmail: "notifications@gigler.ai",
    subjectPrefix: "",
    emailBucket: "gigler-inbound-emails",
    emailKeyPrefix: "emails/",
    allowPlusSign: true,
    forwardMapping: {
      "@gigler.ai": ["support@carmenai.co"],
    },
  },
};

exports.handler = function (event, context, callback) {
  return LambdaForwarder.handler(event, context, callback, overrides);
};
