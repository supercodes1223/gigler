#!/usr/bin/env bash
###############################################################################
# Gigler Post-Deploy Smoke Test
#
# Verifies the deployed system works end-to-end via Twilio API.
# Usage: ./scripts/smoke-test.sh [PHONE]
#   PHONE - test phone number in E.164 format (default: from .env TEST_PHONE)
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

if [[ -f "$PROJECT_ROOT/.env" ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

TWILIO_SID="${TWILIO_ACCOUNT_SID:-}"
TWILIO_TOKEN="${TWILIO_AUTH_TOKEN:-}"
GIGLER_NUM="${GIGLER_NUMBER:-}"
MESSAGING_SID="${TWILIO_MESSAGING_SERVICE_SID:-}"
TEST_PHONE="${1:-${TEST_PHONE:-}}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; FAILURES=$((FAILURES + 1)); }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
FAILURES=0

echo "════════════════════════════════════════════════════════"
echo " Gigler Smoke Test"
echo "════════════════════════════════════════════════════════"

if [[ -z "$TWILIO_SID" || -z "$TWILIO_TOKEN" ]]; then
  fail "Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN"
  exit 1
fi

if [[ -z "$GIGLER_NUM" ]]; then
  fail "Missing GIGLER_NUMBER"
  exit 1
fi

if [[ -z "$TEST_PHONE" ]]; then
  fail "No test phone number. Pass as arg or set TEST_PHONE in .env"
  exit 1
fi

echo ""
echo "Config:"
echo "  Gigler Number: $GIGLER_NUM"
echo "  Test Phone:    $TEST_PHONE"
echo "  Messaging SID: ${MESSAGING_SID:-(none)}"
echo ""

# ── 1. Send test SMS ──────────────────────────────────────────────────────────
echo "1. Sending test message..."

SEND_PARAMS="To=$TEST_PHONE&Body=Gigler+smoke+test+$(date +%s)&From=$GIGLER_NUM"
if [[ -n "$MESSAGING_SID" ]]; then
  SEND_PARAMS="$SEND_PARAMS&MessagingServiceSid=$MESSAGING_SID"
fi

SEND_RESULT=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_SID/Messages.json" \
  -u "$TWILIO_SID:$TWILIO_TOKEN" \
  --data "$SEND_PARAMS" 2>/dev/null || echo "000")

if [[ "$SEND_RESULT" == "201" ]]; then
  pass "Outbound SMS sent (HTTP 201)"
else
  fail "Outbound SMS failed (HTTP $SEND_RESULT)"
fi

# ── 2. Check Twilio number configuration ─────────────────────────────────────
echo ""
echo "2. Checking Twilio number configuration..."

CLEAN_NUM=$(echo "$GIGLER_NUM" | sed 's/+/%2B/')
NUM_DATA=$(curl -s \
  "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_SID/IncomingPhoneNumbers.json?PhoneNumber=$CLEAN_NUM" \
  -u "$TWILIO_SID:$TWILIO_TOKEN" 2>/dev/null || echo '{}')

SMS_URL=$(echo "$NUM_DATA" | python3 -c "import sys,json; d=json.load(sys.stdin); nums=d.get('incoming_phone_numbers',[]); print(nums[0].get('sms_url','') if nums else '')" 2>/dev/null || echo "")

if [[ -n "$SMS_URL" && "$SMS_URL" != "null" ]]; then
  pass "SmsUrl configured: ${SMS_URL:0:60}..."
else
  fail "SmsUrl not configured on $GIGLER_NUM"
fi

# ── 3. Check Lambda Function URL availability ────────────────────────────────
echo ""
echo "3. Checking Lambda Function URL availability..."

if [[ -n "$SMS_URL" && "$SMS_URL" != "null" ]]; then
  HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SMS_URL" 2>/dev/null || echo "000")
  if [[ "$HEALTH_CODE" == "200" || "$HEALTH_CODE" == "400" || "$HEALTH_CODE" == "403" ]]; then
    pass "Lambda Function URL reachable (HTTP $HEALTH_CODE)"
  else
    fail "Lambda Function URL unreachable (HTTP $HEALTH_CODE)"
  fi
else
  warn "Skipping — no SmsUrl to test"
fi

# ── 4. Check gigler.ai homepage ──────────────────────────────────────────────
echo ""
echo "4. Checking gigler.ai homepage..."

HOMEPAGE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://gigler.ai" 2>/dev/null || echo "000")
if [[ "$HOMEPAGE_CODE" == "200" ]]; then
  pass "gigler.ai homepage reachable (HTTP 200)"
else
  fail "gigler.ai homepage returned HTTP $HOMEPAGE_CODE"
fi

# ── 5. Check gigler.ai/contact page ──────────────────────────────────────────
echo ""
echo "5. Checking gigler.ai/contact page..."

CONTACT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://gigler.ai/contact" 2>/dev/null || echo "000")
if [[ "$CONTACT_CODE" == "200" ]]; then
  pass "gigler.ai/contact page reachable (HTTP 200)"
else
  fail "gigler.ai/contact page returned HTTP $CONTACT_CODE"
fi

# ── 6. Check vCard file availability ─────────────────────────────────────────
echo ""
echo "6. Checking vCard file..."

VCARD_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://gigler.ai/gigler.vcf" 2>/dev/null || echo "000")
if [[ "$VCARD_CODE" == "200" ]]; then
  pass "vCard file available (HTTP 200)"
elif [[ "$VCARD_CODE" == "301" || "$VCARD_CODE" == "302" ]]; then
  pass "vCard file available via redirect (HTTP $VCARD_CODE)"
else
  warn "vCard file returned HTTP $VCARD_CODE (may not be deployed yet)"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════════════════════"
if [[ $FAILURES -eq 0 ]]; then
  pass "All smoke tests passed!"
else
  fail "$FAILURES test(s) failed"
fi
echo "════════════════════════════════════════════════════════"

exit $FAILURES
