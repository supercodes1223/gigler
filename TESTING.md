# Gigler End-to-End Testing Playbook

Post-deployment testing against real AWS resources. No local mocks -- every test hits the live deployed stack.

> **Deploy first, test second.** This doc assumes you've deployed via Amplify Console (GitHub push → Amplify build). Run these tests to verify everything is wired up correctly.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Smoke Test](#2-quick-smoke-test)
3. [Testing Individual Lambdas](#3-testing-individual-lambdas)
4. [End-to-End Test Scenarios](#4-end-to-end-test-scenarios)
5. [Smart Gig Routing Tests](#5-smart-gig-routing-tests)
6. [Group MMS / Conversations Tests](#6-group-mms--conversations-tests)
7. [DynamoDB Verification Commands](#7-dynamodb-verification-commands)
8. [CloudWatch Log Monitoring](#8-cloudwatch-log-monitoring)
   - [8.5 Structured Tracing & CloudWatch Logs Insights](#85-structured-tracing--cloudwatch-logs-insights)
9. [S3 Verification](#9-s3-verification)
10. [Frontend Verification Checklist](#10-frontend-verification-checklist)
11. [Troubleshooting Guide](#11-troubleshooting-guide)
12. [Test Reset / Cleanup Commands](#12-test-reset--cleanup-commands)
13. [Automated Test Scripts](#13-automated-test-scripts)
14. [Unit Tests](#14-unit-tests)

---

## 1. Prerequisites

### AWS CLI

Ensure your CLI is configured for the correct account and region:

```bash
aws sts get-caller-identity
aws configure list
```

### Verify Amplify Deployment

```bash
aws amplify list-apps --query 'apps[?name==`gigler`].[appId,defaultDomain]' --output table
```

Save your App ID:

```bash
export AMPLIFY_APP_ID=<your-app-id>
```

### Environment Variables

Environment variables must be set on the Amplify app before Lambdas will work. Use the merge-safe script:

```bash
./scripts/set-amplify-env.sh $AMPLIFY_APP_ID
```

Verify a specific Lambda's env vars:

```bash
aws lambda get-function-configuration \
  --function-name <LAMBDA_FUNCTION_NAME> \
  --query 'Environment.Variables' \
  --output table
```

### Discover Deployed Resource Names

**Lambda functions:**

```bash
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `gigler`)].FunctionName' \
  --output table
```

Save these for later (your actual names will include a random suffix from Amplify):

```bash
export FN_INBOUND_SMS=<gigler-inbound-sms-XXXX>
export FN_GIG_PROCESSOR=<gigler-gig-processor-XXXX>
export FN_REMINDER_SCHEDULER=<gigler-reminder-scheduler-XXXX>
export FN_MEDIA_PROCESSOR=<gigler-media-processor-XXXX>
export FN_DELIVERABLE_GENERATOR=<gigler-deliverable-generator-XXXX>
export FN_VOICE_BRIDGE=<gigler-voice-bridge-XXXX>
export FN_EMAIL_HANDLER=<gigler-email-handler-XXXX>
export FN_THIRD_PARTY_ACTIONS=<gigler-third-party-actions-XXXX>
```

**Lambda Function URL (for inbound-sms):**

```bash
aws lambda get-function-url-config \
  --function-name $FN_INBOUND_SMS \
  --query 'FunctionUrl' \
  --output text
```

```bash
export LAMBDA_URL=<the-url-from-above>
```

**DynamoDB tables:**

```bash
aws dynamodb list-tables \
  --query 'TableNames[?contains(@, `User`) || contains(@, `Gig`) || contains(@, `Message`) || contains(@, `Media`) || contains(@, `Deliverable`) || contains(@, `Reminder`) || contains(@, `ThirdParty`) || contains(@, `Integration`) || contains(@, `Participant`)]' \
  --output table
```

Save your table names:

```bash
export TBL_USER=<User-table-name>
export TBL_GIG=<Gig-table-name>
export TBL_GIG_PARTICIPANT=<GigParticipant-table-name>
export TBL_MESSAGE=<Message-table-name>
export TBL_MEDIA=<Media-table-name>
export TBL_DELIVERABLE=<Deliverable-table-name>
export TBL_REMINDER=<Reminder-table-name>
export TBL_THIRD_PARTY_ACTION=<ThirdPartyAction-table-name>
export TBL_USER_INTEGRATION=<UserIntegration-table-name>
```

**S3 buckets:**

```bash
aws s3 ls | grep gigler
```

```bash
export S3_BUCKET=<gigler-media-bucket-name>
```

### Twilio Webhook

Verify the Twilio webhook is pointed at the Lambda Function URL:

1. Log in to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers → Manage → Active Numbers** → select the Gigler number
3. Under **Messaging Configuration**, the webhook URL should match `$LAMBDA_URL`
4. Method should be **HTTP POST**

---

## 2. Quick Smoke Test

Run this sequence to verify the entire stack is alive. Takes under 60 seconds.

```bash
# 1. Hit the inbound SMS Lambda with a test message
curl -s -X POST "$LAMBDA_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Hello+this+is+a+smoke+test&From=%2B15550000001&To=%2B15559876543&MessageSid=SMsmoke001&AccountSid=ACtest123&NumMedia=0"

# 2. Wait a few seconds for async processing
sleep 3

# 3. Check if a User record was created for the test phone number
aws dynamodb query \
  --table-name $TBL_USER \
  --index-name byPhone \
  --key-condition-expression "phone = :p" \
  --expression-attribute-values '{":p": {"S": "+15550000001"}}' \
  --query 'Items[0].{id: id.S, phone: phone.S, onboardingComplete: onboardingComplete.BOOL}'

# 4. Check if the message was logged
aws dynamodb query \
  --table-name $TBL_MESSAGE \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values '{":g": {"S": "onboarding"}}' \
  --scan-index-forward false \
  --limit 3 \
  --query 'Items[].{body: body.S, direction: direction.S, senderName: senderName.S}'
```

**Expected results:**
- Step 1: HTTP 200 with a JSON body (the Twilio-formatted response)
- Step 3: A User record with `phone: "+15550000001"` and `onboardingComplete: false`
- Step 4: At least one inbound message and one outbound welcome message

If all three pass, the core stack is alive: Lambda → DynamoDB → Twilio integration.

---

## 3. Testing Individual Lambdas

### 3.1 gigler-inbound-sms

**What it does:** Receives inbound SMS/MMS via Twilio webhook, identifies or onboards the user, detects intent, and routes to the appropriate handler.

**How to invoke:** HTTP POST (simulating Twilio webhook)

```bash
curl -s -X POST "$LAMBDA_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Hello+this+is+a+test&From=%2B15551234567&To=%2B15559876543&MessageSid=SMtest123&AccountSid=ACtest123&NumMedia=0"
```

**Test payload fields:** `From`, `To`, `Body`, `NumMedia`, `MessageSid`, `AccountSid`. Optional: `FromCity`, `FromState`, `MediaUrl0`, `MediaUrl1`, `MediaUrl2`.

**With MMS (media attached):**

```bash
curl -s -X POST "$LAMBDA_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Check+this+out&From=%2B15551234567&To=%2B15559876543&MessageSid=SMmedia123&AccountSid=ACtest123&NumMedia=1&MediaUrl0=https%3A%2F%2Fapi.twilio.com%2F2010-04-01%2FAccounts%2FACtest123%2FMessages%2FSMmedia123%2FMedia%2Ftest-media"
```

**Verify after:**

```bash
# User record exists
aws dynamodb query \
  --table-name $TBL_USER \
  --index-name byPhone \
  --key-condition-expression "phone = :p" \
  --expression-attribute-values '{":p": {"S": "+15551234567"}}'

# Message logged
aws dynamodb scan \
  --table-name $TBL_MESSAGE \
  --filter-expression "contains(body, :b)" \
  --expression-attribute-values '{":b": {"S": "Hello this is a test"}}' \
  --limit 5

# CloudWatch logs
aws logs tail /aws/lambda/$FN_INBOUND_SMS --since 5m
```

**Expected response format:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>...</Message></Response>
```

Or JSON (depending on your handler's response format):

```json
{
  "statusCode": 200,
  "body": "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Message>...</Message></Response>"
}
```

---

### 3.2 gigler-gig-processor

**What it does:** AI execution engine -- receives a message with gig context and uses Gemini to understand, plan, and act on the gig.

**How to invoke:** Direct Lambda invocation

```bash
aws lambda invoke \
  --function-name $FN_GIG_PROCESSOR \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "gigId": "test-gig-001",
    "userId": "test-user-001",
    "message": "Plan a birthday party for June 14",
    "phone": "+15551234567",
    "senderName": "Test User",
    "_trace": {"traceId": "trc_manual_test_001", "requestId": "cli-test", "source": "manual-test"}
  }' \
  /tmp/gig-processor-response.json

cat /tmp/gig-processor-response.json | python3 -m json.tool
```

> **Tip:** Including `_trace` with a known `traceId` lets you find all logs from this invocation and any downstream Lambdas it triggers using a single CloudWatch Logs Insights query (see [Section 8.5](#85-structured-tracing--cloudwatch-logs-insights)).

**Verify after:**

```bash
# Gig record updated
aws dynamodb get-item \
  --table-name $TBL_GIG \
  --key '{"id": {"S": "test-gig-001"}}'

# AI response message logged
aws dynamodb query \
  --table-name $TBL_MESSAGE \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values '{":g": {"S": "test-gig-001"}}' \
  --scan-index-forward false \
  --limit 3

# CloudWatch logs — filter by your manual traceId
aws logs tail /aws/lambda/$FN_GIG_PROCESSOR --since 5m --filter-pattern '"trc_manual_test_001"'
```

**Expected response:** JSON with the AI's response text and any actions taken (reminders created, participants added, etc.).

---

### 3.3 gigler-reminder-scheduler

**What it does:** Runs every 5 minutes via EventBridge, queries the Reminder table for due items, and sends SMS reminders or initiates voice calls.

**How to invoke:** Direct invocation with empty payload (same as EventBridge trigger)

```bash
aws lambda invoke \
  --function-name $FN_REMINDER_SCHEDULER \
  --cli-binary-format raw-in-base64-out \
  --payload '{}' \
  /tmp/reminder-scheduler-response.json

cat /tmp/reminder-scheduler-response.json | python3 -m json.tool
```

**To test with actual reminders, first create one:**

```bash
aws dynamodb put-item \
  --table-name $TBL_REMINDER \
  --item '{
    "id": {"S": "test-reminder-001"},
    "gigId": {"S": "test-gig-001"},
    "userId": {"S": "test-user-001"},
    "scheduledAt": {"S": "'$(date -u -v+1M +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "+1 minute" +%Y-%m-%dT%H:%M:%SZ)'"},
    "type": {"S": "reminder"},
    "message": {"S": "Don't forget to book the venue for the birthday party!"},
    "channel": {"S": "sms"},
    "sent": {"BOOL": false},
    "createdAt": {"S": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}
  }'
```

Then invoke the scheduler and verify:

```bash
aws lambda invoke \
  --function-name $FN_REMINDER_SCHEDULER \
  --cli-binary-format raw-in-base64-out \
  --payload '{}' \
  /tmp/reminder-scheduler-response.json

# Check if the reminder was marked as sent
aws dynamodb get-item \
  --table-name $TBL_REMINDER \
  --key '{"id": {"S": "test-reminder-001"}}' \
  --query 'Item.{sent: sent.BOOL, message: message.S}'

# CloudWatch logs for SMS send attempt
aws logs tail /aws/lambda/$FN_REMINDER_SCHEDULER --since 5m
```

**Expected response:** JSON indicating how many reminders were processed and sent.

---

### 3.4 gigler-media-processor

**What it does:** Handles AI image/video generation and inbound MMS media downloads. Stores all media in S3.

**How to invoke:** Direct invocation. Three actions: `generate_image`, `download_mms`, `generate_video`.

**Action: generate_image**

```bash
aws lambda invoke \
  --function-name $FN_MEDIA_PROCESSOR \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "action": "generate_image",
    "gigId": "test-gig-001",
    "userId": "test-user-001",
    "prompt": "A colorful birthday party invitation with balloons and confetti",
    "phone": "+15551234567",
    "_trace": {"traceId": "trc_manual_media_001", "requestId": "cli-test", "source": "manual-test"}
  }' \
  /tmp/media-processor-response.json

cat /tmp/media-processor-response.json | python3 -m json.tool
```

**Action: download_mms** (requires a real Twilio media URL from an actual inbound MMS)

```bash
aws lambda invoke \
  --function-name $FN_MEDIA_PROCESSOR \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "action": "download_mms",
    "gigId": "test-gig-001",
    "userId": "test-user-001",
    "mediaUrl": "https://api.twilio.com/2010-04-01/Accounts/ACtest123/Messages/SMmedia123/Media/MEtest456",
    "phone": "+15551234567"
  }' \
  /tmp/media-download-response.json

cat /tmp/media-download-response.json | python3 -m json.tool
```

**Action: generate_video** (returns 501 Not Implemented)

```bash
aws lambda invoke \
  --function-name $FN_MEDIA_PROCESSOR \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "action": "generate_video",
    "gigId": "test-gig-001",
    "userId": "test-user-001",
    "prompt": "A short birthday party highlight reel",
    "phone": "+15551234567"
  }' \
  /tmp/media-video-response.json

cat /tmp/media-video-response.json | python3 -m json.tool
```

**Verify after (generate_image):**

```bash
# Media record created
aws dynamodb query \
  --table-name $TBL_MEDIA \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values '{":g": {"S": "test-gig-001"}}'

# S3 object created
aws s3 ls s3://$S3_BUCKET/media/test-gig-001/ --recursive

# CloudWatch logs
aws logs tail /aws/lambda/$FN_MEDIA_PROCESSOR --since 5m
```

**Expected responses:**
- `generate_image`: JSON with `s3Key`, `mediaUrl`, and confirmation the image was sent via MMS
- `download_mms`: JSON with `s3Key` of the downloaded file
- `generate_video`: `{"statusCode": 501, "body": "Video generation not yet implemented"}`

---

### 3.5 gigler-deliverable-generator

**What it does:** Creates shareable deliverables (websites, PDFs, collages) and hosts them at public short URLs like `gigler.ai/<shortCode>`.

**How to invoke:**

```bash
aws lambda invoke \
  --function-name $FN_DELIVERABLE_GENERATOR \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "gigId": "test-gig-001",
    "userId": "test-user-001",
    "type": "website",
    "title": "Austin'\''s Graduation Party",
    "content": "<h1>You'\''re Invited!</h1><p>Join us June 14 at 2pm at Zilker Park</p><p>RSVP to John at 555-123-4567</p>",
    "phone": "+15551234567",
    "_trace": {"traceId": "trc_manual_deliv_001", "requestId": "cli-test", "source": "manual-test"}
  }' \
  /tmp/deliverable-response.json

cat /tmp/deliverable-response.json | python3 -m json.tool
```

**Verify after:**

```bash
# Deliverable record in DynamoDB
aws dynamodb query \
  --table-name $TBL_DELIVERABLE \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values '{":g": {"S": "test-gig-001"}}'

# S3 object
aws s3 ls s3://$S3_BUCKET/deliverables/ --recursive

# Short code accessible (use the shortCode from the response)
curl -s -o /dev/null -w "%{http_code}" https://gigler.ai/<SHORT_CODE>

# CloudWatch logs
aws logs tail /aws/lambda/$FN_DELIVERABLE_GENERATOR --since 5m
```

**Expected response:**

```json
{
  "statusCode": 200,
  "deliverableId": "del-XXXX",
  "shortCode": "abc123",
  "publicUrl": "https://gigler.ai/abc123",
  "s3Key": "deliverables/test-gig-001/del-XXXX.html"
}
```

---

### 3.6 gigler-voice-bridge

**What it does:** Initiates outbound voice calls via Pipecat + Gemini Live for wake-up calls, check-ins, and consultations.

**How to invoke:**

```bash
aws lambda invoke \
  --function-name $FN_VOICE_BRIDGE \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "type": "wake_up",
    "userId": "test-user-001",
    "phone": "+15551234567",
    "_trace": {"traceId": "trc_manual_voice_001", "requestId": "cli-test", "source": "manual-test"}
  }' \
  /tmp/voice-bridge-response.json

cat /tmp/voice-bridge-response.json | python3 -m json.tool
```

**Other call types:**

```bash
# Check-in call
aws lambda invoke \
  --function-name $FN_VOICE_BRIDGE \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "type": "check_in",
    "userId": "test-user-001",
    "gigId": "test-gig-001",
    "phone": "+15551234567",
    "context": "Checking in on the birthday party planning"
  }' \
  /tmp/voice-checkin-response.json

# Voice consultation
aws lambda invoke \
  --function-name $FN_VOICE_BRIDGE \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "type": "consultation",
    "userId": "test-user-001",
    "gigId": "test-gig-001",
    "phone": "+15551234567"
  }' \
  /tmp/voice-consultation-response.json
```

**Verify after:**

```bash
# CloudWatch logs (check for Twilio call SID, Pipecat session)
aws logs tail /aws/lambda/$FN_VOICE_BRIDGE --since 5m

# If the phone is real, you should receive an actual call
```

**Expected response:**

```json
{
  "statusCode": 200,
  "callSid": "CAxxxxxxxxxx",
  "status": "initiated"
}
```

> **Warning:** This will initiate a real phone call if the phone number is valid and Twilio credentials are configured. Use a test phone number you control.

---

### 3.7 gigler-email-handler

**What it does:** Processes inbound emails to `gig@gigler.ai` (routed via SES Receipt Rules → SNS → Lambda). Extracts info, stores attachments, and notifies the gig thread via SMS.

**How to invoke:**

```bash
aws lambda invoke \
  --function-name $FN_EMAIL_HANDLER \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "Records": [{
      "ses": {
        "mail": {
          "source": "testuser@gmail.com",
          "destination": ["gig@gigler.ai"],
          "commonHeaders": {
            "from": ["Test User <testuser@gmail.com>"],
            "to": ["gig@gigler.ai"],
            "subject": "Restaurant confirmation for Saturday"
          }
        },
        "receipt": {
          "action": {
            "type": "Lambda"
          }
        }
      }
    }]
  }' \
  /tmp/email-handler-response.json

cat /tmp/email-handler-response.json | python3 -m json.tool
```

**With per-gig email address:**

```bash
aws lambda invoke \
  --function-name $FN_EMAIL_HANDLER \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "Records": [{
      "ses": {
        "mail": {
          "source": "testuser@gmail.com",
          "destination": ["abc123@gigler.ai"],
          "commonHeaders": {
            "from": ["Test User <testuser@gmail.com>"],
            "to": ["abc123@gigler.ai"],
            "subject": "Here is the hotel confirmation"
          }
        },
        "receipt": {
          "action": {
            "type": "Lambda"
          }
        }
      }
    }]
  }' \
  /tmp/email-gig-response.json
```

**Verify after:**

```bash
# Message record created
aws dynamodb scan \
  --table-name $TBL_MESSAGE \
  --filter-expression "contains(body, :b)" \
  --expression-attribute-values '{":b": {"S": "Restaurant confirmation"}}' \
  --limit 5

# CloudWatch logs (AI extraction, SMS notification)
aws logs tail /aws/lambda/$FN_EMAIL_HANDLER --since 5m
```

**Expected response:**

```json
{
  "statusCode": 200,
  "message": "Email processed",
  "gigId": "matched-gig-id",
  "extractedInfo": { "date": "Saturday", "type": "restaurant_confirmation" }
}
```

---

### 3.8 gigler-third-party-actions

**What it does:** Executes actions on external platforms (OpenTable, Resy, Evite, etc.) on behalf of users.

**How to invoke:**

```bash
aws lambda invoke \
  --function-name $FN_THIRD_PARTY_ACTIONS \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "gigId": "test-gig-001",
    "userId": "test-user-001",
    "platform": "opentable",
    "actionType": "search",
    "params": {
      "restaurant": "Uchi Austin",
      "time": "7:00 PM Saturday",
      "partySize": 4
    },
    "phone": "+15551234567",
    "_trace": {"traceId": "trc_manual_tpa_001", "requestId": "cli-test", "source": "manual-test"}
  }' \
  /tmp/third-party-response.json

cat /tmp/third-party-response.json | python3 -m json.tool
```

**Other platform/action combinations:**

```bash
# Evite: create event
aws lambda invoke \
  --function-name $FN_THIRD_PARTY_ACTIONS \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "gigId": "test-gig-001",
    "userId": "test-user-001",
    "platform": "evite",
    "actionType": "create_event",
    "params": {
      "title": "Austin'\''s Graduation Party",
      "date": "2026-06-14T14:00:00",
      "location": "Zilker Park, Austin TX",
      "guests": ["+15551111111", "+15552222222"]
    },
    "phone": "+15551234567"
  }' \
  /tmp/third-party-evite-response.json
