#!/usr/bin/env bash
#
# Gigler Test Number Cleanup Script
#
# Fully removes a user and all their data from DynamoDB + Twilio.
# Use before re-testing to ensure a clean slate.
#
# Usage:
#   ./scripts/clean-test-number.sh +14083354712
#   ./scripts/clean-test-number.sh +14083354712 +14154049816   # multiple numbers
#
# Requirements:
#   - AWS CLI configured with access to Gigler's DynamoDB tables
#   - python3 available
#   - .env file in project root (for Twilio credentials)
#
# Table suffix and region are hardcoded below. Update if the Amplify
# environment changes.

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────

AWS_REGION="us-east-2"
TABLE_SUFFIX="v7rrpmhbmbgzjmwqpeflaw2rra-NONE"

TBL_USER="User-${TABLE_SUFFIX}"
TBL_GIG="Gig-${TABLE_SUFFIX}"
TBL_MESSAGE="Message-${TABLE_SUFFIX}"
TBL_PARTICIPANT="GigParticipant-${TABLE_SUFFIX}"
TBL_REMINDER="Reminder-${TABLE_SUFFIX}"
TBL_DELIVERABLE="Deliverable-${TABLE_SUFFIX}"
TBL_MEDIA="Media-${TABLE_SUFFIX}"

# Load Twilio creds from .env if present
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

# ── Key schemas (from DynamoDB table definitions) ─────────────────────────────
#
#   User:            PK = id (string)
#   Gig:             PK = id (string)
#   Message:         PK = gigId (string), SK = timestamp (string)
#   GigParticipant:  PK = gigId (string), SK = phone (string)
#   Reminder:        PK = id (string)
#   Deliverable:     PK = gigId (string), SK = deliverableId? (check if needed)
#   Media:           PK = id (string)

# ── Helper functions ──────────────────────────────────────────────────────────

ddb() {
  aws dynamodb "$@" --region "$AWS_REGION" --output json 2>/dev/null
}

query_ids() {
  local table="$1" index="$2" key_expr="$3" values="$4" id_field="$5"
  ddb query --table-name "$table" --index-name "$index" \
    --key-condition-expression "$key_expr" \
    --expression-attribute-values "$values" | \
  python3 -c "
import sys,json
for i in json.load(sys.stdin).get('Items',[]):
    print(i['${id_field}']['S'])
"
}

query_composite() {
  local table="$1" key_expr="$2" values="$3"
  ddb query --table-name "$table" \
    --key-condition-expression "$key_expr" \
    --expression-attribute-values "$values"
}

delete_by_id() {
  local table="$1" id="$2"
  ddb delete-item --table-name "$table" --key "{\"id\":{\"S\":\"$id\"}}" > /dev/null
}

# ── Main cleanup function ────────────────────────────────────────────────────

