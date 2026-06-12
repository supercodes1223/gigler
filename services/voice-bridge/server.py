"""FastAPI server for the Gigler Gemini Live voice bridge.

Endpoints:
  POST /voice/inbound  — Twilio Voice webhook for calls TO the Gigler number.
  POST /voice/outbound — TwiML for calls Gigler places (wake-ups, check-ins).
  WS   /ws             — Twilio Media Streams <-> Pipecat <-> Gemini Live.
"""

import base64
import hashlib
import hmac
import json
import time
from xml.sax.saxutils import quoteattr

import uvicorn
from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import JSONResponse, Response

from config import (
    BRIDGE_HOST,
    BRIDGE_PORT,
    BRIDGE_PUBLIC_HOST,
    MAX_CONCURRENT_CALLS,
    TWILIO_AUTH_TOKEN,
)
from logging_config import log
from pipeline import run_voice_pipeline

app = FastAPI(title="Gigler Voice Bridge", version="1.0.0")

_active_calls = 0


def _validate_twilio_signature(url: str, form: dict, signature: str) -> bool:
    """Standard Twilio HMAC-SHA1 request validation."""
    payload = url + "".join(k + form[k] for k in sorted(form))
    expected = base64.b64encode(
        hmac.new(TWILIO_AUTH_TOKEN.encode(), payload.encode("utf-8"), hashlib.sha1).digest()
    ).decode()
    return hmac.compare_digest(expected, signature or "")


async def _signed_form(request: Request) -> dict | None:
    """Return the form dict if the Twilio signature checks out, else None."""
    form = dict(await request.form())
    signature = request.headers.get("X-Twilio-Signature", "")
    # nginx terminates TLS; reconstruct the public https URL Twilio signed.
    url = f"https://{BRIDGE_PUBLIC_HOST}{request.url.path}"
    if request.url.query:
        url += f"?{request.url.query}"
    if not _validate_twilio_signature(url, form, signature):
        log.warning(f"Rejected request with bad Twilio signature: {request.url.path}")
        return None
    return form


def _twiml(body: str) -> Response:
    return Response(
        content=f'<?xml version="1.0" encoding="UTF-8"?><Response>{body}</Response>',
        media_type="application/xml",
    )


WS_TOKEN_MAX_AGE_S = 900


def _make_ws_token(call_sid: str) -> str:
    """Short-lived token proving the stream params came from our own TwiML.

    Twilio relays <Parameter> values verbatim in the WS start frame; without
    this, anyone reaching the public /ws could forge callerPhone/userId and
    drive SMS sends. Signed with the Twilio auth token (already secret)."""
    ts = str(int(time.time()))
    sig = hmac.new(TWILIO_AUTH_TOKEN.encode(), f"{call_sid}:{ts}".encode(), hashlib.sha256).hexdigest()[:32]
    return f"{ts}.{sig}"


def _verify_ws_token(call_sid: str, token: str) -> bool:
    try:
        ts, sig = token.split(".", 1)
        if abs(time.time() - int(ts)) > WS_TOKEN_MAX_AGE_S:
            return False
        expected = hmac.new(
            TWILIO_AUTH_TOKEN.encode(), f"{call_sid}:{ts}".encode(), hashlib.sha256
        ).hexdigest()[:32]
        return hmac.compare_digest(expected, sig)
    except (ValueError, AttributeError):
        return False


def _stream_twiml(call_sid: str, params: dict) -> Response:
    params = dict(params, token=_make_ws_token(call_sid))
    parameters = "".join(
        f"<Parameter name={quoteattr(k)} value={quoteattr(str(v))}/>" for k, v in params.items() if v
    )
    return _twiml(
        f'<Connect><Stream url="wss://{BRIDGE_PUBLIC_HOST}/ws">{parameters}</Stream></Connect>'
    )


BUSY_TWIML = (
    "<Say>Hi, this is Gigler. All my lines are busy right now. "
    "Text me instead and I will get right on it. Goodbye!</Say><Hangup/>"
)

