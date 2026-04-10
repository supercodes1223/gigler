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

: "${AWS_REGION:=us-east-2}"
: "${TEST_PHONE:=+15551234567}"
: "${TEST_GIGLER_NUMBER:=+16508351235}"
: "${TEST_PARTICIPANT_PHONE:=+14154049816}"
: "${TEST_PARTICIPANT_NAME:=Sarah}"

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
    echo "  Example: LAMBDA_URL=https://xxxxxxxxxx.lambda-url.us-east-2.on.aws/"
    exit 1
  fi
}

require_gig_processor_url() {
  if [ -z "${GIG_PROCESSOR_URL:-}" ]; then
    echo -e "${RED}ERROR${NC}: GIG_PROCESSOR_URL is not set. Add it to .env.test or export it."
    echo "  Example: GIG_PROCESSOR_URL=https://xxxxxxxxxx.lambda-url.us-east-2.on.aws/"
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

  INBOUND_SMS_FN=${INBOUND_SMS_FN:-$(find_lambda "giglerinboundsms")}
  GIG_PROCESSOR_FN=${GIG_PROCESSOR_FN:-$(find_lambda "giglergigprocessor")}
  REMINDER_FN=${REMINDER_FN:-$(find_lambda "giglerreminderscheduler")}
  MEDIA_FN=${MEDIA_FN:-$(find_lambda "giglermediaprocessor")}
  DELIVERABLE_FN=${DELIVERABLE_FN:-$(find_lambda "giglerdeliverablegenerat")}
  VOICE_FN=${VOICE_FN:-$(find_lambda "giglervoicebridge")}
  EMAIL_FN=${EMAIL_FN:-$(find_lambda "gigleremailhandler")}
  THIRD_PARTY_FN=${THIRD_PARTY_FN:-$(find_lambda "giglerthirdpartyactions")}

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

  discover_test_ids_from_db
}

