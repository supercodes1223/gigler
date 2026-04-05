#!/bin/bash
# Gigler End-to-End Test Suite
# Usage: ./scripts/test-e2e.sh [command]
# Commands: all, smoke, sms, gig, reminder, media, deliverable, voice, email, third-party, verify-tables, logs, cleanup, help

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Counters ──────────────────────────────────────────────────────────────────

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

# ── Load config ───────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAYLOAD_DIR="$SCRIPT_DIR/test-payloads"

if [ -f "$SCRIPT_DIR/../.env.test" ]; then
  set -a
  source "$SCRIPT_DIR/../.env.test"
  set +a
fi

: "${AWS_REGION:=us-east-1}"
: "${TEST_PHONE:=+15551234567}"
: "${TEST_GIGLER_NUMBER:=+15559876543}"

# ── Helpers ───────────────────────────────────────────────────────────────────

log_pass() { ((PASS_COUNT++)); echo -e "${GREEN}✓ PASS${NC}: $1"; }
log_fail() { ((FAIL_COUNT++)); echo -e "${RED}✗ FAIL${NC}: $1"; }
log_skip() { ((SKIP_COUNT++)); echo -e "${YELLOW}⊘ SKIP${NC}: $1"; }
log_info() { echo -e "${BLUE}ℹ INFO${NC}: $1"; }
log_warn() { echo -e "${YELLOW}⚠ WARN${NC}: $1"; }
log_header() { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}\n"; }

summary() {
  echo ""
  log_header "Test Summary"
  echo -e "  ${GREEN}Passed${NC}: $PASS_COUNT"
  echo -e "  ${RED}Failed${NC}: $FAIL_COUNT"
  echo -e "  ${YELLOW}Skipped${NC}: $SKIP_COUNT"
  echo ""
  if [ "$FAIL_COUNT" -gt 0 ]; then
    echo -e "${RED}${BOLD}Some tests failed.${NC}"
    return 1
  else
    echo -e "${GREEN}${BOLD}All tests passed.${NC}"
  fi
}

require_lambda_url() {
  if [ -z "${LAMBDA_URL:-}" ]; then
    echo -e "${RED}ERROR${NC}: LAMBDA_URL is not set. Add it to .env.test or export it."
    echo "  Example: LAMBDA_URL=https://xxxxxxxxxx.lambda-url.us-east-1.on.aws/"
    exit 1
  fi
}

# ── Resource Discovery ────────────────────────────────────────────────────────

find_table() {
  local pattern=$1
  aws dynamodb list-tables --region "$AWS_REGION" --output text \
    --query "TableNames[?contains(@, \`$pattern\`)]" 2>/dev/null | head -1
}

find_lambda() {
  local pattern=$1
  aws lambda list-functions --region "$AWS_REGION" \
    --query "Functions[?contains(FunctionName, '$pattern')].FunctionName" \
    --output text 2>/dev/null | head -1
}