ERROR_TWIML = (
    "<Say>Hi, this is Gigler. I am having trouble taking calls right now. "
    "Text me at this number and I will get right on it. Goodbye!</Say><Hangup/>"
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gigler-voice-bridge"}


@app.get("/status")
async def status():
    return {
        "status": "running",
        "service": "gigler-voice-bridge",
        "version": "1.0.0",
        "active_calls": _active_calls,
    }


@app.post("/voice/inbound")
async def voice_inbound(request: Request):
    """Twilio Voice webhook for inbound calls to the Gigler number."""
    form = await _signed_form(request)
    if form is None:
        return JSONResponse({"error": "invalid signature"}, status_code=403)

    caller = form.get("From", "")
    log.info(f"Inbound call from {caller}", extra={"callSid": form.get("CallSid"), "callerPhone": caller})

    if _active_calls >= MAX_CONCURRENT_CALLS:
        log.warning("At capacity; declining inbound call", extra={"callerPhone": caller})
        return _twiml(BUSY_TWIML)

    return _stream_twiml(form.get("CallSid", ""), {"direction": "inbound", "callerPhone": caller})


@app.post("/voice/outbound")
async def voice_outbound(request: Request):
    """TwiML endpoint Twilio fetches when Gigler places an outbound call.

    The initiating Lambda passes call metadata via query params:
    callType, userId, gigId, context.
    """
    form = await _signed_form(request)
    if form is None:
        return JSONResponse({"error": "invalid signature"}, status_code=403)

    q = request.query_params
    callee = form.get("To", "")
    log.info(
        f"Outbound call leg to {callee} (type={q.get('callType')})",
        extra={"callSid": form.get("CallSid"), "callerPhone": callee},
    )

    return _stream_twiml(
        form.get("CallSid", ""),
        {
            "direction": "outbound",
            "callerPhone": callee,
            "callType": q.get("callType", "check_in"),
            "userId": q.get("userId", ""),
            "gigId": q.get("gigId", ""),
            "context": q.get("context", ""),
        },
    )


@app.websocket("/ws")
async def websocket_twilio(ws: WebSocket):
    """Handle the Twilio Media Streams WebSocket for one call."""
    global _active_calls
    await ws.accept()
    log.info("WebSocket connected, waiting for Twilio start message")

    counted = False
    try:
        while True:
            raw = await ws.receive_text()
            msg = json.loads(raw)
            event = msg.get("event")

            if event == "connected":
                continue

            if event == "start":
                start_data = msg.get("start", {})
                stream_sid = start_data.get("streamSid")
                call_sid = start_data.get("callSid")
                params = start_data.get("customParameters", {})

                if not _verify_ws_token(call_sid or "", params.get("token", "")):
                    log.warning(
                        "Rejected WS start with missing/invalid token",
                        extra={"callSid": call_sid},
                    )
                    break

                direction = params.get("direction", "inbound")
                caller_phone = params.get("callerPhone", "")
                log.info(
                    f"Stream started: direction={direction}, caller={caller_phone}",
                    extra={"callSid": call_sid, "callerPhone": caller_phone},
                )

                _active_calls += 1
                counted = True
                await run_voice_pipeline(
                    websocket=ws,
                    stream_sid=stream_sid,
                    call_sid=call_sid,
                    caller_phone=caller_phone,
                    direction=direction,
                    call_type=params.get("callType") or None,
                    user_id=params.get("userId") or None,
                    gig_id=params.get("gigId") or None,
                    extra_context=params.get("context") or None,
                )
                break

            if event == "stop":
                log.info("Twilio stream stopped before start completed")
                break

    except Exception as e:
        log.error(f"WebSocket error: {e}", exc_info=e)
    finally:
        if counted:
            _active_calls -= 1
        try:
            await ws.close()
        except Exception:
            pass


if __name__ == "__main__":
    log.info(f"Starting Gigler voice bridge on {BRIDGE_HOST}:{BRIDGE_PORT}")
    uvicorn.run("server:app", host=BRIDGE_HOST, port=BRIDGE_PORT, log_level="info")
