import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { storage } from "./storage/resource";
import { giglerInboundSms } from "./functions/gigler-inbound-sms/resource";
import { giglerGigProcessor } from "./functions/gigler-gig-processor/resource";
import { giglerReminderScheduler } from "./functions/gigler-reminder-scheduler/resource";
import { giglerMediaProcessor } from "./functions/gigler-media-processor/resource";
import { giglerDeliverableGenerator } from "./functions/gigler-deliverable-generator/resource";
import { giglerVoiceBridge } from "./functions/gigler-voice-bridge/resource";
import { giglerEmailHandler } from "./functions/gigler-email-handler/resource";
import { giglerThirdPartyActions } from "./functions/gigler-third-party-actions/resource";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { FunctionUrlAuthType } from "aws-cdk-lib/aws-lambda";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { Duration } from "aws-cdk-lib";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";

const backend = defineBackend({
  auth,
  data,
  storage,
  giglerInboundSms,
  giglerGigProcessor,
  giglerReminderScheduler,
  giglerMediaProcessor,
  giglerDeliverableGenerator,
  giglerVoiceBridge,
  giglerEmailHandler,
  giglerThirdPartyActions,
});

// ── Helper to wire table access + env var to a Lambda ──────────────────────
function grantTableAccess(
  tableName: string,
  lambdaRef: { resources: { lambda: unknown } },
  envVarName: string,
  readOnly = false
) {
  const table = (backend.data.resources.tables as Record<string, unknown>)[tableName] as {
    grantReadWriteData: (fn: unknown) => void;
    grantReadData: (fn: unknown) => void;
    tableName: string;
    tableArn: string;
  } | undefined;
  const fn = lambdaRef?.resources?.lambda as {
    addEnvironment: (key: string, value: string) => void;
    addToRolePolicy: (policy: unknown) => void;
  } | undefined;

  if (table && fn) {
    if (readOnly) {
      table.grantReadData(fn);
    } else {
      table.grantReadWriteData(fn);
    }
    fn.addEnvironment(envVarName, table.tableName);
    fn.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["dynamodb:Query"],
        resources: [`${table.tableArn}/index/*`],
      })
    );
  }
}

// ── gigler-inbound-sms: needs User, Gig, Message, GigParticipant ─────────
const inboundSmsLambda = backend.giglerInboundSms;
grantTableAccess("User", inboundSmsLambda, "USER_TABLE_NAME");
grantTableAccess("Gig", inboundSmsLambda, "GIG_TABLE_NAME");
grantTableAccess("Message", inboundSmsLambda, "MESSAGE_TABLE_NAME");
grantTableAccess("GigParticipant", inboundSmsLambda, "GIG_PARTICIPANT_TABLE_NAME");

// ── gigler-inbound-sms: Lambda Function URL for Twilio webhook ──────────
const inboundSmsFn = (backend as any).giglerInboundSms.resources.lambda;
const inboundSmsUrl = inboundSmsFn.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ["*"],
    allowedHeaders: ["*"],
    allowedMethods: ["*" as any],
  },
});
console.log("gigler-inbound-sms Function URL (for Twilio webhook):", inboundSmsUrl.url);

// ── gigler-gig-processor: Function URL for Conversations webhook ────────────
const gigProcessorFn = (backend as any).giglerGigProcessor.resources.lambda;
const gigProcessorUrl = gigProcessorFn.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ["*"],
    allowedHeaders: ["*"],
    allowedMethods: ["*" as any],
  },
});
console.log("gigler-gig-processor Function URL (for Conversations webhook):", gigProcessorUrl.url);

// ── gigler-gig-processor: needs Gig, Message, Deliverable, Reminder, User, GigParticipant
const gigProcessorLambda = backend.giglerGigProcessor;
grantTableAccess("Gig", gigProcessorLambda, "GIG_TABLE_NAME");
grantTableAccess("Message", gigProcessorLambda, "MESSAGE_TABLE_NAME");
grantTableAccess("Deliverable", gigProcessorLambda, "DELIVERABLE_TABLE_NAME");
grantTableAccess("Reminder", gigProcessorLambda, "REMINDER_TABLE_NAME");
grantTableAccess("User", gigProcessorLambda, "USER_TABLE_NAME");
grantTableAccess("GigParticipant", gigProcessorLambda, "GIG_PARTICIPANT_TABLE_NAME");

// ── gigler-reminder-scheduler: needs Reminder, User, Gig ─────────────────
const reminderLambda = backend.giglerReminderScheduler;
grantTableAccess("Reminder", reminderLambda, "REMINDER_TABLE_NAME");
grantTableAccess("User", reminderLambda, "USER_TABLE_NAME", true);
grantTableAccess("Gig", reminderLambda, "GIG_TABLE_NAME", true);

// ── gigler-media-processor: needs Media, S3 ──────────────────────────────
const mediaLambda = backend.giglerMediaProcessor;
grantTableAccess("Media", mediaLambda, "MEDIA_TABLE_NAME");
if (backend.storage.resources.bucket && mediaLambda?.resources?.lambda) {
  backend.storage.resources.bucket.grantReadWrite(
    mediaLambda.resources.lambda as unknown as import("aws-cdk-lib/aws-iam").IGrantable
  );
  (mediaLambda.resources.lambda as unknown as { addEnvironment: (k: string, v: string) => void })
    .addEnvironment("STORAGE_AMPLIFYGENFILES_BUCKETNAME", backend.storage.resources.bucket.bucketName);
}

