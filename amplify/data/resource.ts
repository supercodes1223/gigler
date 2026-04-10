import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { giglerInboundSms } from "../functions/gigler-inbound-sms/resource";
import { giglerGigProcessor } from "../functions/gigler-gig-processor/resource";
import { giglerReminderScheduler } from "../functions/gigler-reminder-scheduler/resource";
import { giglerMediaProcessor } from "../functions/gigler-media-processor/resource";
import { giglerDeliverableGenerator } from "../functions/gigler-deliverable-generator/resource";
import { giglerVoiceBridge } from "../functions/gigler-voice-bridge/resource";
import { giglerEmailHandler } from "../functions/gigler-email-handler/resource";
import { giglerThirdPartyActions } from "../functions/gigler-third-party-actions/resource";

const schema = a.schema({
  User: a
    .model({
      phone: a.string().required(),
      email: a.string(),
      name: a.string(),
      plan: a.enum(["free", "pro", "team", "enterprise"]),
      onboardingComplete: a.boolean().default(false),
      preferences: a.string(),
      timezone: a.string(),
      stripeCustomerId: a.string(),
    })
    .authorization((allow) => [
      allow.publicApiKey(),
      allow.guest().to(["read"]),
    ])
    .secondaryIndexes((index) => [
      index("phone")
        .name("byPhone")
        .queryField("getUserByPhone"),
      index("email")
        .name("byEmail")
        .queryField("getUserByEmail"),
    ]),

  Gig: a
    .model({
      ownerId: a.id().required(),
      title: a.string().required(),
      description: a.string(),
      type: a.enum([
        "coding",
        "planning",
        "creative",
        "professional",
        "lifestyle",
        "scheduling",
        "education",
        "business_formation",
        "reservations",
        "household",
        "custom",
      ]),
      status: a.enum(["active", "paused", "completed", "archived"]),
      conversationSid: a.string(),
      twilioNumber: a.string(),
      shortCode: a.string(),
      metadata: a.string(),
      completedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.publicApiKey(),
      allow.guest().to(["read"]),
    ])
    .secondaryIndexes((index) => [
      index("ownerId")
        .name("byOwner")
        .queryField("listGigsByOwner"),
      index("shortCode")
        .name("byShortCode")
        .queryField("getGigByShortCode"),
      index("conversationSid")
        .name("byConversationSid")
        .queryField("getGigByConversationSid"),
    ]),

  GigParticipant: a
    .model({
      gigId: a.id().required(),
      userId: a.string(),
      role: a.enum(["owner", "collaborator", "viewer"]),
      phone: a.string().required(),
      name: a.string(),
      isGuest: a.boolean().default(false),
      joinedAt: a.datetime(),
      invitedBy: a.string(),
    })
    .identifier(["gigId", "phone"])
    .authorization((allow) => [
      allow.publicApiKey(),
    ])
    .secondaryIndexes((index) => [
      index("userId")
        .name("byUserId")
        .queryField("listGigParticipantsByUser"),
      index("phone")
        .name("byPhone")
        .queryField("listGigParticipantsByPhone"),
    ]),

  Message: a
    .model({
      gigId: a.id().required(),
      timestamp: a.datetime().required(),
      senderId: a.string(),
      senderName: a.string(),
      body: a.string(),
      mediaUrls: a.string().array(),
      messageType: a.enum(["sms", "mms", "voice_note", "system", "ai"]),
      direction: a.enum(["inbound", "outbound"]),
    })
    .identifier(["gigId", "timestamp"])
    .authorization((allow) => [
      allow.publicApiKey(),
    ])
    .secondaryIndexes((index) => [
      index("senderId")
        .name("bySender")
        .queryField("listMessagesBySender")
        .sortKeys(["timestamp"]),
    ]),

  Media: a
    .model({
      gigId: a.id().required(),
      mediaId: a.string().required(),
      s3Key: a.string().required(),
      type: a.enum([
        "photo",
        "video",
        "document",
        "code",
        "pdf",
        "voice_note",
      ]),
      uploadedBy: a.string(),
      caption: a.string(),
      extractedData: a.string(),
    })
    .identifier(["gigId", "mediaId"])
    .authorization((allow) => [
      allow.publicApiKey(),
      allow.guest().to(["read"]),
    ]),

  Deliverable: a
    .model({
      gigId: a.id().required(),
      deliverableId: a.string().required(),
      type: a.enum(["pdf", "website", "menu", "collage", "code_project", "bills_dashboard"]),
      title: a.string().required(),
      s3Key: a.string(),
      publicUrl: a.string(),
      shortCode: a.string(),
      expiresAt: a.datetime(),
    })
    .identifier(["gigId", "deliverableId"])
    .authorization((allow) => [
      allow.publicApiKey(),
      allow.guest().to(["read"]),
    ])
    .secondaryIndexes((index) => [
      index("shortCode")
        .name("byShortCode")
        .queryField("getDeliverableByShortCode"),
    ]),

  DeliverableAccess: a
    .model({
      shortCode: a.string().required(),
      phone: a.string().required(),
      code: a.string().required(),
      expiresAt: a.integer().required(),
      verified: a.boolean().default(false),
    })
    .identifier(["shortCode", "phone"])
    .authorization((allow) => [
      allow.publicApiKey(),
    ]),

  Reminder: a
    .model({
      gigId: a.id().required(),
      userId: a.string().required(),
      scheduledAt: a.datetime().required(),
      type: a.enum(["reminder", "wake_up_call", "check_in", "countdown", "nudge", "participant_nudge"]),
      message: a.string(),
      channel: a.enum(["sms", "voice"]),
      recipients: a.string().array(),
      sent: a.boolean().default(false),
      recurrence: a.enum(["none", "daily", "weekly", "monthly"]),
      recurrenceDay: a.integer(),
    })
    .authorization((allow) => [
      allow.publicApiKey(),
    ])
    .secondaryIndexes((index) => [
      index("gigId")
        .name("byGig")
        .queryField("listRemindersByGig")
        .sortKeys(["scheduledAt"]),
      index("scheduledAt")
        .name("byScheduledAt")
        .queryField("listRemindersByScheduledAt"),
    ]),

  ThirdPartyAction: a
    .model({
      gigId: a.id().required(),
      userId: a.string().required(),
      platform: a.enum([
        "opentable",
        "resy",
        "evite",
        "doordash",
        "instacart",
        "uber",
        "yelp",
      ]),
      actionType: a.enum([
        "reservation",
        "event_create",
        "invite_send",
        "booking",
        "order",
      ]),
      status: a.enum(["pending", "confirmed", "cancelled", "failed"]),
      requestPayload: a.string(),
      responsePayload: a.string(),
      externalId: a.string(),
      confirmedAt: a.datetime(),
    })
    .authorization((allow) => [
      allow.publicApiKey(),
    ])
    .secondaryIndexes((index) => [
      index("gigId")
        .name("byGig")
        .queryField("listThirdPartyActionsByGig"),
      index("status")
        .name("byStatus")
        .queryField("listThirdPartyActionsByStatus"),
    ]),

  UserIntegration: a
    .model({
      userId: a.id().required(),
      platform: a.enum([
        "opentable",
        "resy",
        "evite",
        "google",
        "stripe",
      ]),
      oauthToken: a.string(),
      refreshToken: a.string(),
      expiresAt: a.datetime(),
      scopes: a.string(),
    })
    .authorization((allow) => [
      allow.publicApiKey(),
    ])
    .secondaryIndexes((index) => [
      index("userId")
        .name("byUserId")
        .queryField("listUserIntegrationsByUser"),
    ]),
})
.authorization((allow) => [
  allow.publicApiKey(),
  allow.resource(giglerInboundSms).to(["query", "mutate"]),
  allow.resource(giglerGigProcessor).to(["query", "mutate"]),
  allow.resource(giglerReminderScheduler).to(["query", "mutate"]),
  allow.resource(giglerMediaProcessor).to(["query", "mutate"]),
  allow.resource(giglerDeliverableGenerator).to(["query", "mutate"]),
  allow.resource(giglerVoiceBridge).to(["query", "mutate"]),
  allow.resource(giglerEmailHandler).to(["query", "mutate"]),
  allow.resource(giglerThirdPartyActions).to(["query", "mutate"]),
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