```

**Verify after:**

```bash
# ThirdPartyAction record created
aws dynamodb query \
  --table-name $TBL_THIRD_PARTY_ACTION \
  --index-name byGig \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values '{":g": {"S": "test-gig-001"}}'

# CloudWatch logs
aws logs tail /aws/lambda/$FN_THIRD_PARTY_ACTIONS --since 5m
```

**Expected response:**

```json
{
  "statusCode": 200,
  "actionId": "tpa-XXXX",
  "platform": "opentable",
  "status": "pending",
  "results": [
    { "name": "Uchi Austin", "time": "7:00 PM", "available": true }
  ]
}
```

---

## 4. End-to-End Test Scenarios

### Scenario 1: New User Onboarding

Complete flow from first contact to first gig prompt.

```bash
# Step 1: Send "Hi" from a brand-new phone number
curl -s -X POST "$LAMBDA_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Hi&From=%2B15550010001&To=%2B15559876543&MessageSid=SMon001&AccountSid=ACtest123&NumMedia=0"

sleep 2

# Step 2: Verify User record created
aws dynamodb query \
  --table-name $TBL_USER \
  --index-name byPhone \
  --key-condition-expression "phone = :p" \
  --expression-attribute-values '{":p": {"S": "+15550010001"}}' \
  --query 'Items[0].{id: id.S, phone: phone.S, onboardingComplete: onboardingComplete.BOOL, name: name.S}'

