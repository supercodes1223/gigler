#!/usr/bin/env bash
#
# One-shot deploy of the Gigler judge service to Google Cloud Run.
#
# Prerequisites (one time):
#   gcloud auth login
#   gcloud config set project YOUR_PROJECT_ID        # <-- set your GCP project first
#   export GEMINI_API_KEY=...                        # or `source ../../.env` from this dir
#
# Usage:
#   ./deploy.sh
#
# Uses `gcloud run deploy --source .` so Cloud Build builds the Dockerfile
# remotely — no local Docker or Artifact Registry setup needed (gcloud will
# prompt once to create the default Cloud Run source repo).

set -euo pipefail

if [ -z "${GEMINI_API_KEY:-}" ]; then
  echo "ERROR: GEMINI_API_KEY is not set. Run: export GEMINI_API_KEY=... (or source the repo root .env)" >&2
  exit 1
fi

SERVICE_NAME="gigler-judge"
REGION="us-central1"
JUDGE_MODEL="${GEMINI_JUDGE_MODEL:-gemini-2.5-flash}"

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=$GEMINI_API_KEY,GEMINI_JUDGE_MODEL=$JUDGE_MODEL"

SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --format 'value(status.url)')
echo ""
echo "Deployed. Service URL: $SERVICE_URL"
echo "Health check:          curl $SERVICE_URL/healthz"