discover_tables() {
  log_header "Discovering Deployed Resources"

  USER_TABLE=${USER_TABLE:-$(find_table "User-")}
  GIG_TABLE=${GIG_TABLE:-$(find_table "Gig-" | grep -v "GigParticipant" | head -1)}
  GIG_PARTICIPANT_TABLE=${GIG_PARTICIPANT_TABLE:-$(find_table "GigParticipant")}
  MESSAGE_TABLE=${MESSAGE_TABLE:-$(find_table "Message")}
  MEDIA_TABLE=${MEDIA_TABLE:-$(find_table "Media")}
  DELIVERABLE_TABLE=${DELIVERABLE_TABLE:-$(find_table "Deliverable")}
  REMINDER_TABLE=${REMINDER_TABLE:-$(find_table "Reminder")}
  THIRD_PARTY_TABLE=${THIRD_PARTY_TABLE:-$(find_table "ThirdPartyAction")}
  USER_INTEGRATION_TABLE=${USER_INTEGRATION_TABLE:-$(find_table "UserIntegration")}

  INBOUND_SMS_FN=${INBOUND_SMS_FN:-$(find_lambda "inbound-sms")}
  GIG_PROCESSOR_FN=${GIG_PROCESSOR_FN:-$(find_lambda "gig-processor")}
  REMINDER_FN=${REMINDER_FN:-$(find_lambda "reminder-scheduler")}
  MEDIA_FN=${MEDIA_FN:-$(find_lambda "media-processor")}
  DELIVERABLE_FN=${DELIVERABLE_FN:-$(find_lambda "deliverable-generator")}
  VOICE_FN=${VOICE_FN:-$(find_lambda "voice-bridge")}
  EMAIL_FN=${EMAIL_FN:-$(find_lambda "email-handler")}
  THIRD_PARTY_FN=${THIRD_PARTY_FN:-$(find_lambda "third-party")}

  log_info "Tables:"
  log_info "  User          = ${USER_TABLE:-NOT FOUND}"
  log_info "  Gig           = ${GIG_TABLE:-NOT FOUND}"
  log_info "  GigParticipant= ${GIG_PARTICIPANT_TABLE:-NOT FOUND}"
  log_info "  Message       = ${MESSAGE_TABLE:-NOT FOUND}"
  log_info "  Media         = ${MEDIA_TABLE:-NOT FOUND}"
  log_info "  Deliverable   = ${DELIVERABLE_TABLE:-NOT FOUND}"
  log_info "  Reminder      = ${REMINDER_TABLE:-NOT FOUND}"
  log_info "  ThirdParty    = ${THIRD_PARTY_TABLE:-NOT FOUND}"
  log_info "  UserIntegration= ${USER_INTEGRATION_TABLE:-NOT FOUND}"
  echo ""
  log_info "Lambdas:"
  log_info "  InboundSMS    = ${INBOUND_SMS_FN:-NOT FOUND}"
  log_info "  GigProcessor  = ${GIG_PROCESSOR_FN:-NOT FOUND}"
  log_info "  Reminder      = ${REMINDER_FN:-NOT FOUND}"
  log_info "  Media         = ${MEDIA_FN:-NOT FOUND}"
  log_info "  Deliverable   = ${DELIVERABLE_FN:-NOT FOUND}"
  log_info "  VoiceBridge   = ${VOICE_FN:-NOT FOUND}"
  log_info "  EmailHandler  = ${EMAIL_FN:-NOT FOUND}"
  log_info "  ThirdParty    = ${THIRD_PARTY_FN:-NOT FOUND}"
}

# ── DynamoDB Query Helpers ────────────────────────────────────────────────────

query_user_by_phone() {
  local phone=$1
  aws dynamodb query --region "$AWS_REGION" \
    --table-name "$USER_TABLE" \
    --index-name "byPhone" \
    --key-condition-expression "phone = :phone" \
    --expression-attribute-values "{\":phone\":{\"S\":\"$phone\"}}" \
    --output json 2>/dev/null
}

query_messages_by_gig() {
  local gig_id=$1
  aws dynamodb query --region "$AWS_REGION" \
    --table-name "$MESSAGE_TABLE" \
    --key-condition-expression "gigId = :gid" \
    --expression-attribute-values "{\":gid\":{\"S\":\"$gig_id\"}}" \
    --scan-index-forward false \
    --limit 5 \
    --output json 2>/dev/null
}

query_gigs_by_owner() {
  local owner_id=$1
  aws dynamodb query --region "$AWS_REGION" \
    --table-name "$GIG_TABLE" \
    --index-name "byOwner" \
    --key-condition-expression "ownerId = :uid" \
    --expression-attribute-values "{\":uid\":{\"S\":\"$owner_id\"}}" \
    --output json 2>/dev/null
}

query_deliverables_by_gig() {
  local gig_id=$1
  aws dynamodb query --region "$AWS_REGION" \
    --table-name "$DELIVERABLE_TABLE" \
    --key-condition-expression "gigId = :gid" \
    --expression-attribute-values "{\":gid\":{\"S\":\"$gig_id\"}}" \
    --output json 2>/dev/null
}

query_media_by_gig() {
  local gig_id=$1
  aws dynamodb query --region "$AWS_REGION" \
    --table-name "$MEDIA_TABLE" \
    --key-condition-expression "gigId = :gid" \
    --expression-attribute-values "{\":gid\":{\"S\":\"$gig_id\"}}" \
    --output json 2>/dev/null
}