# Step 3: Verify welcome message logged in Message table
aws dynamodb scan \
  --table-name $TBL_MESSAGE \
  --filter-expression "direction = :d" \
  --expression-attribute-values '{":d": {"S": "outbound"}}' \
  --limit 5 \
  --query 'Items[?contains(body.S, `Welcome`) || contains(body.S, `name`)].{body: body.S, direction: direction.S}'

# Step 4: Respond with a name
curl -s -X POST "$LAMBDA_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=I%27m+John&From=%2B15550010001&To=%2B15559876543&MessageSid=SMon002&AccountSid=ACtest123&NumMedia=0"

sleep 2

# Step 5: Verify User.name updated and onboardingComplete=true
aws dynamodb query \
  --table-name $TBL_USER \
  --index-name byPhone \
  --key-condition-expression "phone = :p" \
  --expression-attribute-values '{":p": {"S": "+15550010001"}}' \
  --query 'Items[0].{name: name.S, onboardingComplete: onboardingComplete.BOOL}'

# Step 6: Verify the prompt for the first gig is in the Message table
aws dynamodb scan \
  --table-name $TBL_MESSAGE \
  --filter-expression "direction = :d" \
  --expression-attribute-values '{":d": {"S": "outbound"}}' \
  --limit 10 \
  --query 'Items[?contains(body.S, `gig`) || contains(body.S, `Gig`) || contains(body.S, `help`)].body.S'
```

**Expected outcome:**
1. User record with `onboardingComplete: false` after "Hi"
2. Welcome message asking for name
3. User record updated with `name: "John"` and `onboardingComplete: true` after name response
4. Follow-up message prompting to create first gig

---

### Scenario 2: Create a Gig

Onboarded user creates a gig via SMS.

```bash
# Prerequisite: get the user ID from Scenario 1
USER_ID=$(aws dynamodb query \
  --table-name $TBL_USER \
  --index-name byPhone \
  --key-condition-expression "phone = :p" \
  --expression-attribute-values '{":p": {"S": "+15550010001"}}' \
  --query 'Items[0].id.S' \
  --output text)

echo "User ID: $USER_ID"

# Step 1: Send gig creation message
curl -s -X POST "$LAMBDA_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Plan+a+birthday+party+for+June+14&From=%2B15550010001&To=%2B15559876543&MessageSid=SMgig001&AccountSid=ACtest123&NumMedia=0"

sleep 3

# Step 2: Verify Gig record created
aws dynamodb query \
  --table-name $TBL_GIG \
  --index-name byOwner \
  --key-condition-expression "ownerId = :o" \
  --expression-attribute-values "{\":o\": {\"S\": \"$USER_ID\"}}" \
  --query 'Items[0].{id: id.S, title: title.S, status: status.S, type: type.S}'

# Step 3: Get the gig ID
GIG_ID=$(aws dynamodb query \
  --table-name $TBL_GIG \
  --index-name byOwner \
  --key-condition-expression "ownerId = :o" \
  --expression-attribute-values "{\":o\": {\"S\": \"$USER_ID\"}}" \
  --query 'Items[0].id.S' \
  --output text)

echo "Gig ID: $GIG_ID"

# Step 4: Verify GigParticipant record (owner)
aws dynamodb query \
  --table-name $TBL_GIG_PARTICIPANT \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values "{\":g\": {\"S\": \"$GIG_ID\"}}" \
  --query 'Items[].{userId: userId.S, role: role.S}'

# Step 5: Verify AI response in Message table
aws dynamodb query \
  --table-name $TBL_MESSAGE \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values "{\":g\": {\"S\": \"$GIG_ID\"}}" \
  --scan-index-forward false \
  --limit 5 \
  --query 'Items[].{body: body.S, messageType: messageType.S, direction: direction.S}'

# Step 6: Test gig-processor directly with the created gigId
aws lambda invoke \
  --function-name $FN_GIG_PROCESSOR \
  --cli-binary-format raw-in-base64-out \
  --payload "{
    \"gigId\": \"$GIG_ID\",
    \"userId\": \"$USER_ID\",
    \"message\": \"The party should be at Zilker Park. Budget is 500 dollars.\",
    \"phone\": \"+15550010001\",
    \"senderName\": \"John\"
  }" \
  /tmp/gig-processor-e2e.json

cat /tmp/gig-processor-e2e.json | python3 -m json.tool
```

---

### Scenario 3: Group Gig / Guest Participant

Add a guest to an existing gig.

```bash
# Prerequisite: GIG_ID and USER_ID from Scenario 2

# Step 1: Send "add participant" message
curl -s -X POST "$LAMBDA_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Add+Sabrina+555-123-4567+to+help+coordinate&From=%2B15550010001&To=%2B15559876543&MessageSid=SMgrp001&AccountSid=ACtest123&NumMedia=0"

sleep 3

# Step 2: Verify GigParticipant record for the guest
aws dynamodb query \
  --table-name $TBL_GIG_PARTICIPANT \
  --index-name byPhone \
  --key-condition-expression "phone = :p" \
  --expression-attribute-values '{":p": {"S": "+15551234567"}}' \
  --query 'Items[].{gigId: gigId.S, name: name.S, role: role.S}'

