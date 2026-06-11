# Gigler Judge Service (Cloud Run)

The **Orca Quality Loop judge** from the Gigler gig processor, packaged as a standalone HTTP service for **Google Cloud Run**.

After the primary Gemini pass drafts a reply (and proposed actions) for a user's SMS, this service runs a single cheap judge pass that can approve the draft, revise the reply text, or veto unsafe actions — all fail-open: any judge error returns the original draft unchanged.

The core logic in `quality-loop.mjs` is ported from `amplify/functions/gigler-gig-processor/quality-loop.ts` — **keep them in sync**.

## Deploy (one command)

```bash
# one-time setup
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
export GEMINI_API_KEY=...        # or: source ../../.env

./deploy.sh
```

`deploy.sh` runs `gcloud run deploy gigler-judge --source .` — Cloud Build builds the Dockerfile remotely, so no local Docker or Artifact Registry setup is required. The script prints the service URL when done.

## API

### `GET /healthz`

```json
{ "ok": true, "model": "gemini-2.5-flash" }
```

### `POST /review`

Request body:

| Field | Type | Description |
|---|---|---|
| `draftText` | string | The draft SMS reply to judge |
| `proposedActions` | array | Validated gig actions (may be empty) |
| `gigContext` | object | `{ type, title, description? }` |
| `userMessage` | string | The user's latest message |

Returns `{ finalText, finalActions, logEntry }` — `finalText` is the (possibly revised) reply, `finalActions` has vetoed actions removed, and `logEntry` is the quality-log record (`verdict`, `judgeScore`, `revised`, `vetoedActions`, `model`, optional `issues`).

If `GEMINI_API_KEY` is not configured, `/review` returns **503** with a clear error message.

Example:

```bash
curl -s -X POST "$SERVICE_URL/review" \
  -H "Content-Type: application/json" \
  -d '{
    "draftText": "Hey! I went ahead and booked you 3 flights to Tokyo just in case. Total was $4,200, charged to your card!",
    "proposedActions": [],
    "gigContext": { "type": "errand", "title": "Find a cheap flight to Tokyo", "description": "User wants one economy flight under $900" },
    "userMessage": "Can you find me one cheap flight to Tokyo next month? Under $900 please."
  }' | jq
```

## Architecture role

Today the Lambda gig processor (`gigler-gig-processor`) inlines the quality loop. With this service deployed, the Lambda can instead POST the draft to this URL and use the returned `finalText` / `finalActions` — set `JUDGE_SERVICE_URL` on the Lambda to the Cloud Run URL (future wiring; not implemented yet). This decouples judge model/prompt iteration from Amplify deploys and lets other surfaces (e.g. the web app) reuse the same judge.

## Local development

```bash
npm install
GEMINI_API_KEY=... node server.mjs      # listens on :8080 by default
curl localhost:8080/healthz
```

Env vars: `PORT` (set by Cloud Run), `GEMINI_API_KEY` (required for /review), `GEMINI_JUDGE_MODEL` (default `gemini-2.5-flash`).
