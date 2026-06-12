# Gigler Voice Bridge

Real-time phone calls with Gigler, powered by Gemini Live (native speech-to-speech)
over Twilio Media Streams. Ported from a production Pipecat voice bridge.

```
Caller <-> Twilio Voice <-> wss://voice.gigler.ai/ws <-> Pipecat <-> Gemini Live
                                      |
                                      +-- DynamoDB (User/Gig/Message) + gig-processor Lambda (AWS)
```

- **Inbound**: caller dials the Gigler number; Twilio hits `POST /voice/inbound`,
  which returns TwiML connecting the call to the `/ws` media stream. The bridge
  looks the caller up by phone, injects their active gigs into the system
  instruction, and Gemini answers.
- **Outbound**: the `gigler-voice-bridge` Lambda creates a Twilio call with
  `Url=https://voice.gigler.ai/voice/outbound?callType=wake_up&userId=...`.
- **Tools**: `get_my_gigs`, `create_gig` (writes the same Gig/Message items as
  the SMS pipeline and async-invokes gig-processor), `send_gig_link`, `end_call`.
- **Transcripts** are written post-call to the Message table as `voice_note` turns.

## Run locally

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env  # fill in
.venv/bin/python server.py
```

## Deploy

See `deploy/setup-gce.sh` (GCE instance + docker + nginx + certbot). Runs on
Google Compute Engine at `voice.gigler.ai`.