# Step 3: Verify the participant was added (check all participants for this gig)
aws dynamodb query \
  --table-name $TBL_GIG_PARTICIPANT \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values "{\":g\": {\"S\": \"$GIG_ID\"}}" \
  --query 'Items[].{userId: userId.S, name: name.S, role: role.S, phone: phone.S}'

# Step 4: Check CloudWatch for guest welcome SMS send
aws logs tail /aws/lambda/$FN_INBOUND_SMS --since 5m | grep -i "sabrina\|guest\|invite\|participant"
```

**Expected outcome:**
- GigParticipant record with `isGuest: true`, `name: "Sabrina"`, `phone: "+15551234567"`
- CloudWatch log showing guest welcome SMS queued/sent

---

### Scenario 4: Deliverable Generation

Create a shareable website deliverable.

```bash
# Step 1: Invoke deliverable-generator
aws lambda invoke \
  --function-name $FN_DELIVERABLE_GENERATOR \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "gigId": "test-gig-001",
    "userId": "test-user-001",
    "type": "website",
    "title": "Austin'\''s Graduation Party",
    "content": "<h1>You'\''re Invited!</h1><p>Join us June 14 at 2pm at Zilker Park, Austin TX</p><p>Bring your favorite dish to share!</p>",
    "phone": "+15551234567"
  }' \
  /tmp/deliverable-e2e.json

cat /tmp/deliverable-e2e.json | python3 -m json.tool

# Step 2: Extract the short code from the response
SHORT_CODE=$(python3 -c "import json; print(json.load(open('/tmp/deliverable-e2e.json'))['shortCode'])" 2>/dev/null || echo "CHECK_RESPONSE")
echo "Short code: $SHORT_CODE"

# Step 3: Verify Deliverable record in DynamoDB
aws dynamodb query \
  --table-name $TBL_DELIVERABLE \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values '{":g": {"S": "test-gig-001"}}' \
  --query 'Items[].{deliverableId: deliverableId.S, type: type.S, shortCode: shortCode.S, publicUrl: publicUrl.S}'

# Step 4: Verify S3 object created
aws s3 ls s3://$S3_BUCKET/deliverables/test-gig-001/ --recursive

# Step 5: Verify the short code URL is accessible
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "https://gigler.ai/$SHORT_CODE"
```

**Expected outcome:**
- Deliverable record with `type: "website"`, `shortCode`, and `publicUrl`
- HTML file in S3 at `deliverables/test-gig-001/`
- `https://gigler.ai/<shortCode>` returns HTTP 200

---

### Scenario 5: Reminder Flow

Create a reminder and verify it fires.

```bash
# Step 1: Insert a reminder due in 1 minute
SCHEDULED=$(date -u -v+1M +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "+1 minute" +%Y-%m-%dT%H:%M:%SZ)

aws dynamodb put-item \
  --table-name $TBL_REMINDER \
  --item "{
    \"id\": {\"S\": \"test-reminder-e2e\"},
    \"gigId\": {\"S\": \"test-gig-001\"},
    \"userId\": {\"S\": \"test-user-001\"},
    \"scheduledAt\": {\"S\": \"$SCHEDULED\"},
    \"type\": {\"S\": \"reminder\"},
    \"message\": {\"S\": \"Don't forget to confirm the venue for the birthday party!\"},
    \"channel\": {\"S\": \"sms\"},
    \"sent\": {\"BOOL\": false},
    \"createdAt\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}
  }"

echo "Reminder scheduled for: $SCHEDULED"

# Step 2: Wait for it to become due, then invoke the scheduler
sleep 65

aws lambda invoke \
  --function-name $FN_REMINDER_SCHEDULER \
  --cli-binary-format raw-in-base64-out \
  --payload '{}' \
  /tmp/reminder-e2e.json

cat /tmp/reminder-e2e.json | python3 -m json.tool

# Step 3: Verify reminder marked as sent
aws dynamodb get-item \
  --table-name $TBL_REMINDER \
  --key '{"id": {"S": "test-reminder-e2e"}}' \
  --query 'Item.{sent: sent.BOOL, message: message.S}'

# Step 4: Check CloudWatch for the SMS send attempt
aws logs tail /aws/lambda/$FN_REMINDER_SCHEDULER --since 10m | grep -i "send\|sms\|reminder"
```

**Expected outcome:**
- Reminder `sent` field flips to `true`
- CloudWatch shows SMS send attempt to the user's phone

> **Alternative:** Instead of waiting, you can set `scheduledAt` to a time in the past and invoke the scheduler immediately.

---

### Scenario 6: Email Inbound

Process an email forwarded to `gig@gigler.ai`.

```bash
# Step 1: Invoke email-handler with SES notification payload
aws lambda invoke \
  --function-name $FN_EMAIL_HANDLER \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "Records": [{
      "ses": {
        "mail": {
          "source": "testuser@gmail.com",
          "destination": ["gig@gigler.ai"],
          "commonHeaders": {
            "from": ["Test User <testuser@gmail.com>"],
            "to": ["gig@gigler.ai"],
            "subject": "Restaurant confirmation for Saturday"
          }
        },
        "receipt": {
          "action": {
            "type": "Lambda"
          }
        }
      }
    }]
  }' \
  /tmp/email-e2e.json

cat /tmp/email-e2e.json | python3 -m json.tool

# Step 2: Verify Message record created
aws dynamodb scan \
  --table-name $TBL_MESSAGE \
  --filter-expression "contains(body, :b)" \
  --expression-attribute-values '{":b": {"S": "Restaurant confirmation"}}' \
  --limit 5 \
  --query 'Items[].{gigId: gigId.S, body: body.S, messageType: messageType.S}'

# Step 3: Check CloudWatch for AI extraction and SMS notification
aws logs tail /aws/lambda/$FN_EMAIL_HANDLER --since 5m
```

**Expected outcome:**
- Message record with `messageType: "email"` or similar
- CloudWatch logs showing AI extraction of date ("Saturday"), type ("restaurant_confirmation")
- SMS notification sent to gig participants

---

## 5. Smart Gig Routing Tests

Smart gig routing uses Gemini to determine which gig an inbound message relates to when a user owns/participates in multiple gigs.

### 5.1 Automated Script

```bash
./scripts/test-e2e.sh routing
```

This runs 5 scenarios with automatic DynamoDB setup/teardown:

1. **Unambiguous routing** -- "Add decorations to the birthday party" routes to the party gig
2. **Ambiguous message** -- "What's the status?" triggers disambiguation or AI auto-routes
3. **Single-gig auto-route** -- User with one gig always routes there
4. **Participant routing** -- A collaborator's message routes to their participated gig
5. **List gigs multi-role** -- "list my gigs" shows owned + participated gigs with roles

### 5.2 Manual Testing: Multi-Gig Setup

To test manually, first create test data:

```bash
# Create two gigs for the same user
aws dynamodb put-item --region us-east-2 \
  --table-name $TBL_GIG \
  --item '{
    "id": {"S": "gig_test_party"},
    "ownerId": {"S": "<USER_ID>"},
    "title": {"S": "Birthday Party Planning"},
    "status": {"S": "active"},
    "type": {"S": "event"},
    "createdAt": {"S": "2026-04-06T00:00:00Z"},
    "updatedAt": {"S": "2026-04-06T00:00:00Z"}
  }'

aws dynamodb put-item --region us-east-2 \
  --table-name $TBL_GIG \
  --item '{
    "id": {"S": "gig_test_website"},
    "ownerId": {"S": "<USER_ID>"},
    "title": {"S": "Website Redesign"},
    "status": {"S": "active"},
    "type": {"S": "project"},
    "createdAt": {"S": "2026-04-06T00:00:00Z"},
    "updatedAt": {"S": "2026-04-06T00:00:00Z"}
  }'
```

Then send test messages via the Lambda Function URL:

```bash
# Party-specific message (should route to party gig)
curl -s -X POST "$LAMBDA_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=What+venue+should+we+book+for+the+party&From=%2B1YOURPHONE&To=%2B16508351235&MessageSid=SMroutingtest1&AccountSid=ACtest&NumMedia=0"

# Ambiguous message (should trigger disambiguation)
curl -s -X POST "$LAMBDA_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=What%27s+the+status&From=%2B1YOURPHONE&To=%2B16508351235&MessageSid=SMroutingtest2&AccountSid=ACtest&NumMedia=0"
```

### 5.3 What to Verify

- **Single gig**: Auto-routes without AI selection call
- **Multiple gigs + clear context**: AI picks the correct gig (check CloudWatch for `selectGigByContext`)
- **Ambiguous message**: User receives disambiguation prompt listing all gigs with roles
- **Participant gigs**: GigParticipant records (via `byPhone` GSI) are included in routing
- **List gigs**: Shows both owned gigs and collaborated gigs with role labels

### 5.4 CloudWatch Log Patterns

```bash
# Smart routing decision
aws logs filter-log-events \
  --log-group-name /aws/lambda/$FN_INBOUND_SMS \
  --filter-pattern "selectGigByContext" \
  --start-time $(date -v-30M +%s000 2>/dev/null || date -d "-30 minutes" +%s000) \
  --region us-east-2

# Disambiguation prompt sent
aws logs filter-log-events \
  --log-group-name /aws/lambda/$FN_INBOUND_SMS \
  --filter-pattern "disambiguation" \
  --start-time $(date -v-30M +%s000 2>/dev/null || date -d "-30 minutes" +%s000) \
  --region us-east-2
```

