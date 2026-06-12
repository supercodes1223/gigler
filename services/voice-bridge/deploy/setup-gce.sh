#!/usr/bin/env bash
# GCE deployment script for the Gigler Voice Bridge server.
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - GCP project selected (gcloud config set project YOUR_PROJECT_ID)
#
# Usage: ./deploy/setup-gce.sh

set -euo pipefail

PROJECT_ID=$(gcloud config get-value project)
ZONE="us-central1-a"
INSTANCE_NAME="gigler-voice-bridge"
MACHINE_TYPE="e2-small"

echo "=== Creating GCE instance: $INSTANCE_NAME ==="
echo "Project: $PROJECT_ID"
echo "Zone:    $ZONE"
echo "Type:    $MACHINE_TYPE"

# Firewall: HTTP/HTTPS for nginx (Twilio webhooks + WSS terminate at nginx)
gcloud compute firewall-rules create allow-voice-bridge-http \
  --allow tcp:80,tcp:443 \
  --target-tags voice-bridge \
  --description "Allow HTTP/HTTPS to voice bridge nginx" \
  --project "$PROJECT_ID" \
  2>/dev/null || echo "Firewall rule already exists"

gcloud compute instances create "$INSTANCE_NAME" \
  --zone="$ZONE" \
  --machine-type="$MACHINE_TYPE" \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=20GB \
  --tags=voice-bridge \
  --scopes=cloud-platform \
  --metadata=startup-script='#!/bin/bash
    apt-get update
    apt-get install -y docker.io nginx certbot python3-certbot-nginx
    systemctl enable docker
    systemctl start docker
  ' \
  --project "$PROJECT_ID"

EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" \
  --zone="$ZONE" \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)" \
  --project "$PROJECT_ID")

echo ""
echo "=== Instance created ==="
echo "External IP: $EXTERNAL_IP"
echo ""
echo "Next steps:"
echo "1. Create DNS A record: voice.gigler.ai -> $EXTERNAL_IP"
echo "2. SSH in:  gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
echo "3. Copy this directory to /opt/voice-bridge, add .env with credentials"
echo "4. Build and run:"
echo "   docker build -t voice-bridge /opt/voice-bridge"
echo "   docker run -d --restart=always --env-file /opt/voice-bridge/.env -p 127.0.0.1:8765:8765 --name voice-bridge voice-bridge"
echo "5. Configure nginx (deploy/nginx-voice-bridge.conf) and run certbot:"
echo "   certbot --nginx -d voice.gigler.ai"
echo "6. Point Twilio Voice webhook at https://voice.gigler.ai/voice/inbound"
