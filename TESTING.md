# Gigler End-to-End Testing Playbook

Post-deployment testing against real AWS resources. No local mocks -- every test hits the live deployed stack.

> **Deploy first, test second.** This doc assumes you've deployed via Amplify Console (GitHub push → Amplify build). Run these tests to verify everything is wired up correctly.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Smoke Test](#2-quick-smoke-test)
3. [Testing Individual Lambdas](#3-testing-individual-lambdas)
4. [End-to-End Test Scenarios](#4-end-to-end-test-scenarios)
5. [DynamoDB Verification Commands](#5-dynamodb-verification-commands)
6. [CloudWatch Log Monitoring](#6-cloudwatch-log-monitoring)
7. [S3 Verification](#7-s3-verification)
8. [Frontend Verification Checklist](#8-frontend-verification-checklist)
9. [Troubleshooting Guide](#9-troubleshooting-guide)
10. [Test Reset / Cleanup Commands](#10-test-reset--cleanup-commands)

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
    "senderName": "Test User"
  }' \
  /tmp/gig-processor-response.json

cat /tmp/gig-processor-response.json | python3 -m json.tool
```

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

# CloudWatch logs
aws logs tail /aws/lambda/$FN_GIG_PROCESSOR --since 5m
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
    "phone": "+15551234567"
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
    "phone": "+15551234567"
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
    "phone": "+15551234567"
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
    "phone": "+15551234567"
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

## 5. DynamoDB Verification Commands

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

## 6. CloudWatch Log Monitoring

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

---

## 7. S3 Verification

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

## 8. Frontend Verification Checklist

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

## 9. Troubleshooting Guide

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

## 10. Test Reset / Cleanup Commands

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

## Automation

Much of this playbook can be automated. The script `scripts/test-e2e.sh` wraps the smoke test and core E2E scenarios into a single run:

```bash
./scripts/test-e2e.sh
```

It reads resource names from your exported environment variables (`$LAMBDA_URL`, `$TBL_USER`, etc.) and runs through:

1. Smoke test (Section 2)
2. New user onboarding (Scenario 1)
3. Gig creation (Scenario 2)
4. Deliverable generation (Scenario 4)
5. Cleanup of all test data

Set the variables in your shell profile or create a `.env.test` file:

```bash
# .env.test -- source this before running tests
export LAMBDA_URL=https://xxxx.lambda-url.us-east-1.on.aws/
export FN_INBOUND_SMS=gigler-inbound-sms-xxxx
export FN_GIG_PROCESSOR=gigler-gig-processor-xxxx
export FN_REMINDER_SCHEDULER=gigler-reminder-scheduler-xxxx
export FN_MEDIA_PROCESSOR=gigler-media-processor-xxxx
export FN_DELIVERABLE_GENERATOR=gigler-deliverable-generator-xxxx
export FN_VOICE_BRIDGE=gigler-voice-bridge-xxxx
export FN_EMAIL_HANDLER=gigler-email-handler-xxxx
export FN_THIRD_PARTY_ACTIONS=gigler-third-party-actions-xxxx
export TBL_USER=User-xxxx
export TBL_GIG=Gig-xxxx
export TBL_GIG_PARTICIPANT=GigParticipant-xxxx
export TBL_MESSAGE=Message-xxxx
export TBL_MEDIA=Media-xxxx
export TBL_DELIVERABLE=Deliverable-xxxx
export TBL_REMINDER=Reminder-xxxx
export TBL_THIRD_PARTY_ACTION=ThirdPartyAction-xxxx
export TBL_USER_INTEGRATION=UserIntegration-xxxx
export S3_BUCKET=gigler-media-xxxx
```

```bash
source .env.test
./scripts/test-e2e.sh
```