---

## 6. Group MMS / Conversations Tests

Group MMS uses Twilio Conversations with projected addresses to create native group threads between the gig owner, participants, and the Gigler AI.

### 6.1 Add Participant (Lambda Invocation)

```bash
./scripts/test-e2e.sh group
```

Or invoke directly:

```bash
aws lambda invoke --region us-east-2 \
  --function-name $FN_GIG_PROCESSOR \
  --cli-binary-format raw-in-base64-out \
  --payload '{
    "gigId": "<GIG_ID>",
    "userId": "<USER_ID>",
    "message": "Add Sarah 4154049816",
    "phone": "+12812419268",
    "senderName": "Albert",
    "_trace": {"traceId": "trc_group_test_001", "requestId": "cli-test", "source": "manual-test"}
  }' \
  /tmp/group-test.json

cat /tmp/group-test.json | python3 -m json.tool
```

**Verify after:**

```bash
# GigParticipant records for the gig
aws dynamodb query --region us-east-2 \
  --table-name $TBL_GIG_PARTICIPANT \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values '{":g": {"S": "<GIG_ID>"}}' \
  --query 'Items[].{name: name.S, role: role.S, phone: phone.S}'

# Conversation SID stored on the Gig record
aws dynamodb get-item --region us-east-2 \
  --table-name $TBL_GIG \
  --key '{"id": {"S": "<GIG_ID>"}}' \
  --query 'Item.conversationSid.S'
```

### 6.2 Conversations Webhook (HTTP)

The `gigler-gig-processor` has a Function URL that receives Twilio Conversations `onMessageAdded` webhooks.

```bash
./scripts/test-e2e.sh webhook
```

Or manually:

```bash
# Human message in group thread
curl -s -X POST "$GIG_PROCESSOR_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "EventType=onMessageAdded&ConversationSid=<CONV_SID>&Author=%2B14154049816&Body=What+should+I+bring&ParticipantSid=MBtest&AccountSid=ACtest&ChatServiceSid=ISa0adeb5a89ec4845995ada16d44a99a6&MessageSid=IMtest"

# Gigler-authored message (should be ignored to prevent loops)
curl -s -X POST "$GIG_PROCESSOR_URL" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "EventType=onMessageAdded&ConversationSid=<CONV_SID>&Author=%2B16508351235&Body=Here+are+suggestions&ParticipantSid=MBtest2&AccountSid=ACtest&ChatServiceSid=ISa0adeb5a89ec4845995ada16d44a99a6&MessageSid=IMtest2"
```

### 6.3 AI Respond/Silent Behavior

In group threads, the AI uses a smart prompt to decide whether to respond or stay silent:

- **RESPOND: true** -- Message is directed at the AI, asks a question, or requests help
- **RESPOND: false** -- Participants are talking to each other, casual side conversation

**How to test:**

1. Send a direct question: "Gigler, what's the party budget?" -- AI should respond
2. Send a human-to-human message: "Hey Sarah, are you free Saturday?" -- AI should stay silent
3. Send a planning request: "Can we add a DJ to the checklist?" -- AI should respond

**CloudWatch verification:**

```bash
# Check respond/silent decisions
aws logs filter-log-events \
  --log-group-name /aws/lambda/$FN_GIG_PROCESSOR \
  --filter-pattern "RESPOND" \
  --start-time $(date -v-30M +%s000 2>/dev/null || date -d "-30 minutes" +%s000) \
  --region us-east-2
```

### 6.4 What to Verify

| Check | How |
|-------|-----|
| GigParticipant record created | Query by gigId |
| Conversation created in Twilio | `conversationSid` on Gig record |
| Owner added as participant | GigParticipant with role=owner |
| New participant added | GigParticipant with role=collaborator |
| Welcome SMS to new participant | Check Twilio message logs or CloudWatch |
| Gigler projected address | Conversation has Gigler number as projected address |
| Webhook processes human messages | HTTP 200 from gig-processor Function URL |
| Webhook ignores Gigler messages | HTTP 200 but no AI response generated |
| AI responds when addressed | CloudWatch shows RESPOND: true |
| AI stays silent for side chat | CloudWatch shows RESPOND: false |

---

## 7. DynamoDB Verification Commands

### List All Gigler Tables

```bash
aws dynamodb list-tables \
  --query 'TableNames[?contains(@, `User`) || contains(@, `Gig`) || contains(@, `Message`) || contains(@, `Media`) || contains(@, `Deliverable`) || contains(@, `Reminder`) || contains(@, `ThirdParty`) || contains(@, `Integration`) || contains(@, `Participant`)]' \
  --output table
```

### Quick Scan (any table, debugging only)

```bash
aws dynamodb scan --table-name <TABLE_NAME> --limit 5
```

---

### User Table

```bash
# By primary key (id)
aws dynamodb get-item \
  --table-name $TBL_USER \
  --key '{"id": {"S": "<USER_ID>"}}'

# By phone (GSI: byPhone)
aws dynamodb query \
  --table-name $TBL_USER \
  --index-name byPhone \
  --key-condition-expression "phone = :p" \
  --expression-attribute-values '{":p": {"S": "+15551234567"}}'

# By email (GSI: byEmail)
aws dynamodb query \
  --table-name $TBL_USER \
  --index-name byEmail \
  --key-condition-expression "email = :e" \
  --expression-attribute-values '{":e": {"S": "testuser@gmail.com"}}'
```

### Gig Table

```bash
# By primary key (id)
aws dynamodb get-item \
  --table-name $TBL_GIG \
  --key '{"id": {"S": "<GIG_ID>"}}'

# By owner (GSI: byOwner)
aws dynamodb query \
  --table-name $TBL_GIG \
  --index-name byOwner \
  --key-condition-expression "ownerId = :o" \
  --expression-attribute-values '{":o": {"S": "<USER_ID>"}}'

# By short code (GSI: byShortCode)
aws dynamodb query \
  --table-name $TBL_GIG \
  --index-name byShortCode \
  --key-condition-expression "shortCode = :s" \
  --expression-attribute-values '{":s": {"S": "abc123"}}'

# By Twilio Conversation SID (GSI: byConversationSid)
aws dynamodb query \
  --table-name $TBL_GIG \
  --index-name byConversationSid \
  --key-condition-expression "conversationSid = :c" \
  --expression-attribute-values '{":c": {"S": "CHxxxxxxxxx"}}'
```

### GigParticipant Table

```bash
# By gigId + userId (composite primary key)
aws dynamodb get-item \
  --table-name $TBL_GIG_PARTICIPANT \
  --key '{"gigId": {"S": "<GIG_ID>"}, "userId": {"S": "<USER_ID>"}}'

# All participants for a gig (partition key query)
aws dynamodb query \
  --table-name $TBL_GIG_PARTICIPANT \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values '{":g": {"S": "<GIG_ID>"}}'

# By userId (GSI: byUserId) -- all gigs a user participates in
aws dynamodb query \
  --table-name $TBL_GIG_PARTICIPANT \
  --index-name byUserId \
  --key-condition-expression "userId = :u" \
  --expression-attribute-values '{":u": {"S": "<USER_ID>"}}'

# By phone (GSI: byPhone) -- find guest participants
aws dynamodb query \
  --table-name $TBL_GIG_PARTICIPANT \
  --index-name byPhone \
  --key-condition-expression "phone = :p" \
  --expression-attribute-values '{":p": {"S": "+15551234567"}}'
```

### Message Table

```bash
# By gigId (partition key), most recent first
aws dynamodb query \
  --table-name $TBL_MESSAGE \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values '{":g": {"S": "<GIG_ID>"}}' \
  --scan-index-forward false \
  --limit 10

# By gigId + timestamp range
aws dynamodb query \
  --table-name $TBL_MESSAGE \
  --key-condition-expression "gigId = :g AND #ts BETWEEN :start AND :end" \
  --expression-attribute-names '{"#ts": "timestamp"}' \
  --expression-attribute-values '{
    ":g": {"S": "<GIG_ID>"},
    ":start": {"S": "2026-04-01T00:00:00Z"},
    ":end": {"S": "2026-04-30T23:59:59Z"}
  }'
```

### Media Table

```bash
# By gigId (partition key)
aws dynamodb query \
  --table-name $TBL_MEDIA \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values '{":g": {"S": "<GIG_ID>"}}'

# By gigId + mediaId (composite key)
aws dynamodb get-item \
  --table-name $TBL_MEDIA \
  --key '{"gigId": {"S": "<GIG_ID>"}, "mediaId": {"S": "<MEDIA_ID>"}}'
```

### Deliverable Table

```bash
# By gigId (partition key)
aws dynamodb query \
  --table-name $TBL_DELIVERABLE \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values '{":g": {"S": "<GIG_ID>"}}'

# By short code (GSI: byShortCode)
aws dynamodb query \
  --table-name $TBL_DELIVERABLE \
  --index-name byShortCode \
  --key-condition-expression "shortCode = :s" \
  --expression-attribute-values '{":s": {"S": "abc123"}}'
```

### Reminder Table