query_third_party_by_gig() {
  local gig_id=$1
  aws dynamodb query --region "$AWS_REGION" \
    --table-name "$THIRD_PARTY_TABLE" \
    --index-name "byGig" \
    --key-condition-expression "gigId = :gid" \
    --expression-attribute-values "{\":gid\":{\"S\":\"$gig_id\"}}" \
    --output json 2>/dev/null
}

# ── Send SMS via Lambda Function URL ─────────────────────────────────────────

send_sms_payload() {
  local payload_file=$1
  local description=$2

  require_lambda_url
  log_info "Sending: $description"

  local body
  body=$(cat "$payload_file")

  # Replace placeholder phone numbers with TEST_PHONE
  body=$(echo "$body" | sed "s/%2B15551234567/$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TEST_PHONE', safe=''))")/g")
  body=$(echo "$body" | sed "s/%2B15559876543/$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TEST_GIGLER_NUMBER', safe=''))")/g")

  local response
  local http_code
  response=$(curl -s -w "\n%{http_code}" \
    -X POST "$LAMBDA_URL" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "$body" 2>/dev/null)

  http_code=$(echo "$response" | tail -1)
  local response_body
  response_body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    log_pass "$description (HTTP $http_code)"
    echo "  Response: $(echo "$response_body" | head -c 200)"
  else
    log_fail "$description (HTTP $http_code)"
    echo "  Response: $response_body"
  fi

  echo "$response_body"
}

# ── Invoke Lambda Directly ────────────────────────────────────────────────────

invoke_lambda() {
  local function_name=$1
  local payload_file=$2
  local description=$3

  if [ -z "$function_name" ]; then
    log_skip "$description (Lambda not found)"
    return 1
  fi

  log_info "Invoking $function_name: $description"

  local outfile
  outfile=$(mktemp /tmp/gigler-test-XXXXXX.json)

  local payload
  payload=$(cat "$payload_file")

  # Substitute placeholder IDs if TEST_USER_ID and TEST_GIG_ID are set
  if [ -n "${TEST_USER_ID:-}" ]; then
    payload=$(echo "$payload" | sed "s/TEST_USER_ID/$TEST_USER_ID/g")
  fi
  if [ -n "${TEST_GIG_ID:-}" ]; then
    payload=$(echo "$payload" | sed "s/TEST_GIG_ID/$TEST_GIG_ID/g")
  fi
  payload=$(echo "$payload" | sed "s/+15551234567/$TEST_PHONE/g")

  aws lambda invoke \
    --region "$AWS_REGION" \
    --function-name "$function_name" \
    --payload "$(echo "$payload" | base64)" \
    --cli-binary-format raw-in-base64-out \
    "$outfile" > /dev/null 2>&1

  local exit_code=$?
  local result
  result=$(cat "$outfile")
  rm -f "$outfile"

  if [ $exit_code -eq 0 ]; then
    local status_code
    status_code=$(echo "$result" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('statusCode','?'))" 2>/dev/null || echo "?")
    if [ "$status_code" = "200" ] || [ "$status_code" = "?" ]; then
      log_pass "$description (status=$status_code)"
    else
      log_fail "$description (status=$status_code)"
    fi
    echo "  Result: $(echo "$result" | head -c 300)"
  else
    log_fail "$description (invoke failed, exit=$exit_code)"
  fi

  echo "$result"
}

# ══════════════════════════════════════════════════════════════════════════════
# TEST FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

