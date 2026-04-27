#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION:-us-east-2}"
FUNCTION_NAME="${FUNCTION_NAME:-gigler-invite-request}"
ROLE_NAME="${ROLE_NAME:-gigler-invite-request-role}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="${ROOT_DIR}/scripts/invite-request-lambda"
ZIP_PATH="${SRC_DIR}/function.zip"

cat > /tmp/gigler-invite-trust.json <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

cat > /tmp/gigler-invite-policy.json <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${REGION}:${ACCOUNT_ID}:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "arn:aws:ses:${REGION}:${ACCOUNT_ID}:identity/gigler.ai"
    }
  ]
}
JSON

if ! aws iam get-role --role-name "${ROLE_NAME}" >/dev/null 2>&1; then
  aws iam create-role \
    --role-name "${ROLE_NAME}" \
    --assume-role-policy-document file:///tmp/gigler-invite-trust.json >/dev/null
  sleep 10
fi

aws iam put-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-name gigler-invite-request-policy \
  --policy-document file:///tmp/gigler-invite-policy.json >/dev/null

rm -f "${ZIP_PATH}"
(cd "${SRC_DIR}" && zip -q function.zip index.mjs)

if aws lambda get-function --function-name "${FUNCTION_NAME}" --region "${REGION}" >/dev/null 2>&1; then
  aws lambda update-function-code \
    --function-name "${FUNCTION_NAME}" \
    --zip-file "fileb://${ZIP_PATH}" \
    --region "${REGION}" >/dev/null
  aws lambda wait function-updated \
    --function-name "${FUNCTION_NAME}" \
    --region "${REGION}"
else
  aws lambda create-function \
    --function-name "${FUNCTION_NAME}" \
    --runtime nodejs22.x \
    --handler index.handler \
    --role "${ROLE_ARN}" \
    --zip-file "fileb://${ZIP_PATH}" \
    --timeout 10 \
    --memory-size 128 \
    --environment "Variables={ADMIN_EMAIL=admin@gigler.ai,FROM_EMAIL=notifications@gigler.ai,ALLOWED_ORIGIN=https://gigler.ai}" \
    --region "${REGION}" >/dev/null
  aws lambda wait function-active \
    --function-name "${FUNCTION_NAME}" \
    --region "${REGION}"
fi

aws lambda update-function-configuration \
  --function-name "${FUNCTION_NAME}" \
  --environment "Variables={ADMIN_EMAIL=admin@gigler.ai,FROM_EMAIL=notifications@gigler.ai,ALLOWED_ORIGIN=https://gigler.ai}" \
  --region "${REGION}" >/dev/null
aws lambda wait function-updated \
  --function-name "${FUNCTION_NAME}" \
  --region "${REGION}"

URL="$(aws lambda get-function-url-config --function-name "${FUNCTION_NAME}" --region "${REGION}" --query FunctionUrl --output text 2>/dev/null || true)"
if [[ -z "${URL}" || "${URL}" == "None" ]]; then
  URL="$(aws lambda create-function-url-config \
    --function-name "${FUNCTION_NAME}" \
    --auth-type NONE \
    --cors "AllowOrigins=https://gigler.ai,AllowMethods=POST,AllowHeaders=content-type" \
    --region "${REGION}" \
    --query FunctionUrl \
    --output text)"
fi

if ! aws lambda get-policy --function-name "${FUNCTION_NAME}" --region "${REGION}" 2>/dev/null | grep -q "gigler-invite-public-url"; then
  aws lambda add-permission \
    --function-name "${FUNCTION_NAME}" \
    --statement-id gigler-invite-public-url \
    --action lambda:InvokeFunctionUrl \
    --principal "*" \
    --function-url-auth-type NONE \
    --region "${REGION}" >/dev/null
fi

echo "${URL}"