```bash
# By primary key (id)
aws dynamodb get-item \
  --table-name $TBL_REMINDER \
  --key '{"id": {"S": "<REMINDER_ID>"}}'

# By gigId (GSI: byGig)
aws dynamodb query \
  --table-name $TBL_REMINDER \
  --index-name byGig \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values '{":g": {"S": "<GIG_ID>"}}'

# By scheduledAt (GSI: byScheduledAt) -- find due reminders
aws dynamodb query \
  --table-name $TBL_REMINDER \
  --index-name byScheduledAt \
  --key-condition-expression "scheduledAt <= :now" \
  --filter-expression "sent = :f" \
  --expression-attribute-values '{
    ":now": {"S": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"},
    ":f": {"BOOL": false}
  }'
```

### ThirdPartyAction Table

```bash
# By primary key (id)
aws dynamodb get-item \
  --table-name $TBL_THIRD_PARTY_ACTION \
  --key '{"id": {"S": "<ACTION_ID>"}}'

# By gigId (GSI: byGig)
aws dynamodb query \
  --table-name $TBL_THIRD_PARTY_ACTION \
  --index-name byGig \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values '{":g": {"S": "<GIG_ID>"}}'

# By status (GSI: byStatus) -- find pending actions
aws dynamodb query \
  --table-name $TBL_THIRD_PARTY_ACTION \
  --index-name byStatus \
  --key-condition-expression "#s = :s" \
  --expression-attribute-names '{"#s": "status"}' \
  --expression-attribute-values '{":s": {"S": "pending"}}'
```

### UserIntegration Table

```bash
# By primary key (id)
aws dynamodb get-item \
  --table-name $TBL_USER_INTEGRATION \
  --key '{"id": {"S": "<INTEGRATION_ID>"}}'

# By userId (GSI: byUserId)
aws dynamodb query \
  --table-name $TBL_USER_INTEGRATION \
  --index-name byUserId \
  --key-condition-expression "userId = :u" \
  --expression-attribute-values '{":u": {"S": "<USER_ID>"}}'
```

---

## 8. CloudWatch Log Monitoring

### Tail Logs in Real-Time

```bash
# Follow logs for a specific Lambda (last 5 minutes onward)
aws logs tail /aws/lambda/$FN_INBOUND_SMS --follow --since 5m
aws logs tail /aws/lambda/$FN_GIG_PROCESSOR --follow --since 5m
aws logs tail /aws/lambda/$FN_REMINDER_SCHEDULER --follow --since 5m
aws logs tail /aws/lambda/$FN_MEDIA_PROCESSOR --follow --since 5m
aws logs tail /aws/lambda/$FN_DELIVERABLE_GENERATOR --follow --since 5m
aws logs tail /aws/lambda/$FN_VOICE_BRIDGE --follow --since 5m
aws logs tail /aws/lambda/$FN_EMAIL_HANDLER --follow --since 5m
aws logs tail /aws/lambda/$FN_THIRD_PARTY_ACTIONS --follow --since 5m
```

### Search for Errors

```bash
# Find ERROR entries in a specific Lambda
aws logs filter-log-events \
  --log-group-name /aws/lambda/$FN_INBOUND_SMS \
  --filter-pattern "ERROR" \
  --start-time $(date -v-1H +%s000 2>/dev/null || date -d "-1 hour" +%s000)

# Find all errors across all Gigler Lambdas (last hour)
for fn in $FN_INBOUND_SMS $FN_GIG_PROCESSOR $FN_REMINDER_SCHEDULER $FN_MEDIA_PROCESSOR $FN_DELIVERABLE_GENERATOR $FN_VOICE_BRIDGE $FN_EMAIL_HANDLER $FN_THIRD_PARTY_ACTIONS; do
  echo "=== $fn ==="
  aws logs filter-log-events \
    --log-group-name /aws/lambda/$fn \
    --filter-pattern "ERROR" \
    --start-time $(date -v-1H +%s000 2>/dev/null || date -d "-1 hour" +%s000) \
    --query 'events[].message' \
    --output text 2>/dev/null || echo "(no log group or no errors)"
  echo ""
done
```

### Search for Specific Terms

```bash
# Find Twilio-related issues
aws logs filter-log-events \
  --log-group-name /aws/lambda/$FN_INBOUND_SMS \
  --filter-pattern "Twilio" \
  --start-time $(date -v-1H +%s000 2>/dev/null || date -d "-1 hour" +%s000)

# Find Gemini API calls
aws logs filter-log-events \
  --log-group-name /aws/lambda/$FN_GIG_PROCESSOR \
  --filter-pattern "gemini" \
  --start-time $(date -v-1H +%s000 2>/dev/null || date -d "-1 hour" +%s000)

# Find a specific phone number
aws logs filter-log-events \
  --log-group-name /aws/lambda/$FN_INBOUND_SMS \
  --filter-pattern "15551234567" \
  --start-time $(date -v-1H +%s000 2>/dev/null || date -d "-1 hour" +%s000)
```

### Check Lambda Invocation Metrics

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=$FN_INBOUND_SMS \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d "-1 hour" +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum \
  --query 'Datapoints[*].{Time: Timestamp, Count: Sum}' \
  --output table
```

### 8.5 Structured Tracing & CloudWatch Logs Insights

Every Lambda emits structured JSON logs with a consistent schema. A single `traceId` follows a request from the entry-point Lambda through every downstream Lambda it invokes, making it possible to reconstruct the full execution chain.

#### Trace Propagation

```
User SMS → gigler-inbound-sms  (generates traceId, passes _trace in payload)
                ├──→ gigler-gig-processor     (inherits traceId, passes _trace)
                │        ├──→ gigler-media-processor         (inherits traceId)
                │        ├──→ gigler-deliverable-generator   (inherits traceId)
                │        └──→ gigler-third-party-actions     (inherits traceId)
                └──→ gigler-media-processor   (inherits traceId)

EventBridge  → gigler-reminder-scheduler  (generates traceId)
                └──→ gigler-voice-bridge  (inherits traceId)

SES / SNS    → gigler-email-handler       (generates traceId)
```

Entry-point Lambdas (`inbound-sms`, `reminder-scheduler`, `email-handler`) generate a `traceId`. Downstream Lambdas receive it via the `_trace` field in the invocation payload and use the same `traceId` in all their logs.

When invoking a Lambda manually for testing, you can supply your own `_trace` to make log correlation trivial:

```json
"_trace": {"traceId": "trc_manual_test_001", "requestId": "cli-test", "source": "manual-test"}
```

#### Log Entry Schema

Every structured log entry is a single JSON line with these fields:

| Field       | Type   | Description                                                 |
|-------------|--------|-------------------------------------------------------------|
| `level`     | string | `INFO`, `WARN`, or `ERROR`                                  |
| `ts`        | string | ISO 8601 timestamp of the log entry                         |
| `traceId`   | string | Unique per inbound request; follows the entire Lambda chain  |
| `requestId` | string | AWS Lambda request ID (unique per invocation)                |
| `source`    | string | Which Lambda emitted the log (e.g. `gigler-gig-processor`)  |
| `gigId`     | string | The gig being processed (when available)                     |
| `userId`    | string | The user involved (when available)                           |
| `phone`     | string | Masked to last 4 digits (`***1234`) for privacy             |
| `message`   | string | Human-readable log message                                   |
| `data`      | object | Structured payload with contextual details (optional)        |

Example log entry:

```json
{
  "level": "INFO",
  "ts": "2026-04-06T22:15:03.412Z",
  "traceId": "trc_m1abc2_x9k3f1",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "source": "gigler-gig-processor",
  "gigId": "gig_1743984000_abc123",
  "userId": "usr_1743900000_def456",
  "phone": "***4567",
  "message": "Executing actions from AI response",
  "data": { "actionCount": 2, "actionTypes": ["generate_image", "set_reminder"] }
}
```

#### CloudWatch Logs Insights Queries

Run these in the [CloudWatch Logs Insights console](https://console.aws.amazon.com/cloudwatch/home#logsV2:logs-insights). Select all `/aws/lambda/gigler-*` log groups to search across the full chain.

**Trace a full request chain (SMS → gig-processor → downstream):**

```sql
fields @timestamp, source, message, gigId, userId, data
| filter traceId = "trc_manual_test_001"
| sort @timestamp asc
```

**All activity for a specific gig:**

```sql
fields @timestamp, source, message, traceId, data
| filter gigId = "gig_1743984000_abc123"
| sort @timestamp desc
| limit 100
```

**All activity for a specific user (by masked phone):**

```sql
fields @timestamp, source, message, gigId, traceId
| filter phone = "***4567"
| sort @timestamp desc
| limit 50
```

**All errors across all Lambdas:**

```sql
fields @timestamp, source, message, gigId, userId, data
| filter level = "ERROR"
| sort @timestamp desc
| limit 50
```

**Find slow invocations (over 5 seconds between entry and last log):**

```sql
stats min(@timestamp) as started, max(@timestamp) as ended, count(*) as logCount
  by traceId, source
| filter ended - started > 5000
| sort ended - started desc
```

**Action execution breakdown (what actions is the AI triggering?):**

```sql
fields @timestamp, gigId, data.actionTypes, data.actionCount
| filter source = "gigler-gig-processor" and message = "Executing actions from AI response"
| sort @timestamp desc
| limit 50
```

**Count invocations per Lambda per hour:**

```sql
stats count(*) as invocations by source, bin(1h) as hour
| filter message like /invoked|Processing|Triggered|event received/
| sort hour desc
```

**Find a specific inbound SMS and trace its full journey:**

```sql
fields @timestamp, source, message, gigId, data
| filter traceId in (
    fields traceId | filter source = "gigler-inbound-sms" and message = "Parsed webhook" and data.messageSid = "SMxxxx"
  )