test_smoke() {
  log_header "Smoke Test"
  require_lambda_url

  log_info "Sending 'Hello' from $TEST_PHONE to Lambda URL..."
  local body="MessageSid=SM$(date +%s)test&AccountSid=ACtest&From=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TEST_PHONE', safe=''))")&To=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TEST_GIGLER_NUMBER', safe=''))")&Body=Hello&NumMedia=0"

  local response
  local http_code
  response=$(curl -s -w "\n%{http_code}" \
    -X POST "$LAMBDA_URL" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "$body" 2>/dev/null)

  http_code=$(echo "$response" | tail -1)
  local response_body
  response_body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    log_pass "Lambda URL responded (HTTP 200)"
  else
    log_fail "Lambda URL returned HTTP $http_code"
    echo "  Body: $response_body"
    return 1
  fi

  if echo "$response_body" | grep -q "Response"; then
    log_pass "TwiML response received"
  else
    log_warn "Response may not be TwiML: $(echo "$response_body" | head -c 100)"
  fi

  sleep 2

  if [ -n "${USER_TABLE:-}" ]; then
    local user_result
    user_result=$(query_user_by_phone "$TEST_PHONE")
    local user_count
    user_count=$(echo "$user_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Count',0))" 2>/dev/null || echo "0")

    if [ "$user_count" -gt 0 ]; then
      log_pass "User record found in DynamoDB for $TEST_PHONE"
      TEST_USER_ID=$(echo "$user_result" | python3 -c "import sys,json; print(json.load(sys.stdin)['Items'][0]['id']['S'])" 2>/dev/null || echo "")
      log_info "User ID: $TEST_USER_ID"
    else
      log_info "No User record yet (may be first contact -- onboarding)"
    fi
  else
    log_skip "User table query (USER_TABLE not discovered)"
  fi

  if [ -n "${MESSAGE_TABLE:-}" ]; then
    local msg_result
    msg_result=$(query_messages_by_gig "_general")
    local msg_count
    msg_count=$(echo "$msg_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Count',0))" 2>/dev/null || echo "0")

    if [ "$msg_count" -gt 0 ]; then
      log_pass "Messages found in _general thread ($msg_count)"
    else
      log_info "No messages in _general thread (may be new user)"
    fi
  else
    log_skip "Message table query (MESSAGE_TABLE not discovered)"
  fi
}

test_sms_onboarding() {
  log_header "SMS Onboarding Flow"
  require_lambda_url

  # Step 1: New user says "Hi"
  log_info "Step 1: New user sends 'Hi'..."
  send_sms_payload "$PAYLOAD_DIR/sms-new-user.txt" "New user 'Hi'" > /dev/null
  sleep 3

  if [ -n "${USER_TABLE:-}" ]; then
    local user_result
    user_result=$(query_user_by_phone "$TEST_PHONE")
    local user_count
    user_count=$(echo "$user_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Count',0))" 2>/dev/null || echo "0")

    if [ "$user_count" -gt 0 ]; then
      log_pass "User created after sending 'Hi'"
      TEST_USER_ID=$(echo "$user_result" | python3 -c "import sys,json; print(json.load(sys.stdin)['Items'][0]['id']['S'])" 2>/dev/null || echo "")
      local onboarded
      onboarded=$(echo "$user_result" | python3 -c "import sys,json; print(json.load(sys.stdin)['Items'][0].get('onboardingComplete',{}).get('BOOL','false'))" 2>/dev/null || echo "false")
      log_info "onboardingComplete=$onboarded"
    else
      log_fail "User NOT created after 'Hi'"
    fi
  fi

  # Step 2: User provides name
  log_info "Step 2: User provides name 'John'..."
  send_sms_payload "$PAYLOAD_DIR/sms-onboard-name.txt" "Onboarding name 'John'" > /dev/null
  sleep 3

  if [ -n "${USER_TABLE:-}" ] && [ -n "${TEST_USER_ID:-}" ]; then
    local user_result
    user_result=$(query_user_by_phone "$TEST_PHONE")
    local name
    name=$(echo "$user_result" | python3 -c "import sys,json; print(json.load(sys.stdin)['Items'][0].get('name',{}).get('S',''))" 2>/dev/null || echo "")
    local onboarded
    onboarded=$(echo "$user_result" | python3 -c "import sys,json; print(json.load(sys.stdin)['Items'][0].get('onboardingComplete',{}).get('BOOL','false'))" 2>/dev/null || echo "false")

    if [ "$name" = "John" ]; then
      log_pass "Name set to 'John'"
    else
      log_warn "Name is '$name' (expected 'John')"
    fi

    if [ "$onboarded" = "True" ] || [ "$onboarded" = "true" ]; then
      log_pass "onboardingComplete=true"
    else
      log_info "onboardingComplete=$onboarded"
    fi
  fi

  # Step 3: Create a gig
  log_info "Step 3: User creates a gig..."
  send_sms_payload "$PAYLOAD_DIR/sms-create-gig.txt" "Create gig 'birthday party'" > /dev/null
  sleep 5

  if [ -n "${GIG_TABLE:-}" ] && [ -n "${TEST_USER_ID:-}" ]; then
    local gig_result
    gig_result=$(query_gigs_by_owner "$TEST_USER_ID")
    local gig_count
    gig_count=$(echo "$gig_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Count',0))" 2>/dev/null || echo "0")

    if [ "$gig_count" -gt 0 ]; then
      log_pass "Gig created ($gig_count gig(s) found for user)"
      TEST_GIG_ID=$(echo "$gig_result" | python3 -c "import sys,json; items=json.load(sys.stdin)['Items']; print(items[-1]['id']['S'])" 2>/dev/null || echo "")
      local gig_title
      gig_title=$(echo "$gig_result" | python3 -c "import sys,json; items=json.load(sys.stdin)['Items']; print(items[-1].get('title',{}).get('S',''))" 2>/dev/null || echo "")
      log_info "Gig ID: $TEST_GIG_ID"
      log_info "Gig title: $gig_title"
    else
      log_fail "No gigs found for user $TEST_USER_ID"
    fi
  fi
}