clean_phone() {
  local PHONE="$1"
  echo ""
  echo "═══════════════════════════════════════════"
  echo "  Cleaning: $PHONE"
  echo "═══════════════════════════════════════════"

  # 1. Find user by phone
  local USER_ID
  USER_ID=$(ddb query --table-name "$TBL_USER" --index-name byPhone \
    --key-condition-expression "phone = :p" \
    --expression-attribute-values "{\":p\":{\"S\":\"$PHONE\"}}" | \
    python3 -c "
import sys,json
items=json.load(sys.stdin).get('Items',[])
if items: print(items[0]['id']['S'])
" 2>/dev/null || true)

  if [ -z "$USER_ID" ]; then
    echo "  No user found for $PHONE — already clean."
    return 0
  fi
  echo "  Found user: $USER_ID"

  # 2. Find all gigs owned by this user
  local GIGS
  GIGS=$(query_ids "$TBL_GIG" "byOwner" "ownerId = :o" "{\":o\":{\"S\":\"$USER_ID\"}}" "id" || true)

  for GIG_ID in $GIGS; do
    echo ""
    echo "  ── Gig: $GIG_ID ──"

    # 2a. Delete messages (composite key: gigId + timestamp)
    local MSG_COUNT=0
    query_composite "$TBL_MESSAGE" "gigId = :g" "{\":g\":{\"S\":\"$GIG_ID\"}}" | \
    python3 -c "
import sys,json,subprocess
items=json.load(sys.stdin).get('Items',[])
for i in items:
    key=json.dumps({'gigId':{'S':i['gigId']['S']},'timestamp':{'S':i['timestamp']['S']}})
    subprocess.run(['aws','dynamodb','delete-item','--table-name','${TBL_MESSAGE}','--key',key,'--region','${AWS_REGION}'],capture_output=True)
print(len(items))
" 2>/dev/null | while read count; do echo "     Messages deleted: $count"; done

    # 2b. Delete participants (composite key: gigId + phone)
    query_composite "$TBL_PARTICIPANT" "gigId = :g" "{\":g\":{\"S\":\"$GIG_ID\"}}" | \
    python3 -c "
import sys,json,subprocess
items=json.load(sys.stdin).get('Items',[])
for i in items:
    key=json.dumps({'gigId':{'S':i['gigId']['S']},'phone':{'S':i['phone']['S']}})
    subprocess.run(['aws','dynamodb','delete-item','--table-name','${TBL_PARTICIPANT}','--key',key,'--region','${AWS_REGION}'],capture_output=True)
print(len(items))
" 2>/dev/null | while read count; do echo "     Participants deleted: $count"; done

    # 2c. Delete reminders (scan by gigId, PK = id)
    ddb scan --table-name "$TBL_REMINDER" \
      --filter-expression "gigId = :g" \
      --expression-attribute-values "{\":g\":{\"S\":\"$GIG_ID\"}}" | \
    python3 -c "
import sys,json,subprocess
items=json.load(sys.stdin).get('Items',[])
for i in items:
    key=json.dumps({'id':{'S':i['id']['S']}})
    subprocess.run(['aws','dynamodb','delete-item','--table-name','${TBL_REMINDER}','--key',key,'--region','${AWS_REGION}'],capture_output=True)
print(len(items))
" 2>/dev/null | while read count; do echo "     Reminders deleted: $count"; done

    # 2d. Delete the gig itself
    delete_by_id "$TBL_GIG" "$GIG_ID"
    echo "     Gig deleted."
  done

  # 3. Delete participant records where this phone appears on OTHER people's gigs
  echo ""
  echo "  ── Cleaning participant records on other gigs ──"
  ddb scan --table-name "$TBL_PARTICIPANT" \
    --filter-expression "phone = :p" \
    --expression-attribute-values "{\":p\":{\"S\":\"$PHONE\"}}" | \
  python3 -c "
import sys,json,subprocess
items=json.load(sys.stdin).get('Items',[])
for i in items:
    key=json.dumps({'gigId':{'S':i['gigId']['S']},'phone':{'S':i['phone']['S']}})
    subprocess.run(['aws','dynamodb','delete-item','--table-name','${TBL_PARTICIPANT}','--key',key,'--region','${AWS_REGION}'],capture_output=True)
print(len(items))
" 2>/dev/null | while read count; do echo "     Other-gig participant records deleted: $count"; done

  # 4. Delete the user
  delete_by_id "$TBL_USER" "$USER_ID"
  echo "  User deleted: $USER_ID"

  # 5. Verify
  local REMAINING
  REMAINING=$(ddb query --table-name "$TBL_USER" --index-name byPhone \
    --key-condition-expression "phone = :p" \
    --expression-attribute-values "{\":p\":{\"S\":\"$PHONE\"}}" \
    --select COUNT | python3 -c "import sys,json; print(json.load(sys.stdin).get('Count',0))" 2>/dev/null || echo "?")
  echo ""
  echo "  Verification — remaining users for $PHONE: $REMAINING"
}

# ── Twilio Conversations cleanup ─────────────────────────────────────────────

clean_twilio_conversations() {
  if [ -z "${TWILIO_ACCOUNT_SID:-}" ] || [ -z "${TWILIO_AUTH_TOKEN:-}" ]; then
    echo ""
    echo "  Skipping Twilio cleanup (no credentials in .env)"
    return 0
  fi

  echo ""
  echo "═══════════════════════════════════════════"
  echo "  Cleaning Twilio Conversations"
  echo "═══════════════════════════════════════════"

  local CONV_SIDS
  CONV_SIDS=$(curl -s -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
    "https://conversations.twilio.com/v1/Conversations?PageSize=100" | \
    python3 -c "
import sys,json
data=json.load(sys.stdin)
for c in data.get('conversations',[]):
    un = c.get('unique_name','') or ''
    if un.startswith('gig-'):
        print(c['sid'])
" 2>/dev/null || true)

  if [ -z "$CONV_SIDS" ]; then
    echo "  No gig-related Twilio conversations found."
    return 0
  fi

  for SID in $CONV_SIDS; do
    curl -s -X DELETE -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
      "https://conversations.twilio.com/v1/Conversations/$SID" > /dev/null 2>&1
    echo "  Deleted conversation: $SID"
  done
}

# ── Entry point ───────────────────────────────────────────────────────────────

if [ $# -eq 0 ]; then
  echo "Usage: $0 <phone1> [phone2] [phone3] ..."
  echo ""
  echo "Examples:"
  echo "  $0 +14083354712"
  echo "  $0 +14083354712 +14154049816"
  echo ""
  echo "Phone numbers must be in E.164 format (+1XXXXXXXXXX)."
  exit 1
fi

echo "Gigler Test Cleanup"
echo "Region: $AWS_REGION"
echo "Tables: *-$TABLE_SUFFIX"

for PHONE in "$@"; do
  clean_phone "$PHONE"
done

clean_twilio_conversations

echo ""
echo "════════════════════════════"
echo "  Cleanup complete."
echo "════════════════════════════"