| sort @timestamp asc
```

#### Using `aws logs filter-log-events` from the CLI

For quick CLI-based log searches using the structured JSON fields:

```bash
# Find all logs for a specific traceId
aws logs filter-log-events \
  --log-group-name /aws/lambda/$FN_GIG_PROCESSOR \
  --filter-pattern '{ $.traceId = "trc_manual_test_001" }' \
  --start-time $(date -v-1H +%s000 2>/dev/null || date -d "-1 hour" +%s000) \
  --query 'events[].message' \
  --output text

# Find all ERROR-level logs across a Lambda
aws logs filter-log-events \
  --log-group-name /aws/lambda/$FN_INBOUND_SMS \
  --filter-pattern '{ $.level = "ERROR" }' \
  --start-time $(date -v-1H +%s000 2>/dev/null || date -d "-1 hour" +%s000)

# Find all logs for a specific gigId
aws logs filter-log-events \
  --log-group-name /aws/lambda/$FN_GIG_PROCESSOR \
  --filter-pattern '{ $.gigId = "gig_1743984000_abc123" }' \
  --start-time $(date -v-1H +%s000 2>/dev/null || date -d "-1 hour" +%s000)

# Find all logs involving a specific phone (masked)
aws logs filter-log-events \
  --log-group-name /aws/lambda/$FN_INBOUND_SMS \
  --filter-pattern '{ $.phone = "***4567" }' \
  --start-time $(date -v-1H +%s000 2>/dev/null || date -d "-1 hour" +%s000)
```

> **Note:** Phone numbers are masked in logs for privacy. Only the last 4 digits are stored (e.g. `***4567`). To correlate a full phone number with its masked form, take the last 4 digits and search for `***XXXX`.

---

## 9. S3 Verification

### Find the Media Bucket

```bash
aws s3 ls | grep gigler
```

### List Media Files

```bash
# All media
aws s3 ls s3://$S3_BUCKET/media/ --recursive --human-readable

# Media for a specific gig
aws s3 ls s3://$S3_BUCKET/media/test-gig-001/ --recursive --human-readable
```

### List Deliverables

```bash
# All deliverables
aws s3 ls s3://$S3_BUCKET/deliverables/ --recursive --human-readable

# Deliverables for a specific gig
aws s3 ls s3://$S3_BUCKET/deliverables/test-gig-001/ --recursive --human-readable
```

### Download and Inspect a File

```bash
# Download a deliverable to inspect
aws s3 cp s3://$S3_BUCKET/deliverables/test-gig-001/del-XXXX.html /tmp/deliverable-check.html
open /tmp/deliverable-check.html  # macOS
```

### Check Bucket Policy and CORS

```bash
# Bucket policy
aws s3api get-bucket-policy --bucket $S3_BUCKET --output text | python3 -m json.tool

# CORS configuration
aws s3api get-bucket-cors --bucket $S3_BUCKET
```

---

## 10. Frontend Verification Checklist

Run through these manually after each deploy.

### Page Load Tests

| URL | What to Verify |
|-----|----------------|
| `https://gigler.ai` | Landing page loads, rolodex animation plays, sign-up CTA visible |
| `https://gigler.ai/examples` | Categories render, anchor links work, example conversations display |
| `https://gigler.ai/pricing` | All 4 tiers display (Free, Pro, Team, Enterprise), prices correct |
| `https://gigler.ai/dashboard` | Redirects to login page (unauthenticated) |
| `https://gigler.ai/<shortCode>` | Deliverable page loads with correct content (after creating one) |

### SEO Verification

```bash
# Check JSON-LD structured data
curl -s https://gigler.ai | grep -o '<script type="application/ld+json">.*</script>' | python3 -m json.tool

# Check OG tags
curl -s https://gigler.ai | grep -E 'og:|twitter:' | head -20

# Check meta tags
curl -s https://gigler.ai | grep -E '<meta name="(description|keywords)' | head -5

# Check robots.txt
curl -s https://gigler.ai/robots.txt

# Check sitemap
curl -s https://gigler.ai/sitemap.xml | head -30
```

### Social Preview Testing

- **Facebook / iMessage**: https://developers.facebook.com/tools/debug/ → enter `https://gigler.ai`
- **Twitter Card**: https://cards-dev.twitter.com/validator → enter `https://gigler.ai`
- **LinkedIn**: https://www.linkedin.com/post-inspector/ → enter `https://gigler.ai`

### Performance

```bash
# Lighthouse CLI (if installed)
npx lighthouse https://gigler.ai --output=json --quiet | python3 -c "
import sys, json
r = json.load(sys.stdin)['categories']
for k in ['performance','accessibility','best-practices','seo']:
    print(f\"{k}: {r[k]['score']*100:.0f}\")
"
```

### Deliverable Short URL Test

After creating a deliverable in Scenario 4:

```bash
# Verify redirect / page load
curl -sL -o /dev/null -w "Final URL: %{url_effective}\nHTTP: %{http_code}\n" "https://gigler.ai/<SHORT_CODE>"

# Verify OG tags on deliverable page
curl -s "https://gigler.ai/<SHORT_CODE>" | grep -E 'og:title|og:description|og:image'
```

---

## 11. Troubleshooting Guide

### "Function not found" / ResourceNotFoundException

```bash
# List all functions to find the correct name (Amplify appends random suffixes)
aws lambda list-functions \
  --query 'Functions[?contains(FunctionName, `gigler`)].FunctionName' \
  --output table
```

### "AccessDenied" on DynamoDB

The Lambda's execution role doesn't have permission to the table. Check the `backend.ts` resource grants:

```bash
# Check the Lambda's role and attached policies
aws lambda get-function-configuration \
  --function-name $FN_INBOUND_SMS \
  --query 'Role' \
  --output text

# Then check that role's policies
aws iam list-attached-role-policies --role-name <ROLE_NAME>
aws iam list-role-policies --role-name <ROLE_NAME>
```

### "Missing environment variable"

```bash
# Check all env vars for a function
aws lambda get-function-configuration \
  --function-name $FN_INBOUND_SMS \
  --query 'Environment.Variables' \
  --output table

# Required env vars for each function:
# All:            REGION, USER_TABLE, GIG_TABLE, MESSAGE_TABLE
# inbound-sms:    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, GIGLER_NUMBER, GEMINI_API_KEY
# gig-processor:  GEMINI_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
# media-processor: GEMINI_API_KEY, S3_BUCKET, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
# voice-bridge:   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, GEMINI_API_KEY
# email-handler:  GEMINI_API_KEY, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
# deliverable:    S3_BUCKET, CLOUDFRONT_DOMAIN
```

### Twilio Webhook Returns 502

The Lambda is crashing before returning a response. Check CloudWatch:

```bash
aws logs tail /aws/lambda/$FN_INBOUND_SMS --since 10m | head -50
```

Common causes:
- Missing env vars (see above)
- DynamoDB permission denied (see above)
- Timeout (Lambda default is 3s, may need 30s+)
- Handler crash on payload parsing

Check the function timeout:

```bash
aws lambda get-function-configuration \
  --function-name $FN_INBOUND_SMS \
  --query '{Timeout: Timeout, MemorySize: MemorySize}'
```

### No SMS Received

```bash
# Verify Twilio credentials are set
aws lambda get-function-configuration \
  --function-name $FN_INBOUND_SMS \
  --query 'Environment.Variables.{SID: TWILIO_ACCOUNT_SID, NUMBER: GIGLER_NUMBER}' \
  --output table

# Check CloudWatch for Twilio send errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/$FN_INBOUND_SMS \
  --filter-pattern "Twilio ERROR send" \
  --start-time $(date -v-1H +%s000 2>/dev/null || date -d "-1 hour" +%s000)
```

### Gemini AI Not Responding

```bash
# Verify API key is set
aws lambda get-function-configuration \
  --function-name $FN_GIG_PROCESSOR \
  --query 'Environment.Variables.GEMINI_API_KEY'

# Check for Gemini-specific errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/$FN_GIG_PROCESSOR \
  --filter-pattern "gemini 429 quota error" \
  --start-time $(date -v-1H +%s000 2>/dev/null || date -d "-1 hour" +%s000)
```

### EventBridge Not Triggering Reminder Scheduler

```bash
# List EventBridge rules
aws events list-rules --query 'Rules[?contains(Name, `gigler`) || contains(Name, `reminder`)]'

# Check if the rule is enabled
aws events describe-rule --name <RULE_NAME>

# Check targets
aws events list-targets-by-rule --rule <RULE_NAME>
```

### SES Not Routing Emails to Lambda

```bash
# Check SES receipt rules
aws ses describe-active-receipt-rule-set

# Verify the rule routes to the correct Lambda
aws ses describe-receipt-rule-set \
  --rule-set-name <RULE_SET_NAME> \
  --query 'Rules[?contains(Name, `gigler`)]'
```

---

## 12. Test Reset / Cleanup Commands

### Delete a Specific User