test_gig_processor() {
  log_header "Gig Processor Test"

  if [ -z "${TEST_USER_ID:-}" ] || [ -z "${TEST_GIG_ID:-}" ]; then
    log_warn "TEST_USER_ID or TEST_GIG_ID not set. Run 'sms' test first or export them."
    log_skip "Gig processor (missing IDs)"
    return
  fi

  invoke_lambda "$GIG_PROCESSOR_FN" "$PAYLOAD_DIR/gig-processor.json" "Gig processor with planning message" > /dev/null
  sleep 3

  if [ -n "${MESSAGE_TABLE:-}" ] && [ -n "${TEST_GIG_ID:-}" ]; then
    local msg_result
    msg_result=$(query_messages_by_gig "$TEST_GIG_ID")
    local msg_count
    msg_count=$(echo "$msg_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Count',0))" 2>/dev/null || echo "0")

    if [ "$msg_count" -gt 0 ]; then
      log_pass "Messages found in gig thread ($msg_count)"
    else
      log_info "No messages yet in gig $TEST_GIG_ID"
    fi
  fi
}

test_reminder() {
  log_header "Reminder Scheduler Test"

  invoke_lambda "$REMINDER_FN" "$PAYLOAD_DIR/reminder-scheduler.json" "Reminder scheduler (EventBridge trigger)" > /dev/null

  sleep 2

  if [ -n "${REMINDER_FN:-}" ]; then
    log_info "Checking CloudWatch logs for execution..."
    local log_group="/aws/lambda/$REMINDER_FN"
    local recent_logs
    recent_logs=$(aws logs filter-log-events \
      --region "$AWS_REGION" \
      --log-group-name "$log_group" \
      --start-time "$(date -v-5M +%s000 2>/dev/null || date -d '5 minutes ago' +%s000 2>/dev/null || echo "0")" \
      --filter-pattern "ReminderScheduler" \
      --limit 3 \
      --output text 2>/dev/null || echo "")

    if [ -n "$recent_logs" ]; then
      log_pass "Reminder scheduler ran (logs found)"
      echo "  $(echo "$recent_logs" | head -3)"
    else
      log_info "No recent logs found (may need CloudWatch delay)"
    fi
  fi
}

test_deliverable() {
  log_header "Deliverable Generator Test"

  if [ -z "${TEST_GIG_ID:-}" ]; then
    log_warn "TEST_GIG_ID not set. Using placeholder. Run 'sms' test first for real IDs."
  fi

  # Test website deliverable
  invoke_lambda "$DELIVERABLE_FN" "$PAYLOAD_DIR/deliverable-website.json" "Website deliverable" > /dev/null
  sleep 3

  if [ -n "${DELIVERABLE_TABLE:-}" ] && [ -n "${TEST_GIG_ID:-}" ]; then
    local del_result
    del_result=$(query_deliverables_by_gig "$TEST_GIG_ID")
    local del_count
    del_count=$(echo "$del_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Count',0))" 2>/dev/null || echo "0")

    if [ "$del_count" -gt 0 ]; then
      log_pass "Deliverable record created ($del_count found)"
      local short_code
      short_code=$(echo "$del_result" | python3 -c "import sys,json; items=json.load(sys.stdin)['Items']; print(items[-1].get('shortCode',{}).get('S',''))" 2>/dev/null || echo "")
      log_info "Short code: $short_code"
    else
      log_info "No deliverables found for gig $TEST_GIG_ID"
    fi
  fi

  # Test PDF deliverable
  invoke_lambda "$DELIVERABLE_FN" "$PAYLOAD_DIR/deliverable-pdf.json" "PDF deliverable" > /dev/null
}