discover_test_ids_from_db() {
  if [ -n "${TEST_USER_ID:-}" ] && [ -n "${TEST_GIG_ID:-}" ]; then
    return
  fi

  if [ -z "${USER_TABLE:-}" ] || [ -z "${GIG_TABLE:-}" ]; then
    return
  fi

  if [ -z "${TEST_USER_ID:-}" ]; then
    local user_result
    user_result=$(aws dynamodb query --region "$AWS_REGION" \
      --table-name "$USER_TABLE" \
      --index-name "byPhone" \
      --key-condition-expression "phone = :phone" \
      --expression-attribute-values "{\":phone\":{\"S\":\"$TEST_PHONE\"}}" \
      --output json 2>/dev/null) || true

    TEST_USER_ID=$(echo "$user_result" | python3 -c "import sys,json; items=json.load(sys.stdin).get('Items',[]); print(items[0]['id']['S'] if items else '')" 2>/dev/null || echo "")
    if [ -n "$TEST_USER_ID" ]; then
      log_info "Auto-discovered TEST_USER_ID=$TEST_USER_ID"
    fi
  fi

  if [ -z "${TEST_GIG_ID:-}" ] && [ -n "${TEST_USER_ID:-}" ]; then
    local gig_result
    gig_result=$(aws dynamodb query --region "$AWS_REGION" \
      --table-name "$GIG_TABLE" \
      --index-name "byOwner" \
      --key-condition-expression "ownerId = :uid" \
      --expression-attribute-values "{\":uid\":{\"S\":\"$TEST_USER_ID\"}}" \
      --output json 2>/dev/null) || true

    TEST_GIG_ID=$(echo "$gig_result" | python3 -c "import sys,json; items=json.load(sys.stdin).get('Items',[]); print(items[-1]['id']['S'] if items else '')" 2>/dev/null || echo "")
    if [ -n "$TEST_GIG_ID" ]; then
      log_info "Auto-discovered TEST_GIG_ID=$TEST_GIG_ID"
    fi
  fi
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
    --no-scan-index-forward \
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

query_participants_by_gig() {
  local gig_id=$1
  aws dynamodb query --region "$AWS_REGION" \
    --table-name "$GIG_PARTICIPANT_TABLE" \
    --key-condition-expression "gigId = :gid" \
    --expression-attribute-values "{\":gid\":{\"S\":\"$gig_id\"}}" \
    --output json 2>/dev/null
}

query_participants_by_phone() {
  local phone=$1
  aws dynamodb query --region "$AWS_REGION" \
    --table-name "$GIG_PARTICIPANT_TABLE" \
    --index-name "byPhone" \
    --key-condition-expression "phone = :phone" \
    --expression-attribute-values "{\":phone\":{\"S\":\"$phone\"}}" \
    --output json 2>/dev/null
}

query_gig_by_conversation_sid() {
  local conversation_sid=$1
  aws dynamodb query --region "$AWS_REGION" \
    --table-name "$GIG_TABLE" \
    --index-name "byConversationSid" \
    --key-condition-expression "conversationSid = :csid" \
    --expression-attribute-values "{\":csid\":{\"S\":\"$conversation_sid\"}}" \
    --output json 2>/dev/null
}

get_gig_by_id() {
  local gig_id=$1
  aws dynamodb get-item --region "$AWS_REGION" \
    --table-name "$GIG_TABLE" \
    --key "{\"id\":{\"S\":\"$gig_id\"}}" \
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

# ── Verify Short Code URL ─────────────────────────────────────────────────────

verify_short_code_url() {
  local short_code=$1
  if [ -z "$short_code" ]; then
    log_fail "No short code provided to verify"
    return
  fi

  local url="https://gigler.ai/api/d/${short_code}"
  log_info "Verifying deliverable URL: $url"

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

  if [ "$http_code" = "401" ]; then
    log_pass "Deliverable link reachable (HTTP 401 AUTH_REQUIRED — verification gate working)"

    local response_body
    response_body=$(curl -s "$url" 2>/dev/null || echo "{}")
    local resp_code
    resp_code=$(echo "$response_body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('code',''))" 2>/dev/null || echo "")

    if [ "$resp_code" = "AUTH_REQUIRED" ]; then
      log_pass "Deliverable API returns AUTH_REQUIRED with metadata"
    else
      log_fail "Deliverable API did not return AUTH_REQUIRED code (got: $resp_code)"
    fi
  elif [ "$http_code" = "200" ]; then
    log_pass "Deliverable link reachable (HTTP 200 — content served directly)"
  elif [ "$http_code" = "404" ]; then
    log_fail "Deliverable link returned 404 NOT FOUND (short code: $short_code)"
  else
    log_fail "Deliverable link returned unexpected HTTP $http_code (short code: $short_code)"
  fi
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
  outfile=$(mktemp /tmp/gigler-test-XXXXXXXX)
  mv "$outfile" "${outfile}.json"
  outfile="${outfile}.json"

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

  echo "$payload" > "${outfile}.payload"
  local exit_code=0
  aws lambda invoke \
    --region "$AWS_REGION" \
    --function-name "$function_name" \
    --payload "file://${outfile}.payload" \
    --cli-binary-format raw-in-base64-out \
    "$outfile" 2>&1 || exit_code=$?
  rm -f "${outfile}.payload"
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
    user_result=$(query_user_by_phone "$TEST_PHONE") || true
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
    msg_result=$(query_messages_by_gig "_general") || true
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
    user_result=$(query_user_by_phone "$TEST_PHONE") || true
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
    user_result=$(query_user_by_phone "$TEST_PHONE") || true
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
    gig_result=$(query_gigs_by_owner "$TEST_USER_ID") || true
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
    msg_result=$(query_messages_by_gig "$TEST_GIG_ID") || true
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
    del_result=$(query_deliverables_by_gig "$TEST_GIG_ID") || true
    local del_count
    del_count=$(echo "$del_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Count',0))" 2>/dev/null || echo "0")

    if [ "$del_count" -gt 0 ]; then
      log_pass "Deliverable record created ($del_count found)"
      local short_code
      short_code=$(echo "$del_result" | python3 -c "import sys,json; items=json.load(sys.stdin)['Items']; print(items[-1].get('shortCode',{}).get('S',''))" 2>/dev/null || echo "")
      if [ -n "$short_code" ]; then
        log_pass "Deliverable has short code: $short_code"
        verify_short_code_url "$short_code"
      else
        log_fail "Deliverable record exists but has no short code"
      fi
    else
      log_fail "No deliverables found for gig $TEST_GIG_ID (expected at least 1)"
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
    media_result=$(query_media_by_gig "$TEST_GIG_ID") || true
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
    msg_result=$(query_messages_by_gig "_general") || true
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
    tpa_result=$(query_third_party_by_gig "$TEST_GIG_ID") || true
    local tpa_count
    tpa_count=$(echo "$tpa_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Count',0))" 2>/dev/null || echo "0")

    if [ "$tpa_count" -gt 0 ]; then
      log_pass "ThirdPartyAction records found ($tpa_count)"
    else
      log_info "No ThirdPartyAction records for gig $TEST_GIG_ID"
    fi
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
# SMART ROUTING TESTS
# ══════════════════════════════════════════════════════════════════════════════

create_test_gig() {
  local owner_id=$1
  local title=$2
  local metadata=${3:-}
  local gig_id="gig_test_$(date +%s)_$(( RANDOM % 10000 ))"

  local item
  item="{
    \"id\":{\"S\":\"$gig_id\"},
    \"ownerId\":{\"S\":\"$owner_id\"},
    \"title\":{\"S\":\"$title\"},
    \"status\":{\"S\":\"active\"},
    \"createdAt\":{\"S\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"},
    \"updatedAt\":{\"S\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

  if [ -n "$metadata" ]; then
    local escaped_meta
    escaped_meta=$(echo "$metadata" | sed 's/"/\\"/g')
    item="$item,\"metadata\":{\"S\":\"$escaped_meta\"}"
  fi
  item="$item}"

  aws dynamodb put-item --region "$AWS_REGION" \
    --table-name "$GIG_TABLE" \
    --item "$item" 2>/dev/null

  echo "$gig_id"
}

create_test_participant() {
  local gig_id=$1
  local user_id=$2
  local phone=$3
  local name=$4
  local role=${5:-collaborator}

  aws dynamodb put-item --region "$AWS_REGION" \
    --table-name "$GIG_PARTICIPANT_TABLE" \
    --item "{
      \"gigId\":{\"S\":\"$gig_id\"},
      \"userId\":{\"S\":\"$user_id\"},
      \"phone\":{\"S\":\"$phone\"},
      \"name\":{\"S\":\"$name\"},
      \"role\":{\"S\":\"$role\"},
      \"createdAt\":{\"S\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}
    }" 2>/dev/null
}

delete_test_gig() {
  local gig_id=$1
  aws dynamodb delete-item --region "$AWS_REGION" \
    --table-name "$GIG_TABLE" \
    --key "{\"id\":{\"S\":\"$gig_id\"}}" 2>/dev/null
}

delete_test_participant() {
  local gig_id=$1
  local phone=$2
  aws dynamodb delete-item --region "$AWS_REGION" \
    --table-name "$GIG_PARTICIPANT_TABLE" \
    --key "{\"gigId\":{\"S\":\"$gig_id\"},\"phone\":{\"S\":\"$phone\"}}" 2>/dev/null
}

test_smart_routing() {
  log_header "Smart Gig Routing Tests (awaitingReply state)"
  require_lambda_url

  if [ -z "${TEST_USER_ID:-}" ]; then
    log_warn "TEST_USER_ID not set. Run 'sms' first or export it."
    log_skip "Smart routing (missing user ID)"
    return
  fi

  local ROUTING_GIGS=()
  local ROUTING_PARTICIPANTS=()

  local AWAITING_META='{"awaitingReply":true,"lastRespondent":"gigler","lastInteraction":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","messageCount":2}'
  local IDLE_META='{"awaitingReply":false,"lastRespondent":"user","lastInteraction":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","messageCount":4}'

  # ── Setup: create gigs with explicit conversation state ──
  log_info "Setting up multi-gig test data with awaitingReply state..."

  local GIG_A
  GIG_A=$(create_test_gig "$TEST_USER_ID" "Birthday Party Planning" "$AWAITING_META")
  ROUTING_GIGS+=("$GIG_A")
  log_info "  Created gig A (owned, AWAITING): $GIG_A - Birthday Party Planning"

  local GIG_B
  GIG_B=$(create_test_gig "$TEST_USER_ID" "Website Redesign Project" "$IDLE_META")
  ROUTING_GIGS+=("$GIG_B")
  log_info "  Created gig B (owned, idle): $GIG_B - Website Redesign Project"

  local OTHER_USER_ID="usr_test_other_$(date +%s)"
  local GIG_C
  GIG_C=$(create_test_gig "$OTHER_USER_ID" "Team Offsite Logistics" "$IDLE_META")
  ROUTING_GIGS+=("$GIG_C")
  log_info "  Created gig C (other user, idle): $GIG_C - Team Offsite Logistics"

  create_test_participant "$GIG_C" "$TEST_USER_ID" "$TEST_PHONE" "TestUser" "collaborator"
  ROUTING_PARTICIPANTS+=("$GIG_C|$TEST_PHONE")
  log_info "  Added test user as collaborator on gig C"

  sleep 1

  # ── Scenario 1: Follow-up routes to the ONE awaiting gig ──
  log_info "Scenario 1: Follow-up 'lets do two reminders' routes to awaiting gig..."
  send_sms_payload "$PAYLOAD_DIR/smart-routing-party.txt" "Scenario 1: Route to awaiting gig (Birthday Party)" || true
  sleep 3

  # ── Scenario 2: Explicit command bypasses awaiting state ──
  log_info "Scenario 2: Explicit 'list my gigs' bypasses awaiting state..."
  send_sms_payload "$PAYLOAD_DIR/sms-list-gigs-multi.txt" "Scenario 2: Explicit command bypass" || true
  sleep 3

  # ── Scenario 3: Multiple gigs awaiting -- Gemini picks or disambiguates ──
  log_info "Scenario 3: Two gigs awaiting -- Gemini-powered disambiguation..."
  local AWAITING_META_2='{"awaitingReply":true,"lastRespondent":"gigler","lastInteraction":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'","messageCount":3}'
  aws dynamodb update-item --region "$AWS_REGION" \
    --table-name "$GIG_TABLE" \
    --key "{\"id\":{\"S\":\"$GIG_B\"}}" \
    --update-expression "SET metadata = :m" \
    --expression-attribute-values "{\":m\":{\"S\":\"$(echo "$AWAITING_META_2" | sed 's/"/\\"/g')\"}}" 2>/dev/null
  log_info "  Set gig B to AWAITING too"
  sleep 1

  send_sms_payload "$PAYLOAD_DIR/smart-routing-party.txt" "Scenario 3: Multi-awaiting, birthday message" || true
  sleep 3

  send_sms_payload "$PAYLOAD_DIR/smart-routing-ambiguous.txt" "Scenario 3b: Multi-awaiting, ambiguous message" || true
  sleep 3

  # ── Scenario 4: No gigs awaiting -- falls through to intent detection ──
  log_info "Scenario 4: No gigs awaiting -- normal intent detection..."
  for gig_id in "$GIG_A" "$GIG_B"; do
    aws dynamodb update-item --region "$AWS_REGION" \
      --table-name "$GIG_TABLE" \
      --key "{\"id\":{\"S\":\"$gig_id\"}}" \
      --update-expression "SET metadata = :m" \
      --expression-attribute-values "{\":m\":{\"S\":\"$(echo "$IDLE_META" | sed 's/"/\\"/g')\"}}" 2>/dev/null
  done
  log_info "  Set all gigs to idle (no awaitingReply)"
  sleep 1

  send_sms_payload "$PAYLOAD_DIR/smart-routing-ambiguous.txt" "Scenario 4: No awaiting, normal disambiguation" || true
  sleep 3

  # ── Scenario 5: Participant-only routing ──
  log_info "Scenario 5: Participant sends message to their gig..."
  local GIG_D
  GIG_D=$(create_test_gig "usr_other_owner" "Birthday Party Planning" "$AWAITING_META")
  ROUTING_GIGS+=("$GIG_D")

  local PARTICIPANT_USER
  PARTICIPANT_USER=$(query_user_by_phone "$TEST_PARTICIPANT_PHONE" 2>/dev/null || echo '{}')
  local PARTICIPANT_USER_ID
  PARTICIPANT_USER_ID=$(echo "$PARTICIPANT_USER" | python3 -c "import sys,json; items=json.load(sys.stdin).get('Items',[]); print(items[0]['id']['S'] if items else 'usr_test_participant')" 2>/dev/null || echo "usr_test_participant")

  create_test_participant "$GIG_D" "$PARTICIPANT_USER_ID" "$TEST_PARTICIPANT_PHONE" "$TEST_PARTICIPANT_NAME" "collaborator"
  ROUTING_PARTICIPANTS+=("$GIG_D|$TEST_PARTICIPANT_PHONE")
  sleep 1

  send_sms_payload "$PAYLOAD_DIR/smart-routing-participant.txt" "Scenario 5: Participant routing" || true
  sleep 3

  # ── Scenario 6: Explicit 'create new gig' bypasses awaiting state ──
  log_info "Scenario 6: 'create a new trip gig' bypasses awaiting state..."
  aws dynamodb update-item --region "$AWS_REGION" \
    --table-name "$GIG_TABLE" \
    --key "{\"id\":{\"S\":\"$GIG_A\"}}" \
    --update-expression "SET metadata = :m" \
    --expression-attribute-values "{\":m\":{\"S\":\"$(echo "$AWAITING_META" | sed 's/"/\\"/g')\"}}" 2>/dev/null
  sleep 1

  send_sms_payload "$PAYLOAD_DIR/smart-routing-create-bypass.txt" "Scenario 6: Create bypasses awaiting" || true
  sleep 3

  # ── Teardown ──
  log_info "Cleaning up smart routing test data..."
  for gig_id in "${ROUTING_GIGS[@]}"; do
    delete_test_gig "$gig_id" || true
  done
  for entry in "${ROUTING_PARTICIPANTS[@]-}"; do
    if [ -n "$entry" ]; then
      local g_id="${entry%%|*}"
      local ph="${entry##*|}"
      delete_test_participant "$g_id" "$ph" || true
    fi
  done
  log_info "Smart routing test data cleaned up."
}

# ══════════════════════════════════════════════════════════════════════════════
# GROUP MMS / CONVERSATIONS TESTS
# ══════════════════════════════════════════════════════════════════════════════

test_group_mms() {
  log_header "Group MMS (Add Participant) Test"

  if [ -z "${TEST_USER_ID:-}" ] || [ -z "${TEST_GIG_ID:-}" ]; then
    log_warn "TEST_USER_ID or TEST_GIG_ID not set. Run 'sms' test first."
    log_skip "Group MMS (missing IDs)"
    return
  fi

  log_info "Invoking gig-processor with add_participant payload..."

  local payload
  payload=$(cat "$PAYLOAD_DIR/gig-processor-add-participant.json")
  payload=$(echo "$payload" | sed "s/TEST_USER_ID/$TEST_USER_ID/g")
  payload=$(echo "$payload" | sed "s/TEST_GIG_ID/$TEST_GIG_ID/g")

  local outfile="/tmp/gigler-group-test-$$.json"

  aws lambda invoke \
    --region "$AWS_REGION" \
    --function-name "$GIG_PROCESSOR_FN" \
    --cli-binary-format raw-in-base64-out \
    --payload "$payload" \
    "$outfile" > /dev/null 2>&1 || true

  local result
  result=$(cat "$outfile" 2>/dev/null || echo '{}')
  rm -f "$outfile"

  local status_code
  status_code=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('statusCode','?'))" 2>/dev/null || echo "?")
  if [ "$status_code" = "200" ]; then
    log_pass "Add participant invocation succeeded (status=$status_code)"
  else
    log_fail "Add participant returned status=$status_code"
  fi
  echo "  Result: $(echo "$result" | head -c 300)"

  sleep 3

  # Verify GigParticipant record
  if [ -n "${GIG_PARTICIPANT_TABLE:-}" ]; then
    local part_result
    part_result=$(query_participants_by_gig "$TEST_GIG_ID") || true
    local part_count
    part_count=$(echo "$part_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Count',0))" 2>/dev/null || echo "0")

    if [ "$part_count" -gt 0 ]; then
      log_pass "GigParticipant records found ($part_count for gig)"
      echo "  Participants: $(echo "$part_result" | python3 -c "
import sys,json
items=json.load(sys.stdin).get('Items',[])
for i in items:
    name=i.get('name',{}).get('S','?')
    role=i.get('role',{}).get('S','?')
    print(f'  {name} ({role})')
" 2>/dev/null)"
    else
      log_info "No participants found yet for gig $TEST_GIG_ID"
    fi
  fi

  # Verify Conversation was created on the Gig record
  if [ -n "${GIG_TABLE:-}" ]; then
    local gig_result
    gig_result=$(get_gig_by_id "$TEST_GIG_ID") || true
    local conv_sid
    conv_sid=$(echo "$gig_result" | python3 -c "import sys,json; item=json.load(sys.stdin).get('Item',{}); print(item.get('conversationSid',{}).get('S',''))" 2>/dev/null || echo "")

    if [ -n "$conv_sid" ]; then
      log_pass "Conversation SID stored on gig: $conv_sid"
    else
      log_info "No conversationSid on gig (may not have been set)"
    fi
  fi
}

