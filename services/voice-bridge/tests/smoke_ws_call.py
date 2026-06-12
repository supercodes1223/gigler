"""Synthetic smoke test against the LIVE bridge: pretend to be Twilio Media
Streams, send a start event + silence, and verify Gemini Live answers with
audio media messages. Run: .venv/bin/python tests/smoke_ws_call.py [wss://host/ws]
"""

import asyncio
import base64
import hashlib
import hmac
import json
import os
import sys
import time

import websockets
from dotenv import load_dotenv

load_dotenv()

WS_URL = sys.argv[1] if len(sys.argv) > 1 else "wss://voice.gigler.ai/ws"
FAKE_PHONE = "+15550001111"  # unknown caller; no real SMS goes anywhere

CALL_SID = "CAsmoketest000000000000000000000"


def make_ws_token(call_sid: str) -> str:
    auth_token = os.environ["TWILIO_AUTH_TOKEN"]
    ts = str(int(time.time()))
    sig = hmac.new(auth_token.encode(), f"{call_sid}:{ts}".encode(), hashlib.sha256).hexdigest()[:32]
    return f"{ts}.{sig}"

# 20ms of 8kHz mulaw silence
SILENCE = base64.b64encode(b"\xff" * 160).decode()


async def main():
    print(f"Connecting to {WS_URL} ...")
    async with websockets.connect(WS_URL) as ws:
        await ws.send(json.dumps({"event": "connected", "protocol": "Call", "version": "1.0.0"}))
        await ws.send(
            json.dumps(
                {
                    "event": "start",
                    "sequenceNumber": "1",
                    "start": {
                        "streamSid": "MZsmoketest000000000000000000000",
                        "callSid": "CAsmoketest000000000000000000000",
                        "accountSid": "ACsmoketest",
                        "tracks": ["inbound"],
                        "mediaFormat": {"encoding": "audio/x-mulaw", "sampleRate": 8000, "channels": 1},
                        "customParameters": {
                            "direction": "inbound",
                            "callerPhone": FAKE_PHONE,
                            "token": make_ws_token(CALL_SID),
                        },
                    },
                    "streamSid": "MZsmoketest000000000000000000000",
                }
            )
        )
        print("Sent start event; streaming silence and listening for bot audio...")

        media_in = 0
        marks = 0

        async def send_silence():
            seq = 2
            for _ in range(900):  # ~18s
                await ws.send(
                    json.dumps(
                        {
                            "event": "media",
                            "sequenceNumber": str(seq),
                            "media": {"track": "inbound", "chunk": str(seq), "timestamp": str(seq * 20), "payload": SILENCE},
                            "streamSid": "MZsmoketest000000000000000000000",
                        }
                    )
                )
                seq += 1
                await asyncio.sleep(0.02)

        sender = asyncio.create_task(send_silence())
        try:
            while media_in < 100:
                raw = await asyncio.wait_for(ws.recv(), timeout=15)
                msg = json.loads(raw)
                ev = msg.get("event")
                if ev == "media":
                    media_in += 1
                    if media_in == 1:
                        print("PASS: received first bot audio frame from Gemini Live")
                elif ev == "mark":
                    marks += 1
                elif ev == "clear":
                    print("(clear event)")
        except asyncio.TimeoutError:
            pass
        finally:
            sender.cancel()

        print(f"Result: {media_in} bot media frames, {marks} marks")
        if media_in > 0:
            print("SMOKE TEST PASSED — bridge <-> Gemini Live audio path works")
            return 0
        print("SMOKE TEST FAILED — no bot audio received")
        return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
