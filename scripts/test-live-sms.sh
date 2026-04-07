#!/bin/bash
# Gigler Live SMS E2E Test Suite
#
# Sends REAL SMS messages via the Twilio API to the Gigler number and
# polls for inbound replies. Requires Twilio credentials in .env.test.
#
# Usage: ./scripts/test-live-sms.sh [command]
# Commands: onboard, routing, group, all, help

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

log_pass() { ((PASS_COUNT++)); echo -e "${GREEN}✓ PASS${NC}: $1"; }
log_fail() { ((FAIL_COUNT++)); echo -e "${RED}✗ FAIL${NC}: $1"; }
log_skip() { ((SKIP_COUNT++)); echo -e "${YELLOW}⊘ SKIP${NC}: $1"; }
log_info() { echo -e "${BLUE}ℹ INFO${NC}: $1"; }
log_warn() { echo -e "${YELLOW}⚠ WARN${NC}: $1"; }
log_header() { echo -e "\n${CYAN}${BOLD}━━━ $1 ━━━${NC}\n"; }

summary() {
  echo ""
  log_header "Live SMS Test Summary"
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

# ── Load config ───────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/../.env.test" ]; then
  set -a
  source "$SCRIPT_DIR/../.env.test"
  set +a
fi

: "${TEST_PHONE:?Set TEST_PHONE in .env.test (your real phone)}"
: "${TEST_GIGLER_NUMBER:?Set TEST_GIGLER_NUMBER in .env.test}"
: "${TWILIO_ACCOUNT_SID:?Set TWILIO_ACCOUNT_SID in .env.test}"
: "${TWILIO_AUTH_TOKEN:?Set TWILIO_AUTH_TOKEN in .env.test}"
: "${TWILIO_MESSAGING_SERVICE_SID:?Set TWILIO_MESSAGING_SERVICE_SID in .env.test}"
: "${AWS_REGION:=us-east-2}"

TWILIO_API="https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID"

# ── Twilio Helpers ────────────────────────────────────────────────────────────

send_sms() {
  local to=$1
  local body=$2
  local from=${3:-$TEST_GIGLER_NUMBER}

  log_info "Sending SMS to $to: \"$body\""

  local response
  response=$(curl -s -X POST "$TWILIO_API/Messages.json" \
    -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
    --data-urlencode "To=$to" \
    --data-urlencode "From=$from" \
    --data-urlencode "MessagingServiceSid=$TWILIO_MESSAGING_SERVICE_SID" \
    --data-urlencode "Body=$body" 2>/dev/null)

  local sid
  sid=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('sid',''))" 2>/dev/null || echo "")

  if [ -n "$sid" ]; then
    log_info "  Message SID: $sid"
    echo "$sid"
  else
    local err
    err=$(echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message','unknown error'))" 2>/dev/null || echo "unknown")
    log_fail "Failed to send SMS: $err"
    echo ""
  fi
}

poll_for_reply() {
  local from=$1
  local to=$2
  local after_sid=$3
  local max_wait=${4:-30}
  local keyword=${5:-}

  log_info "Polling for reply from $from (max ${max_wait}s)..."

  local elapsed=0
  local interval=5

  while [ "$elapsed" -lt "$max_wait" ]; do
    sleep "$interval"
    elapsed=$((elapsed + interval))

    local messages
    messages=$(curl -s "$TWILIO_API/Messages.json?From=$from&To=$to&PageSize=5" \
      -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" 2>/dev/null)

    local latest_sid
    latest_sid=$(echo "$messages" | python3 -c "
import sys, json
msgs = json.load(sys.stdin).get('messages', [])
for m in msgs:
    if m.get('sid','') != '$after_sid':
        print(m['sid'])
        break
" 2>/dev/null || echo "")

    if [ -n "$latest_sid" ]; then
      local body
      body=$(echo "$messages" | python3 -c "
import sys, json
msgs = json.load(sys.stdin).get('messages', [])
for m in msgs:
    if m['sid'] == '$latest_sid':
        print(m.get('body',''))
        break
" 2>/dev/null || echo "")

      log_info "  Reply received (${elapsed}s): $(echo "$body" | head -c 120)..."

      if [ -n "$keyword" ]; then
        if echo "$body" | grep -qi "$keyword"; then
          log_pass "Reply contains '$keyword'"
        else
          log_warn "Reply does not contain '$keyword'"
        fi
      else
        log_pass "Reply received within ${max_wait}s"
      fi
      echo "$body"
      return 0
    fi

    log_info "  ...waiting (${elapsed}s / ${max_wait}s)"
  done

  log_fail "No reply received within ${max_wait}s"
  echo ""
  return 1
}

# ── DynamoDB Helpers ──────────────────────────────────────────────────────────

find_table() {
  local pattern=$1
  aws dynamodb list-tables --region "$AWS_REGION" --output text \
    --query "TableNames[?contains(@, \`$pattern\`)]" 2>/dev/null | head -1
}

discover_tables() {
  USER_TABLE=${USER_TABLE:-$(find_table "User-")}
  GIG_TABLE=${GIG_TABLE:-$(find_table "Gig-" | grep -v "GigParticipant" | head -1)}
  GIG_PARTICIPANT_TABLE=${GIG_PARTICIPANT_TABLE:-$(find_table "GigParticipant")}
}

# ══════════════════════════════════════════════════════════════════════════════
# LIVE SMS TEST SCENARIOS
# ══════════════════════════════════════════════════════════════════════════════

test_live_onboarding() {
  log_header "Live SMS: Onboarding Flow"

  log_warn "This test sends REAL SMS from Gigler number to $TEST_PHONE."
  log_warn "Make sure $TEST_PHONE is a real phone you control."
  echo ""

  # Send "Hi" to trigger onboarding
  local sid
  sid=$(send_sms "$TEST_GIGLER_NUMBER" "Hi" "$TEST_PHONE")
  if [ -z "$sid" ]; then return 1; fi

  local reply
  reply=$(poll_for_reply "$TEST_GIGLER_NUMBER" "$TEST_PHONE" "$sid" 30 "name")
  if [ -z "$reply" ]; then return 1; fi

  sleep 2

  # Send name
  sid=$(send_sms "$TEST_GIGLER_NUMBER" "TestUser" "$TEST_PHONE")
  if [ -z "$sid" ]; then return 1; fi

  reply=$(poll_for_reply "$TEST_GIGLER_NUMBER" "$TEST_PHONE" "$sid" 30 "gig")
  if [ -z "$reply" ]; then return 1; fi

  log_pass "Onboarding flow completed via live SMS"
}

test_live_routing() {
  log_header "Live SMS: Smart Routing"
  discover_tables

  log_warn "This test sends REAL SMS. Ensure $TEST_PHONE has an onboarded user with multiple gigs."
  echo ""

  # Send an ambiguous message
  local sid
  sid=$(send_sms "$TEST_GIGLER_NUMBER" "What's the status?" "$TEST_PHONE")
  if [ -z "$sid" ]; then return 1; fi

  local reply
  reply=$(poll_for_reply "$TEST_GIGLER_NUMBER" "$TEST_PHONE" "$sid" 45)

  if [ -n "$reply" ]; then
    log_pass "Routing response received"
    if echo "$reply" | grep -qi "which\|gig\|pick\|select"; then
      log_info "  AI sent disambiguation prompt (multiple gigs detected)"
    else
      log_info "  AI auto-routed to a specific gig"
    fi
  fi
}

test_live_group() {
  log_header "Live SMS: Group MMS"

  log_warn "This test sends REAL SMS to add a participant."
  log_warn "Participant phone: $TEST_PARTICIPANT_PHONE ($TEST_PARTICIPANT_NAME)"
  echo ""

  # Send add-participant message
  local sid
  sid=$(send_sms "$TEST_GIGLER_NUMBER" "Add $TEST_PARTICIPANT_NAME $TEST_PARTICIPANT_PHONE" "$TEST_PHONE")
  if [ -z "$sid" ]; then return 1; fi

  local reply
  reply=$(poll_for_reply "$TEST_GIGLER_NUMBER" "$TEST_PHONE" "$sid" 45 "added\|participant\|loop")

  if [ -n "$reply" ]; then
    log_pass "Add participant confirmation received"
  fi

  # Check if participant received a welcome
  log_info "Checking if participant received welcome SMS..."
  sleep 5

  local part_messages
  part_messages=$(curl -s "$TWILIO_API/Messages.json?To=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TEST_PARTICIPANT_PHONE'))")&From=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$TEST_GIGLER_NUMBER'))")&PageSize=3" \
    -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" 2>/dev/null)

  local welcome_count
  welcome_count=$(echo "$part_messages" | python3 -c "
import sys, json
msgs = json.load(sys.stdin).get('messages', [])
count = sum(1 for m in msgs if 'Gigler' in m.get('body','') or 'added' in m.get('body','').lower())
print(count)
" 2>/dev/null || echo "0")

  if [ "$welcome_count" -gt 0 ]; then
    log_pass "Participant received welcome/notification SMS ($welcome_count messages)"
  else
    log_info "No welcome SMS found for participant (may take longer)"
  fi
}

# ── Help ──────────────────────────────────────────────────────────────────────

show_help() {
  cat <<HELPEOF

${CYAN}${BOLD}Gigler Live SMS E2E Test Suite${NC}

Sends REAL SMS via Twilio API and polls for replies.
Requires Twilio credentials in .env.test.

${BOLD}Usage:${NC}
  ./scripts/test-live-sms.sh <command>

${BOLD}Commands:${NC}
  ${GREEN}onboard${NC}   New user onboarding (Hi -> name -> gig prompt)
  ${GREEN}routing${NC}   Smart routing test (ambiguous message)
  ${GREEN}group${NC}     Add participant via SMS
  ${GREEN}all${NC}       Run all live tests
  ${GREEN}help${NC}      Show this help

${BOLD}Prerequisites:${NC}
  1. Copy .env.test.example to .env.test
  2. Fill in TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_MESSAGING_SERVICE_SID
  3. Set TEST_PHONE to a real phone number you control

${YELLOW}WARNING: These tests send real SMS and may incur Twilio charges.${NC}

HELPEOF
}

# ══════════════════════════════════════════════════════════════════════════════
# MAIN DISPATCHER
# ══════════════════════════════════════════════════════════════════════════════

case "${1:-help}" in
  onboard)
    test_live_onboarding
    summary
    ;;
  routing)
    test_live_routing
    summary
    ;;
  group)
    test_live_group
    summary
    ;;
  all)
    test_live_onboarding
    test_live_routing
    test_live_group
    summary
    ;;
  help|*)
    show_help
    ;;
esac