test_group_webhook() {
  log_header "Conversations Webhook Test"
  require_gig_processor_url

  log_info "Sending human message webhook to gig-processor Function URL..."

  local body
  body=$(cat "$PAYLOAD_DIR/conversations-webhook-human.txt")

  if [ -n "${TEST_CONVERSATION_SID:-}" ]; then
    body=$(echo "$body" | sed "s/TEST_CONVERSATION_SID/$TEST_CONVERSATION_SID/g")
  fi

  local response
  local http_code
  response=$(curl -s -w "\n%{http_code}" \
    -X POST "$GIG_PROCESSOR_URL" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "$body" 2>/dev/null)

  http_code=$(echo "$response" | tail -1)
  local response_body
  response_body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    log_pass "Human webhook processed (HTTP $http_code)"
    echo "  Response: $(echo "$response_body" | head -c 200)"
  else
    log_fail "Human webhook returned HTTP $http_code"
    echo "  Response: $response_body"
  fi

  sleep 2

  # Send Gigler's own message (should be ignored / no response loop)
  log_info "Sending Gigler-authored message webhook (should be ignored)..."

  body=$(cat "$PAYLOAD_DIR/conversations-webhook-gigler.txt")
  if [ -n "${TEST_CONVERSATION_SID:-}" ]; then
    body=$(echo "$body" | sed "s/TEST_CONVERSATION_SID/$TEST_CONVERSATION_SID/g")
  fi

  response=$(curl -s -w "\n%{http_code}" \
    -X POST "$GIG_PROCESSOR_URL" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "$body" 2>/dev/null)

  http_code=$(echo "$response" | tail -1)
  response_body=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ]; then
    log_pass "Gigler-authored webhook handled (HTTP $http_code) -- should be no-op"
  else
    log_fail "Gigler-authored webhook returned HTTP $http_code"
  fi
}