test_media() {
  log_header "Media Processor Test"

  invoke_lambda "$MEDIA_FN" "$PAYLOAD_DIR/media-generate-image.json" "AI image generation" > /dev/null
  sleep 3

  if [ -n "${MEDIA_TABLE:-}" ] && [ -n "${TEST_GIG_ID:-}" ]; then
    local media_result
    media_result=$(query_media_by_gig "$TEST_GIG_ID")
    local media_count
    media_count=$(echo "$media_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Count',0))" 2>/dev/null || echo "0")

    if [ "$media_count" -gt 0 ]; then
      log_pass "Media record created ($media_count found)"
    else
      log_info "No media records for gig $TEST_GIG_ID (image gen may require API keys)"
    fi
  fi

  invoke_lambda "$MEDIA_FN" "$PAYLOAD_DIR/media-download-mms.json" "MMS download" > /dev/null
}

test_voice() {
  log_header "Voice Bridge Test"

  invoke_lambda "$VOICE_FN" "$PAYLOAD_DIR/voice-wakeup.json" "Wake-up call" > /dev/null
  sleep 2

  invoke_lambda "$VOICE_FN" "$PAYLOAD_DIR/voice-checkin.json" "Check-in call" > /dev/null
  sleep 2

  if [ -n "${VOICE_FN:-}" ]; then
    log_info "Checking CloudWatch logs..."
    local log_group="/aws/lambda/$VOICE_FN"
    local recent_logs
    recent_logs=$(aws logs filter-log-events \
      --region "$AWS_REGION" \
      --log-group-name "$log_group" \
      --start-time "$(date -v-5M +%s000 2>/dev/null || date -d '5 minutes ago' +%s000 2>/dev/null || echo "0")" \
      --filter-pattern "VoiceBridge" \
      --limit 5 \
      --output text 2>/dev/null || echo "")

    if [ -n "$recent_logs" ]; then
      log_pass "Voice bridge executed (logs found)"
    else
      log_info "No recent VoiceBridge logs"
    fi
  fi
}

test_email() {
  log_header "Email Handler Test"

  invoke_lambda "$EMAIL_FN" "$PAYLOAD_DIR/email-inbound.json" "Inbound email to gig@gigler.ai" > /dev/null
  sleep 2

  invoke_lambda "$EMAIL_FN" "$PAYLOAD_DIR/email-shortcode.json" "Inbound email to shortcode@gigler.ai" > /dev/null
  sleep 2

  if [ -n "${MESSAGE_TABLE:-}" ]; then
    log_info "Checking for email-sourced messages..."
    local msg_result
    msg_result=$(query_messages_by_gig "_general")
    local msg_count
    msg_count=$(echo "$msg_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Count',0))" 2>/dev/null || echo "0")
    log_info "Messages in _general thread: $msg_count"
  fi
}

test_third_party() {
  log_header "Third-Party Actions Test"

  if [ -z "${TEST_GIG_ID:-}" ]; then
    log_warn "TEST_GIG_ID not set. Using placeholder."
  fi

  invoke_lambda "$THIRD_PARTY_FN" "$PAYLOAD_DIR/third-party-search.json" "OpenTable search" > /dev/null
  sleep 2

  invoke_lambda "$THIRD_PARTY_FN" "$PAYLOAD_DIR/third-party-confirm.json" "OpenTable confirm" > /dev/null
  sleep 2

  if [ -n "${THIRD_PARTY_TABLE:-}" ] && [ -n "${TEST_GIG_ID:-}" ]; then
    local tpa_result
    tpa_result=$(query_third_party_by_gig "$TEST_GIG_ID")
    local tpa_count
    tpa_count=$(echo "$tpa_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Count',0))" 2>/dev/null || echo "0")

    if [ "$tpa_count" -gt 0 ]; then
      log_pass "ThirdPartyAction records found ($tpa_count)"
    else
      log_info "No ThirdPartyAction records for gig $TEST_GIG_ID"
    fi
  fi
}

# ── Verify Tables ─────────────────────────────────────────────────────────────

