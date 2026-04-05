#!/usr/bin/env bash
#
# Safely sets Amplify environment variables by MERGING with existing vars.
# Reads new vars from .env, merges with current Amplify vars, pushes the full set.
#
# CRITICAL: aws amplify update-app --environment-variables REPLACES ALL vars.
# This script prevents accidental deletion by always fetching + merging first.
#
# Usage: ./scripts/set-amplify-env.sh <APP_ID>
#

set -euo pipefail

APP_ID="${1:-$AMPLIFY_APP_ID}"
ENV_FILE="${2:-.env}"

if [ -z "$APP_ID" ]; then
  echo "ERROR: No Amplify App ID provided."
  echo "Usage: $0 <APP_ID> [.env file]"
  echo "  or:  AMPLIFY_APP_ID=xxx $0"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found."
  exit 1
fi

echo "=== Step 1: Backup current env vars ==="
"$(dirname "$0")/backup-amplify-env.sh" "$APP_ID"
echo ""

echo "=== Step 2: Fetch existing env vars ==="
EXISTING=$(aws amplify get-app --app-id "$APP_ID" --query 'app.environmentVariables' --output json 2>/dev/null || echo "{}")
EXISTING_COUNT=$(echo "$EXISTING" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
echo "Found $EXISTING_COUNT existing variables."
echo ""

echo "=== Step 3: Read new vars from $ENV_FILE ==="
NEW_VARS=$(python3 -c "
import sys
vars = {}
with open('$ENV_FILE') as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            key, _, value = line.partition('=')
            key = key.strip()
            value = value.strip()
            if value and key:
                vars[key] = value
import json
print(json.dumps(vars))
")
NEW_COUNT=$(echo "$NEW_VARS" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
echo "Found $NEW_COUNT new variables in $ENV_FILE."
echo ""

echo "=== Step 4: Merge (existing + new, new overwrites) ==="
MERGED=$(python3 -c "
import json, sys
existing = json.loads('$EXISTING')
new = json.loads('$NEW_VARS')
merged = {**existing, **new}
print(json.dumps(merged))
")
MERGED_COUNT=$(echo "$MERGED" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
echo "Merged total: $MERGED_COUNT variables."
echo ""

echo "=== Step 5: Push merged vars to Amplify ==="
aws amplify update-app --app-id "$APP_ID" --environment-variables "$MERGED" > /dev/null
echo "Updated Amplify environment variables."
echo ""

echo "=== Step 6: Verify ==="
VERIFY=$(aws amplify get-app --app-id "$APP_ID" --query 'app.environmentVariables' --output json)
VERIFY_COUNT=$(echo "$VERIFY" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
echo "Verification: $VERIFY_COUNT variables now set on Amplify."

if [ "$VERIFY_COUNT" -lt "$EXISTING_COUNT" ]; then
  echo "WARNING: Variable count decreased ($EXISTING_COUNT -> $VERIFY_COUNT). Check backup!"
  exit 1
fi

echo "Done!"