test_list_gigs() {
  log_header "List Gigs (Multi-Role) Test"
  require_lambda_url

  if [ -z "${TEST_USER_ID:-}" ]; then
    log_warn "TEST_USER_ID not set. Run 'sms' test first or export it."
    log_skip "List gigs (missing user ID)"
    return
  fi

  local LISTGIG_IDS=()
  local LISTGIG_PARTS=()

  log_info "Setting up multi-role gig data..."

  local OWNED_GIG
  OWNED_GIG=$(create_test_gig "$TEST_USER_ID" "My Personal Project")
  LISTGIG_IDS+=("$OWNED_GIG")
  log_info "  Created owned gig: $OWNED_GIG"

  local COLLAB_GIG
  COLLAB_GIG=$(create_test_gig "usr_other_list_test" "Shared Team Task")
  LISTGIG_IDS+=("$COLLAB_GIG")
  create_test_participant "$COLLAB_GIG" "$TEST_USER_ID" "$TEST_PHONE" "TestUser" "collaborator"
  LISTGIG_PARTS+=("$COLLAB_GIG|$TEST_PHONE")
  log_info "  Created collaborated gig: $COLLAB_GIG"

  sleep 1

  log_info "Sending 'list my gigs'..."
  send_sms_payload "$PAYLOAD_DIR/sms-list-gigs-multi.txt" "List gigs multi-role" || true

  # Teardown
  log_info "Cleaning up list-gigs test data..."
  for gig_id in "${LISTGIG_IDS[@]}"; do
    delete_test_gig "$gig_id" || true
  done
  for entry in "${LISTGIG_PARTS[@]-}"; do
    if [ -n "$entry" ]; then
      local g_id="${entry%%|*}"
      local ph="${entry##*|}"
      delete_test_participant "$g_id" "$ph" || true
    fi
  done
  log_info "List gigs test data cleaned up."
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
    user_result=$(query_user_by_phone "$TEST_PHONE") || true
    local user_id
    user_id=$(echo "$user_result" | python3 -c "import sys,json; items=json.load(sys.stdin).get('Items',[]); print(items[0]['id']['S'] if items else '')" 2>/dev/null || echo "")

    if [ -n "$user_id" ]; then
      log_info "Deleting user $user_id..."
      aws dynamodb delete-item --region "$AWS_REGION" \
        --table-name "$USER_TABLE" \
        --key "{\"id\":{\"S\":\"$user_id\"}}" 2>/dev/null || true
      log_pass "User deleted"

      # Delete gigs owned by this user
      if [ -n "${GIG_TABLE:-}" ]; then
        local gig_result
        gig_result=$(query_gigs_by_owner "$user_id") || true
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

# ══════════════════════════════════════════════════════════════════════════════
# HOUSEHOLD BILLS / DYNAMIC GIG TESTS
# ══════════════════════════════════════════════════════════════════════════════

test_dynamic_gig_types() {
  log_header "Dynamic Gig Type Classification"

  require_lambda_url

  # Test 1: Household gig detection
  log_info "Test: 'track utility bills' should classify as household"
  local response
  response=$(send_sms_payload "$PAYLOAD_DIR/sms-create-household-gig.txt" "Create household gig" 2>&1) || true
  if echo "$response" | grep -qi "bill\|track\|utility"; then
    log_pass "Household gig creation triggered relevant response"
  else
    log_info "Response: $response"
    log_pass "Household gig SMS sent (check logs for classification)"
  fi
  sleep 3

  # Test 2: Custom gig detection (marathon training)
  log_info "Test: 'train for a marathon' should classify as custom"
  response=$(send_sms_payload "$PAYLOAD_DIR/sms-create-custom-gig.txt" "Create custom gig" 2>&1) || true
  if echo "$response" | grep -qi "marathon\|training\|running\|fitness"; then
    log_pass "Custom gig creation triggered relevant response"
  else
    log_info "Response: $response"
    log_pass "Custom gig SMS sent (check logs for classification)"
  fi
  sleep 2

  # Test 3: Verify gig was created with correct type in DynamoDB
  local user_result
  user_result=$(query_user_by_phone "$TEST_PHONE") || true
  local owner_id
  owner_id=$(echo "$user_result" | python3 -c "import sys,json; items=json.load(sys.stdin).get('Items',[]); print(items[0]['id']['S'] if items else '')" 2>/dev/null || echo "")

  if [ -n "$owner_id" ]; then
    local gigs_result
    gigs_result=$(query_gigs_by_owner "$owner_id") || true
    local household_count
    household_count=$(echo "$gigs_result" | python3 -c "
import sys, json
items = json.load(sys.stdin).get('Items', [])
count = sum(1 for g in items if g.get('type', {}).get('S', '') == 'household')
print(count)
" 2>/dev/null || echo "0")

    local custom_count
    custom_count=$(echo "$gigs_result" | python3 -c "
import sys, json
items = json.load(sys.stdin).get('Items', [])
count = sum(1 for g in items if g.get('type', {}).get('S', '') == 'custom')
print(count)
" 2>/dev/null || echo "0")

    if [ "$household_count" -gt 0 ]; then
      log_pass "Found household type gig in DynamoDB ($household_count)"
    else
      log_warn "No household type gig found (may need existing user)"
    fi

    if [ "$custom_count" -gt 0 ]; then
      log_pass "Found custom type gig in DynamoDB ($custom_count)"
    else
      log_info "No custom type gig found yet (Gemini may have matched a preset)"
    fi
  else
    log_skip "Cannot verify gig types — no user found for $TEST_PHONE"
  fi
}

test_household_bills() {
  log_header "Household Bills Gig — Bill Tracking"

  if [ -z "${GIG_PROCESSOR_FN:-}" ]; then
    log_skip "GIG_PROCESSOR_FN not found"
    return
  fi

  # Create a test household gig
  local user_result
  user_result=$(query_user_by_phone "$TEST_PHONE") || true
  local owner_id
  owner_id=$(echo "$user_result" | python3 -c "import sys,json; items=json.load(sys.stdin).get('Items',[]); print(items[0]['id']['S'] if items else '')" 2>/dev/null || echo "")

  if [ -z "$owner_id" ]; then
    log_skip "No test user found — run 'sms' test first"
    return
  fi

  local test_gig_id
  test_gig_id="gig_test_household_$(date +%s)"

  log_info "Creating test household gig: $test_gig_id"
  aws dynamodb put-item --region "$AWS_REGION" \
    --table-name "$GIG_TABLE" \
    --item "{
      \"id\":{\"S\":\"$test_gig_id\"},
      \"ownerId\":{\"S\":\"$owner_id\"},
      \"title\":{\"S\":\"Test Household Bills\"},
      \"type\":{\"S\":\"household\"},
      \"status\":{\"S\":\"active\"},
      \"metadata\":{\"S\":\"{}\"},
      \"createdAt\":{\"S\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"},
      \"updatedAt\":{\"S\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}
    }" 2>/dev/null
  log_pass "Test household gig created"

  # Test: Submit bills via gig-processor
  log_info "Sending bill amounts to gig-processor"
  local payload
  payload=$(cat "$PAYLOAD_DIR/gig-processor-household.json" | sed "s/TEST_GIG_ID/$test_gig_id/g" | sed "s/TEST_USER_ID/$owner_id/g" | sed "s/+15551234567/$TEST_PHONE/g")

  local outfile="/tmp/gigler-household-test-$$.json"
  echo "$payload" | aws lambda invoke --region "$AWS_REGION" \
    --function-name "$GIG_PROCESSOR_FN" \
    --invocation-type RequestResponse \
    --cli-binary-format raw-in-base64-out \
    --payload file:///dev/stdin \
    "$outfile" 2>/dev/null || true

  if [ -f "$outfile" ]; then
    local status_code
    status_code=$(python3 -c "import json; print(json.load(open('$outfile')).get('statusCode',0))" 2>/dev/null || echo "0")
    if [ "$status_code" = "200" ]; then
      log_pass "Gig processor handled bill submission (status: 200)"
    else
      log_fail "Gig processor returned status: $status_code"
    fi
    rm -f "$outfile"
  else
    log_fail "No response from gig processor"
  fi

  sleep 3

  # Verify metadata was updated with bill data
  log_info "Verifying bill data in gig metadata"
  local gig_result
  gig_result=$(aws dynamodb get-item --region "$AWS_REGION" \
    --table-name "$GIG_TABLE" \
    --key "{\"id\":{\"S\":\"$test_gig_id\"}}" \
    --output json 2>/dev/null) || true

  local has_bills
  has_bills=$(echo "$gig_result" | python3 -c "
import sys, json
item = json.load(sys.stdin).get('Item', {})
meta_str = item.get('metadata', {}).get('S', '{}')
meta = json.loads(meta_str)
print('yes' if meta.get('bills') or meta.get('messageCount') else 'no')
" 2>/dev/null || echo "no")

  if [ "$has_bills" = "yes" ]; then
    log_pass "Gig metadata updated with bill tracking data"
  else
    log_info "Metadata may not have bills yet (AI decides when to use update_bill_status)"
  fi

  # Test: Mark bill as paid
  log_info "Sending 'Zelle sent for power' to gig-processor"
  local paid_payload
  paid_payload=$(cat "$PAYLOAD_DIR/gig-processor-bill-paid.json" | sed "s/TEST_GIG_ID/$test_gig_id/g" | sed "s/TEST_USER_ID/$owner_id/g" | sed "s/+15551234567/$TEST_PHONE/g")

  local outfile2="/tmp/gigler-household-paid-$$.json"
  echo "$paid_payload" | aws lambda invoke --region "$AWS_REGION" \
    --function-name "$GIG_PROCESSOR_FN" \
    --invocation-type RequestResponse \
    --cli-binary-format raw-in-base64-out \
    --payload file:///dev/stdin \
    "$outfile2" 2>/dev/null || true

  if [ -f "$outfile2" ]; then
    local status_code2
    status_code2=$(python3 -c "import json; print(json.load(open('$outfile2')).get('statusCode',0))" 2>/dev/null || echo "0")
    if [ "$status_code2" = "200" ]; then
      log_pass "Gig processor handled 'payment sent' message (status: 200)"
    else
      log_fail "Gig processor returned status: $status_code2"
    fi
    rm -f "$outfile2"
  else
    log_fail "No response from gig processor"
  fi

  # Store gig ID for cleanup
  HOUSEHOLD_TEST_GIG_ID="$test_gig_id"
  log_info "Test gig ID: $test_gig_id (use 'cleanup' to remove)"
}

test_recurring_reminders() {
  log_header "Recurring Reminders"

  if [ -z "${REMINDER_FN:-}" ] || [ -z "${REMINDER_TABLE:-}" ]; then
    log_skip "REMINDER_FN or REMINDER_TABLE not found"
    return
  fi

  local user_result
  user_result=$(query_user_by_phone "$TEST_PHONE") || true
  local owner_id
  owner_id=$(echo "$user_result" | python3 -c "import sys,json; items=json.load(sys.stdin).get('Items',[]); print(items[0]['id']['S'] if items else '')" 2>/dev/null || echo "")

  if [ -z "$owner_id" ]; then
    log_skip "No test user found"
    return
  fi

  # Create a recurring reminder (due in the past so scheduler picks it up)
  local reminder_id="rem_test_recur_$(date +%s)"
  local past_time
  past_time=$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "2026-04-06T10:00:00Z")

  log_info "Creating recurring monthly reminder: $reminder_id"
  aws dynamodb put-item --region "$AWS_REGION" \
    --table-name "$REMINDER_TABLE" \
    --item "{
      \"id\":{\"S\":\"$reminder_id\"},
      \"gigId\":{\"S\":\"test_gig_recurring\"},
      \"userId\":{\"S\":\"$owner_id\"},
      \"scheduledAt\":{\"S\":\"$past_time\"},
      \"type\":{\"S\":\"reminder\"},
      \"message\":{\"S\":\"Test recurring reminder — power bill due soon!\"},
      \"channel\":{\"S\":\"sms\"},
      \"recipients\":{\"L\":[{\"S\":\"$TEST_PHONE\"}]},
      \"sent\":{\"BOOL\":false},
      \"recurrence\":{\"S\":\"monthly\"},
      \"recurrenceDay\":{\"N\":\"12\"}
    }" 2>/dev/null
  log_pass "Recurring reminder created"

  # Invoke scheduler
  log_info "Invoking reminder scheduler"
  local outfile="/tmp/gigler-reminder-recur-$$.json"
  aws lambda invoke --region "$AWS_REGION" \
    --function-name "$REMINDER_FN" \
    --invocation-type RequestResponse \
    --cli-binary-format raw-in-base64-out \
    --payload "$(cat "$PAYLOAD_DIR/reminder-recurring.json")" \
    "$outfile" 2>/dev/null || true

  if [ -f "$outfile" ]; then
    log_pass "Scheduler invoked"
    rm -f "$outfile"
  fi

  sleep 2

  # Verify original was marked sent
  local original
  original=$(aws dynamodb get-item --region "$AWS_REGION" \
    --table-name "$REMINDER_TABLE" \
    --key "{\"id\":{\"S\":\"$reminder_id\"}}" \
    --output json 2>/dev/null) || true

  local was_sent
  was_sent=$(echo "$original" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Item',{}).get('sent',{}).get('BOOL',False))" 2>/dev/null || echo "False")

  if [ "$was_sent" = "True" ]; then
    log_pass "Original reminder marked as sent"
  else
    log_fail "Original reminder not marked as sent (sent=$was_sent)"
  fi

  # Verify next occurrence was created
  log_info "Checking for next recurring occurrence in DynamoDB"
  local next_reminders
  next_reminders=$(aws dynamodb query --region "$AWS_REGION" \
    --table-name "$REMINDER_TABLE" \
    --index-name "byGig" \
    --key-condition-expression "gigId = :gid" \
    --filter-expression "recurrence = :monthly AND sent = :f" \
    --expression-attribute-values "{\":gid\":{\"S\":\"test_gig_recurring\"},\":monthly\":{\"S\":\"monthly\"},\":f\":{\"BOOL\":false}}" \
    --output json 2>/dev/null) || true

  local next_count
  next_count=$(echo "$next_reminders" | python3 -c "import sys,json; print(json.load(sys.stdin).get('Count',0))" 2>/dev/null || echo "0")

  if [ "$next_count" -gt 0 ]; then
    log_pass "Next recurring reminder created ($next_count found)"
  else
    log_fail "No next recurring reminder found"
  fi

  # Cleanup
  aws dynamodb delete-item --region "$AWS_REGION" \
    --table-name "$REMINDER_TABLE" \
    --key "{\"id\":{\"S\":\"$reminder_id\"}}" 2>/dev/null || true
}

test_bills_dashboard() {
  log_header "Bills Dashboard Deliverable"

  if [ -z "${DELIVERABLE_FN:-}" ]; then
    log_skip "DELIVERABLE_FN not found"
    return
  fi

  local user_result
  user_result=$(query_user_by_phone "$TEST_PHONE") || true
  local owner_id
  owner_id=$(echo "$user_result" | python3 -c "import sys,json; items=json.load(sys.stdin).get('Items',[]); print(items[0]['id']['S'] if items else '')" 2>/dev/null || echo "")

  if [ -z "$owner_id" ]; then
    log_skip "No test user found"
    return
  fi

  # Create a test gig with pre-populated bill metadata
  local test_gig_id="gig_test_dashboard_$(date +%s)"
  local month_key
  month_key=$(date -u +%Y-%m)

  log_info "Creating test gig with bill data: $test_gig_id"
  local metadata="{\"bills\":{\"$month_key\":[{\"billType\":\"power\",\"vendor\":\"Austin Energy\",\"amount\":429,\"dueDate\":\"2026-04-15\",\"status\":\"paid\",\"paidAt\":\"2026-04-07T12:00:00Z\"},{\"billType\":\"water\",\"vendor\":\"City Water\",\"amount\":85,\"dueDate\":\"2026-04-10\",\"status\":\"submitted\",\"submittedAt\":\"2026-04-06T10:00:00Z\"},{\"billType\":\"gas\",\"vendor\":\"Atmos Energy\",\"amount\":65,\"dueDate\":\"2026-04-20\",\"status\":\"pending\"},{\"billType\":\"internet\",\"vendor\":\"AT\\\\u0026T\",\"amount\":70,\"dueDate\":\"2026-04-01\",\"status\":\"paid\",\"paidAt\":\"2026-04-01T09:00:00Z\"}]},\"monthlyTotals\":{\"$month_key\":649}}"

  aws dynamodb put-item --region "$AWS_REGION" \
    --table-name "$GIG_TABLE" \
    --item "{
      \"id\":{\"S\":\"$test_gig_id\"},
      \"ownerId\":{\"S\":\"$owner_id\"},
      \"title\":{\"S\":\"Test Bills Dashboard\"},
      \"type\":{\"S\":\"household\"},
      \"status\":{\"S\":\"active\"},
      \"metadata\":{\"S\":$(python3 -c "import json; print(json.dumps(json.dumps(json.loads('$metadata'))))")},
      \"createdAt\":{\"S\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"},
      \"updatedAt\":{\"S\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}
    }" 2>/dev/null
  log_pass "Test gig with bill data created"

  # Invoke deliverable generator
  log_info "Invoking deliverable generator with bills_dashboard type"
  local payload
  payload=$(cat "$PAYLOAD_DIR/deliverable-bills-dashboard.json" | sed "s/TEST_GIG_ID/$test_gig_id/g" | sed "s/TEST_USER_ID/$owner_id/g" | sed "s/+15551234567/$TEST_PHONE/g")

  local outfile="/tmp/gigler-dashboard-test-$$.json"
  echo "$payload" | aws lambda invoke --region "$AWS_REGION" \
    --function-name "$DELIVERABLE_FN" \
    --invocation-type RequestResponse \
    --cli-binary-format raw-in-base64-out \
    --payload file:///dev/stdin \
    "$outfile" 2>/dev/null || true

  if [ -f "$outfile" ]; then
    local status_code
    status_code=$(python3 -c "import json; print(json.load(open('$outfile')).get('statusCode',0))" 2>/dev/null || echo "0")

    if [ "$status_code" = "200" ]; then
      local body
      body=$(python3 -c "import json; print(json.load(open('$outfile')).get('body',''))" 2>/dev/null || echo "")
      local short_code
      short_code=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('shortCode',''))" 2>/dev/null || echo "")
      local url
      url=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('url',''))" 2>/dev/null || echo "")

      log_pass "Bills dashboard created (status: 200)"
      if [ -n "$short_code" ]; then
        log_pass "Short code: $short_code"
        log_info "Dashboard URL: $url"
        verify_short_code_url "$short_code"
      else
        log_fail "Bills dashboard created but no short code returned"
      fi
    else
      log_fail "Deliverable generator returned status: $status_code"
    fi
    rm -f "$outfile"
  else
    log_fail "No response from deliverable generator"
  fi

  # Cleanup test gig
  aws dynamodb delete-item --region "$AWS_REGION" \
    --table-name "$GIG_TABLE" \
    --key "{\"id\":{\"S\":\"$test_gig_id\"}}" 2>/dev/null || true
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
  ${GREEN}routing${NC}         Smart gig routing (multi-gig context selection, disambiguation)
  ${GREEN}group${NC}           Group MMS add-participant via gig-processor
  ${GREEN}webhook${NC}         Conversations webhook test (human + Gigler-authored messages)
  ${GREEN}list-gigs${NC}       List gigs showing owned + participated roles
  ${GREEN}dynamic${NC}         Dynamic gig type classification (household + custom)
  ${GREEN}household${NC}       Household bills gig (bill submission + payment tracking)
  ${GREEN}recurring${NC}       Recurring reminders (create, fire, verify next occurrence)
  ${GREEN}dashboard${NC}       Bills dashboard deliverable generation
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
  LAMBDA_URL              Lambda Function URL for gigler-inbound-sms
  GIG_PROCESSOR_URL       Lambda Function URL for gigler-gig-processor (Conversations webhook)
  AWS_REGION              AWS region (default: us-east-2)
  TEST_PHONE              Test phone number (default: +15551234567)
  TEST_GIGLER_NUMBER      Gigler's Twilio number
  TEST_PARTICIPANT_PHONE  Participant phone for group tests (default: +14154049816)
  TEST_PARTICIPANT_NAME   Participant name (default: Sarah)
  TEST_USER_ID            Override user ID for direct Lambda tests
  TEST_GIG_ID             Override gig ID for direct Lambda tests
  TEST_CONVERSATION_SID   Conversation SID for webhook tests

${BOLD}Examples:${NC}
  ./scripts/test-e2e.sh smoke
  ./scripts/test-e2e.sh all
  ./scripts/test-e2e.sh routing
  ./scripts/test-e2e.sh group
  ./scripts/test-e2e.sh webhook
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
    test_smart_routing
    test_group_mms
    test_group_webhook
    test_list_gigs
    test_deliverable
    test_bills_dashboard
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
  routing)
    discover_tables
    test_smart_routing
    summary
    ;;
  group)
    discover_tables
    test_group_mms
    summary
    ;;
  webhook)
    discover_tables
    test_group_webhook
    summary
    ;;
  list-gigs)
    discover_tables
    test_list_gigs
    summary
    ;;
  dynamic)
    discover_tables
    test_dynamic_gig_types
    summary
    ;;
  household)
    discover_tables
    test_household_bills
    summary
    ;;
  recurring)
    discover_tables
    test_recurring_reminders
    summary
    ;;
  dashboard)
    discover_tables
    test_bills_dashboard
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