```bash
# First, find the user ID
USER_ID=$(aws dynamodb query \
  --table-name $TBL_USER \
  --index-name byPhone \
  --key-condition-expression "phone = :p" \
  --expression-attribute-values '{":p": {"S": "+15550010001"}}' \
  --query 'Items[0].id.S' \
  --output text)

# Delete the user
aws dynamodb delete-item \
  --table-name $TBL_USER \
  --key "{\"id\": {\"S\": \"$USER_ID\"}}"
```

### Delete All Messages for a Gig

```bash
# Fetch all message keys for the gig, then batch-delete
GIG_ID="test-gig-001"

aws dynamodb query \
  --table-name $TBL_MESSAGE \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values "{\":g\": {\"S\": \"$GIG_ID\"}}" \
  --projection-expression "gigId, #ts" \
  --expression-attribute-names '{"#ts": "timestamp"}' \
  --query 'Items[]' \
  --output json | python3 -c "
import json, sys, subprocess
items = json.load(sys.stdin)
for item in items:
    key = json.dumps({'gigId': item['gigId'], 'timestamp': item['timestamp']})
    subprocess.run([
        'aws', 'dynamodb', 'delete-item',
        '--table-name', '$TBL_MESSAGE',
        '--key', key
    ])
    print(f\"Deleted message at {item['timestamp']['S']}\")
print(f'Deleted {len(items)} messages')
"
```

### Delete a Gig and All Related Records

```bash
GIG_ID="test-gig-001"

# Delete gig
aws dynamodb delete-item \
  --table-name $TBL_GIG \
  --key "{\"id\": {\"S\": \"$GIG_ID\"}}"

# Delete all participants
aws dynamodb query \
  --table-name $TBL_GIG_PARTICIPANT \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values "{\":g\": {\"S\": \"$GIG_ID\"}}" \
  --projection-expression "gigId, userId" \
  --output json \
  --query 'Items[]' | python3 -c "
import json, sys, subprocess
for item in json.load(sys.stdin):
    subprocess.run(['aws', 'dynamodb', 'delete-item',
        '--table-name', '$TBL_GIG_PARTICIPANT',
        '--key', json.dumps({'gigId': item['gigId'], 'userId': item['userId']})])
print('Deleted participants')
"

# Delete all messages (see above)

# Delete all deliverables
aws dynamodb query \
  --table-name $TBL_DELIVERABLE \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values "{\":g\": {\"S\": \"$GIG_ID\"}}" \
  --projection-expression "gigId, deliverableId" \
  --output json \
  --query 'Items[]' | python3 -c "
import json, sys, subprocess
for item in json.load(sys.stdin):
    subprocess.run(['aws', 'dynamodb', 'delete-item',
        '--table-name', '$TBL_DELIVERABLE',
        '--key', json.dumps({'gigId': item['gigId'], 'deliverableId': item['deliverableId']})])
print('Deleted deliverables')
"

# Delete S3 objects for the gig
aws s3 rm s3://$S3_BUCKET/media/$GIG_ID/ --recursive
aws s3 rm s3://$S3_BUCKET/deliverables/$GIG_ID/ --recursive

echo "Gig $GIG_ID fully cleaned up."
```

### Delete a Specific Reminder

```bash
aws dynamodb delete-item \
  --table-name $TBL_REMINDER \
  --key '{"id": {"S": "test-reminder-001"}}'
```

### Delete All ThirdPartyActions for a Gig

```bash
aws dynamodb query \
  --table-name $TBL_THIRD_PARTY_ACTION \
  --index-name byGig \
  --key-condition-expression "gigId = :g" \
  --expression-attribute-values '{":g": {"S": "test-gig-001"}}' \
  --projection-expression "id" \
  --output json \
  --query 'Items[]' | python3 -c "
import json, sys, subprocess
for item in json.load(sys.stdin):
    subprocess.run(['aws', 'dynamodb', 'delete-item',
        '--table-name', '$TBL_THIRD_PARTY_ACTION',
        '--key', json.dumps({'id': item['id']})])
print('Deleted third-party actions')
"
```

### Nuclear Option: Wipe All Test Data

> **Danger zone.** Only use this on a dev/staging environment, never production.

```bash
# Delete all items from a table (scan + batch delete)
TABLE=$TBL_USER  # change to any table

aws dynamodb scan \
  --table-name $TABLE \
  --projection-expression "id" \
  --output json \
  --query 'Items[]' | python3 -c "
import json, sys, subprocess
items = json.load(sys.stdin)
for item in items:
    subprocess.run(['aws', 'dynamodb', 'delete-item',
        '--table-name', '$TABLE',
        '--key', json.dumps({'id': item['id']})])
print(f'Deleted {len(items)} items from $TABLE')
"
```

---

## 13. Automated Test Scripts

### 13.1 Lambda Invocation Tests (`test-e2e.sh`)

The main E2E script runs tests by invoking Lambdas directly or hitting Function URLs. Auto-discovers DynamoDB tables and Lambda function names from AWS.

```bash
cp .env.test.example .env.test    # fill in your values
./scripts/test-e2e.sh help        # show all commands
```

**Available commands:**

| Command | What it tests |
|---------|--------------|
| `smoke` | Quick health check (send SMS, verify response) |
| `sms` | Full onboarding flow (Hi -> name -> create gig) |
| `gig` | Gig-processor Lambda (direct invocation) |
| `routing` | Smart gig routing (5 multi-gig scenarios with setup/teardown) |
| `group` | Add participant via gig-processor (Group MMS) |
| `webhook` | Conversations webhook (human + Gigler-authored messages) |
| `list-gigs` | List gigs showing owned + participated roles |
| `reminder` | Reminder-scheduler Lambda |
| `deliverable` | Deliverable-generator Lambda |
| `media` | Media-processor Lambda |
| `voice` | Voice-bridge Lambda |
| `email` | Email-handler Lambda |
| `third-party` | Third-party-actions Lambda |
| `verify-tables` | List DynamoDB tables with item counts |
| `logs <pattern>` | Tail CloudWatch logs |
| `cleanup` | Delete test data for TEST_PHONE |
| `all` | Run everything in sequence |

**Key environment variables:**

```bash
LAMBDA_URL=https://xxxxx.lambda-url.us-east-2.on.aws/     # gigler-inbound-sms
GIG_PROCESSOR_URL=https://xxxxx.lambda-url.us-east-2.on.aws/ # gigler-gig-processor
AWS_REGION=us-east-2
TEST_PHONE=+12812419268
TEST_GIGLER_NUMBER=+16508351235
TEST_PARTICIPANT_PHONE=+14154049816
TEST_PARTICIPANT_NAME=Sarah
```

### 13.2 Live SMS Tests (`test-live-sms.sh`)

Sends **real SMS** via the Twilio API and polls for replies. Requires Twilio credentials.

```bash
./scripts/test-live-sms.sh help
```

| Command | What it tests |
|---------|--------------|
| `onboard` | New user onboarding (Hi -> name -> gig prompt) via real SMS |
| `routing` | Smart routing with ambiguous message via real SMS |
| `group` | Add participant via real SMS, verify welcome message |
| `all` | Run all live tests |

**Prerequisites:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` in `.env.test`.

**Warning:** These tests send real SMS messages and may incur Twilio charges.

### 13.3 Recommended Test Flow

For a production readiness check, run in this order:

```bash
# 1. Verify infrastructure
./scripts/test-e2e.sh verify-tables

# 2. Quick health check
./scripts/test-e2e.sh smoke

# 3. Core flows
./scripts/test-e2e.sh sms
./scripts/test-e2e.sh gig

# 4. New features
./scripts/test-e2e.sh routing
./scripts/test-e2e.sh group
./scripts/test-e2e.sh webhook
./scripts/test-e2e.sh list-gigs

# 5. Unit tests
npm test

# 6. Live SMS (optional, costs money)
./scripts/test-live-sms.sh onboard
./scripts/test-live-sms.sh routing
```

---

## 14. Unit Tests

Local unit tests run with Vitest. No AWS or Twilio credentials needed.

### 14.1 Running Tests

```bash
npm test              # single run
npm run test:watch    # watch mode
```

### 14.2 Test Coverage

**`amplify/functions/gigler-inbound-sms/__tests__/routing.test.ts`** (27 tests):

| Suite | Tests | What it covers |
|-------|-------|---------------|
| `buildGigDescriptions` | 5 | Gig description formatting for Gemini prompt (roles, metadata, numbering) |
| `parseGigSelection` | 9 | AI response parsing (valid numbers, ambiguous, edge cases) |
| `buildDisambiguationList` | 4 | User-facing gig list with role labels |
| `deduplicateGigs` | 4 | Merging owned + participated gigs without duplicates |
| `single-gig auto-routing` | 1 | Single gig bypasses AI selection |
| `multi-gig routing scenarios` | 4 | End-to-end routing decision flow |

### 14.3 Adding New Tests

Tests live alongside the Lambda handlers:

```
amplify/functions/
  gigler-inbound-sms/
    handler.ts
    __tests__/
      routing.test.ts    <-- smart routing logic
  gigler-gig-processor/
    handler.ts
    __tests__/           <-- add group MMS tests here
```

Test files are matched by `vitest.config.ts`:

```typescript
include: ["amplify/functions/**/__tests__/**/*.test.ts"]
```