// ── gigler-deliverable-generator: needs Deliverable, Gig, Media (read), S3 ──
const deliverableLambda = backend.giglerDeliverableGenerator;
grantTableAccess("Deliverable", deliverableLambda, "DELIVERABLE_TABLE_NAME");
grantTableAccess("Gig", deliverableLambda, "GIG_TABLE_NAME", true);
grantTableAccess("Media", deliverableLambda, "MEDIA_TABLE_NAME", true);
if (backend.storage.resources.bucket && deliverableLambda?.resources?.lambda) {
  backend.storage.resources.bucket.grantReadWrite(
    deliverableLambda.resources.lambda as unknown as import("aws-cdk-lib/aws-iam").IGrantable
  );
  (deliverableLambda.resources.lambda as unknown as { addEnvironment: (k: string, v: string) => void })
    .addEnvironment("STORAGE_AMPLIFYGENFILES_BUCKETNAME", backend.storage.resources.bucket.bucketName);
}

// ── gigler-voice-bridge: needs Gig, User ─────────────────────────────────
const voiceLambda = backend.giglerVoiceBridge;
grantTableAccess("Gig", voiceLambda, "GIG_TABLE_NAME", true);
grantTableAccess("User", voiceLambda, "USER_TABLE_NAME", true);

// ── gigler-email-handler: needs Gig, User, Message, Media, S3 ────────────
const emailLambda = backend.giglerEmailHandler;
grantTableAccess("Gig", emailLambda, "GIG_TABLE_NAME");
grantTableAccess("User", emailLambda, "USER_TABLE_NAME", true);
grantTableAccess("Message", emailLambda, "MESSAGE_TABLE_NAME");
grantTableAccess("Media", emailLambda, "MEDIA_TABLE_NAME");
if (backend.storage.resources.bucket && emailLambda?.resources?.lambda) {
  backend.storage.resources.bucket.grantReadWrite(
    emailLambda.resources.lambda as unknown as import("aws-cdk-lib/aws-iam").IGrantable
  );
  (emailLambda.resources.lambda as unknown as { addEnvironment: (k: string, v: string) => void })
    .addEnvironment("STORAGE_AMPLIFYGENFILES_BUCKETNAME", backend.storage.resources.bucket.bucketName);
}

// ── gigler-third-party-actions: needs ThirdPartyAction, Gig, UserIntegration
const thirdPartyLambda = backend.giglerThirdPartyActions;
grantTableAccess("ThirdPartyAction", thirdPartyLambda, "THIRD_PARTY_ACTION_TABLE_NAME");
grantTableAccess("Gig", thirdPartyLambda, "GIG_TABLE_NAME", true);
grantTableAccess("UserIntegration", thirdPartyLambda, "USER_INTEGRATION_TABLE_NAME", true);

// ── Helper to wire Lambda-to-Lambda invoke permission + env var ────────────
function grantLambdaInvoke(
  caller: { resources: { lambda: unknown } },
  target: { resources: { lambda: unknown } },
  envVarName: string
) {
  const callerFn = caller?.resources?.lambda as {
    addEnvironment: (key: string, value: string) => void;
  } | undefined;
  const targetFn = target?.resources?.lambda as {
    grantInvoke: (grantee: unknown) => void;
    functionName: string;
  } | undefined;

  if (callerFn && targetFn) {
    targetFn.grantInvoke(callerFn);
    callerFn.addEnvironment(envVarName, targetFn.functionName);
  }
}

// ── Cross-Lambda invoke permissions ───────────────────────────────────────
// inbound-sms -> gig-processor (async invoke after gig creation / resume)
grantLambdaInvoke(inboundSmsLambda, gigProcessorLambda, "GIG_PROCESSOR_FUNCTION_NAME");
// inbound-sms -> media-processor (MMS download on inbound media)
grantLambdaInvoke(inboundSmsLambda, mediaLambda, "MEDIA_PROCESSOR_FUNCTION_NAME");
// gig-processor -> media-processor (AI image generation)
grantLambdaInvoke(gigProcessorLambda, mediaLambda, "MEDIA_PROCESSOR_FUNCTION_NAME");
// gig-processor -> deliverable-generator (PDF, website, etc.)
grantLambdaInvoke(gigProcessorLambda, deliverableLambda, "DELIVERABLE_GENERATOR_FUNCTION_NAME");
// gig-processor -> third-party-actions (reservations, bookings)
grantLambdaInvoke(gigProcessorLambda, thirdPartyLambda, "THIRD_PARTY_ACTIONS_FUNCTION_NAME");
// reminder-scheduler -> voice-bridge (wake-up calls, check-ins)
grantLambdaInvoke(reminderLambda, voiceLambda, "VOICE_BRIDGE_FUNCTION_NAME");

// ── SES permissions for email-sending Lambdas ─────────────────────────────
const sesPolicy = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ["ses:SendEmail", "ses:SendRawEmail"],
  resources: ["*"],
});

for (const lambdaRef of [inboundSmsLambda, emailLambda, reminderLambda]) {
  const fn = lambdaRef?.resources?.lambda as { addToRolePolicy: (p: unknown) => void } | undefined;
  if (fn) {
    fn.addToRolePolicy(sesPolicy);
  }
}

// ── EventBridge: reminder scheduler every 5 minutes ───────────────────────
try {
  const reminderFn = reminderLambda?.resources?.lambda;
  if (reminderFn) {
    const scheduleStack = backend.createStack("gigler-schedules");
    const rule = new Rule(scheduleStack, "ReminderSchedule", {
      schedule: Schedule.rate(Duration.minutes(5)),
    });
    rule.addTarget(new LambdaFunction(reminderFn as import("aws-cdk-lib/aws-lambda").IFunction));
  }
} catch (e) {
  console.warn("Failed to configure EventBridge schedule for reminder-scheduler:", e);
}