verify_tables() {
  log_header "DynamoDB Table Verification"

  local tables
  tables=$(aws dynamodb list-tables --region "$AWS_REGION" --output json 2>/dev/null)
  local all_tables
  all_tables=$(echo "$tables" | python3 -c "import sys,json; [print(t) for t in json.load(sys.stdin).get('TableNames',[])]" 2>/dev/null)

  local gigler_tables
  gigler_tables=$(echo "$all_tables" | grep -i -E "(user|gig|message|media|deliverable|reminder|thirdparty|userintegration)" || true)

  if [ -z "$gigler_tables" ]; then
    log_warn "No Gigler-related tables found in $AWS_REGION"
    return
  fi

  echo "$gigler_tables" | while read -r table; do
    if [ -n "$table" ]; then
      local count
      count=$(aws dynamodb describe-table --region "$AWS_REGION" --table-name "$table" \
        --query "Table.ItemCount" --output text 2>/dev/null || echo "?")
      local status
      status=$(aws dynamodb describe-table --region "$AWS_REGION" --table-name "$table" \
        --query "Table.TableStatus" --output text 2>/dev/null || echo "?")
      echo -e "  ${CYAN}$table${NC}: ${count} items (${status})"
    fi
  done
}

# ── Tail Logs ─────────────────────────────────────────────────────────────────

tail_logs() {
  local fn_name="${2:-}"

  if [ -z "$fn_name" ]; then
    echo "Usage: ./scripts/test-e2e.sh logs <lambda-name-pattern>"
    echo ""
    echo "Examples:"
    echo "  ./scripts/test-e2e.sh logs inbound-sms"
    echo "  ./scripts/test-e2e.sh logs gig-processor"
    echo "  ./scripts/test-e2e.sh logs reminder"
    echo ""
    echo "Available Lambdas:"
    aws lambda list-functions --region "$AWS_REGION" \
      --query "Functions[?contains(FunctionName, 'gigler')].FunctionName" \
      --output text 2>/dev/null | tr '\t' '\n' | while read -r fn; do
        echo "  $fn"
    done
    return
  fi

  local full_name
  full_name=$(find_lambda "$fn_name")

  if [ -z "$full_name" ]; then
    echo -e "${RED}No Lambda found matching '$fn_name'${NC}"
    return 1
  fi

  local log_group="/aws/lambda/$full_name"
  log_info "Tailing logs for $full_name..."
  log_info "Log group: $log_group"
  echo ""

  aws logs tail "$log_group" \
    --region "$AWS_REGION" \
    --since 30m \
    --follow 2>/dev/null || {
    log_warn "Could not tail logs. Fetching recent entries instead..."
    aws logs filter-log-events \
      --region "$AWS_REGION" \
      --log-group-name "$log_group" \
      --start-time "$(date -v-30M +%s000 2>/dev/null || date -d '30 minutes ago' +%s000 2>/dev/null || echo "0")" \
      --limit 50 \
      --output text 2>/dev/null
  }
}

# ── Cleanup Test Data ─────────────────────────────────────────────────────────

