#!/usr/bin/env bash
# Deploys the gigler-email-forwarder Lambda function to us-east-2.
#
# This Lambda is intentionally NOT managed by Amplify Gen 2 because:
#   - SES inbound + S3 + Lambda must be in the same region (us-east-2 has SES production access)
#   - The rest of the Gigler Amplify stack is in us-east-1
#   - We want this Lambda isolated from Amplify deploy lifecycle
#
# Usage:
#   ./scripts/deploy-email-forwarder.sh
#
# On first run: creates the Lambda function.
# On subsequent runs: updates the function code.

set -euo pipefail

REGION="us-east-2"
FUNCTION_NAME="gigler-email-forwarder"
ROLE_ARN="arn:aws:iam::314146291555:role/gigler-email-forwarder-role"
RUNTIME="nodejs22.x"
HANDLER="index.handler"
TIMEOUT=30
MEMORY=256
SRC_DIR="amplify/functions/gigler-email-forwarder"
ZIP_FILE="$SRC_DIR/function.zip"

cd "$(dirname "$0")/.."

echo "==> Installing npm dependencies in $SRC_DIR"
(cd "$SRC_DIR" && npm install --production --no-audit --no-fund)

echo "==> Bundling function.zip"
rm -f "$ZIP_FILE"
(cd "$SRC_DIR" && zip -rq function.zip index.js node_modules package.json)

echo "==> Checking if Lambda function already exists in $REGION"
if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "==> Updating existing Lambda function code"
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://$ZIP_FILE" \
    --region "$REGION" \
    --output json | jq '{FunctionName, Version, LastModified, CodeSize, State}'

  echo "==> Updating configuration (handler, runtime, timeout, memory)"
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"
  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" \
    --handler "$HANDLER" \
    --timeout "$TIMEOUT" \
    --memory-size "$MEMORY" \
    --region "$REGION" \
    --output json | jq '{FunctionName, Runtime, Handler, Timeout, MemorySize}'
else
  echo "==> Creating new Lambda function"
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" \
    --role "$ROLE_ARN" \
    --handler "$HANDLER" \
    --timeout "$TIMEOUT" \
    --memory-size "$MEMORY" \
    --zip-file "fileb://$ZIP_FILE" \
    --region "$REGION" \
    --description "Forwards inbound *@gigler.ai emails to support@carmenai.co (manual deploy, NOT in Amplify)" \
    --output json | jq '{FunctionName, FunctionArn, Runtime, State}'
fi

echo ""
echo "==> Done. Lambda function: $FUNCTION_NAME (region: $REGION)"
echo "==> View logs: aws logs tail /aws/lambda/$FUNCTION_NAME --region $REGION --follow"
