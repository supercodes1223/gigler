#!/usr/bin/env bash
#
# Backs up current Amplify environment variables before any update.
# CRITICAL: Run this before any `aws amplify update-app --environment-variables` call.
#
# Usage: ./scripts/backup-amplify-env.sh <APP_ID>
#

set -euo pipefail

APP_ID="${1:-$AMPLIFY_APP_ID}"
REGION="${AWS_DEFAULT_REGION:-us-east-2}"

if [ -z "$APP_ID" ]; then
  echo "ERROR: No Amplify App ID provided."
  echo "Usage: $0 <APP_ID>  or  AMPLIFY_APP_ID=xxx $0"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$(dirname "$0")/../.amplify-env-backups"
BACKUP_FILE="$BACKUP_DIR/env-backup-$TIMESTAMP.json"

mkdir -p "$BACKUP_DIR"

echo "Fetching current environment variables for app $APP_ID..."
CURRENT_VARS=$(aws amplify get-app --app-id "$APP_ID" --region "$REGION" --query 'app.environmentVariables' --output json 2>/dev/null || echo "{}")

echo "$CURRENT_VARS" > "$BACKUP_FILE"

VAR_COUNT=$(echo "$CURRENT_VARS" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
echo "Backed up $VAR_COUNT environment variables to $BACKUP_FILE"
echo "$CURRENT_VARS" | python3 -c "import sys, json; [print(f'  {k}') for k in sorted(json.load(sys.stdin).keys())]" 2>/dev/null || true