cleanup_test_data() {
  log_header "Cleanup Test Data"
  log_warn "This will delete all test records for phone $TEST_PHONE"
  read -r -p "Are you sure? (y/N): " confirm
  if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    log_info "Cleanup cancelled."
    return
  fi

  # Find and delete user
  if [ -n "${USER_TABLE:-}" ]; then
    local user_result
    user_result=$(query_user_by_phone "$TEST_PHONE")
    local user_id
    user_id=$(echo "$user_result" | python3 -c "import sys,json; items=json.load(sys.stdin).get('Items',[]); print(items[0]['id']['S'] if items else '')" 2>/dev/null || echo "")

    if [ -n "$user_id" ]; then
      log_info "Deleting user $user_id..."
      aws dynamodb delete-item --region "$AWS_REGION" \
        --table-name "$USER_TABLE" \
        --key "{\"id\":{\"S\":\"$user_id\"}}" 2>/dev/null
      log_pass "User deleted"

      # Delete gigs owned by this user
      if [ -n "${GIG_TABLE:-}" ]; then
        local gig_result
        gig_result=$(query_gigs_by_owner "$user_id")
        local gig_ids
        gig_ids=$(echo "$gig_result" | python3 -c "
import sys,json
items=json.load(sys.stdin).get('Items',[])
for i in items:
    print(i['id']['S'])
" 2>/dev/null || true)

        echo "$gig_ids" | while read -r gig_id; do
          if [ -n "$gig_id" ]; then
            log_info "Deleting gig $gig_id..."
            aws dynamodb delete-item --region "$AWS_REGION" \
              --table-name "$GIG_TABLE" \
              --key "{\"id\":{\"S\":\"$gig_id\"}}" 2>/dev/null
          fi
        done
        log_pass "Gigs deleted"
      fi
    else
      log_info "No user found for $TEST_PHONE"
    fi
  fi

  log_pass "Cleanup complete"
}

# ── Help ──────────────────────────────────────────────────────────────────────

show_help() {
  cat <<HELPEOF

${CYAN}${BOLD}Gigler End-to-End Test Suite${NC}

${BOLD}Usage:${NC}
  ./scripts/test-e2e.sh <command> [args]

${BOLD}Commands:${NC}
  ${GREEN}all${NC}             Run all tests in sequence
  ${GREEN}smoke${NC}           Quick health check (send SMS, verify response)
  ${GREEN}sms${NC}             Full SMS onboarding flow (new user -> name -> create gig)
  ${GREEN}gig${NC}             Test gig-processor Lambda (requires TEST_USER_ID, TEST_GIG_ID)
  ${GREEN}reminder${NC}        Test reminder-scheduler Lambda
  ${GREEN}deliverable${NC}     Test deliverable-generator Lambda
  ${GREEN}media${NC}           Test media-processor Lambda
  ${GREEN}voice${NC}           Test voice-bridge Lambda
  ${GREEN}email${NC}           Test email-handler Lambda
  ${GREEN}third-party${NC}     Test third-party-actions Lambda
  ${GREEN}verify-tables${NC}   List all DynamoDB tables with item counts
  ${GREEN}logs${NC} <pattern>  Tail CloudWatch logs for a Lambda (e.g., 'logs inbound-sms')
  ${GREEN}cleanup${NC}         Delete test data for TEST_PHONE
  ${GREEN}help${NC}            Show this help message

${BOLD}Configuration:${NC}
  Copy .env.test.example to .env.test and fill in your values.
  Required: LAMBDA_URL (gigler-inbound-sms Function URL)

${BOLD}Environment Variables:${NC}
  LAMBDA_URL          Lambda Function URL for gigler-inbound-sms
  AWS_REGION          AWS region (default: us-east-1)
  TEST_PHONE          Test phone number (default: +15551234567)
  TEST_GIGLER_NUMBER  Gigler's Twilio number
  TEST_USER_ID        Override user ID for direct Lambda tests
  TEST_GIG_ID         Override gig ID for direct Lambda tests

${BOLD}Examples:${NC}
  ./scripts/test-e2e.sh smoke
  ./scripts/test-e2e.sh all
  ./scripts/test-e2e.sh logs inbound-sms
  TEST_USER_ID=usr_123 TEST_GIG_ID=gig_456 ./scripts/test-e2e.sh gig

HELPEOF
}

# ══════════════════════════════════════════════════════════════════════════════
# MAIN DISPATCHER
# ══════════════════════════════════════════════════════════════════════════════

case "${1:-help}" in
  all)
    discover_tables
    test_smoke
    test_sms_onboarding
    test_gig_processor
    test_deliverable
    test_reminder
    test_media
    test_voice
    test_email
    test_third_party
    summary
    ;;
  smoke)
    discover_tables
    test_smoke
    summary
    ;;
  sms)
    discover_tables
    test_sms_onboarding
    summary
    ;;
  gig)
    discover_tables
    test_gig_processor
    summary
    ;;
  reminder)
    discover_tables
    test_reminder
    summary
    ;;
  deliverable)
    discover_tables
    test_deliverable
    summary
    ;;
  media)
    discover_tables
    test_media
    summary
    ;;
  voice)
    discover_tables
    test_voice
    summary
    ;;
  email)
    discover_tables
    test_email
    summary
    ;;
  third-party)
    discover_tables
    test_third_party
    summary
    ;;
  verify-tables)
    verify_tables
    ;;
  logs)
    tail_logs "$@"
    ;;
  cleanup)
    discover_tables
    cleanup_test_data
    ;;
  help|*)
    show_help
    ;;
esac
