"""Webhook tests: Twilio signature validation + TwiML generation."""

import base64
import hashlib
import hmac
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("GOOGLE_API_KEY", "test")
os.environ.setdefault("TWILIO_ACCOUNT_SID", "ACtest")
os.environ.setdefault("TWILIO_AUTH_TOKEN", "secret_token")
os.environ.setdefault("USER_TABLE_NAME", "User-test")
os.environ.setdefault("GIG_TABLE_NAME", "Gig-test")
os.environ.setdefault("MESSAGE_TABLE_NAME", "Message-test")
os.environ.setdefault("GIG_PARTICIPANT_TABLE_NAME", "GigParticipant-test")
os.environ.setdefault("AWS_ACCESS_KEY_ID", "test")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "test")
os.environ.setdefault("BRIDGE_PUBLIC_HOST", "voice.gigler.ai")

from fastapi.testclient import TestClient

import server

client = TestClient(server.app)


def _sign(url: str, form: dict) -> str:
    payload = url + "".join(k + form[k] for k in sorted(form))
    return base64.b64encode(
        hmac.new(b"secret_token", payload.encode(), hashlib.sha1).digest()
    ).decode()


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["service"] == "gigler-voice-bridge"


def test_inbound_rejects_unsigned():
    r = client.post("/voice/inbound", data={"From": "+15551234567"})
    assert r.status_code == 403


def test_inbound_valid_signature_returns_stream_twiml():
    form = {"From": "+15551234567", "To": "+16508351235", "CallSid": "CA123"}
    sig = _sign("https://voice.gigler.ai/voice/inbound", form)
    r = client.post("/voice/inbound", data=form, headers={"X-Twilio-Signature": sig})
    assert r.status_code == 200
    body = r.text
    assert '<Stream url="wss://voice.gigler.ai/ws">' in body
    assert '<Parameter name="direction" value="inbound"/>' in body
    assert '<Parameter name="callerPhone" value="+15551234567"/>' in body


def test_inbound_busy_when_at_capacity():
    form = {"From": "+15551234567"}
    sig = _sign("https://voice.gigler.ai/voice/inbound", form)
    server._active_calls = 99
    try:
        r = client.post("/voice/inbound", data=form, headers={"X-Twilio-Signature": sig})
        assert "<Say>" in r.text and "<Hangup/>" in r.text
    finally:
        server._active_calls = 0


def test_outbound_passes_query_params_through():
    url = "https://voice.gigler.ai/voice/outbound?callType=wake_up&userId=usr_1&context=morning"
    form = {"To": "+15551234567", "CallSid": "CA456"}
    sig = _sign(url, form)
    r = client.post(
        "/voice/outbound?callType=wake_up&userId=usr_1&context=morning",
        data=form,
        headers={"X-Twilio-Signature": sig},
    )
    assert r.status_code == 200
    assert '<Parameter name="callType" value="wake_up"/>' in r.text
    assert '<Parameter name="userId" value="usr_1"/>' in r.text
    assert '<Parameter name="direction" value="outbound"/>' in r.text


def test_stream_twiml_includes_signed_ws_token():
    form = {"From": "+15551234567", "CallSid": "CA123"}
    sig = _sign("https://voice.gigler.ai/voice/inbound", form)
    r = client.post("/voice/inbound", data=form, headers={"X-Twilio-Signature": sig})
    assert 'name="token"' in r.text
    token = r.text.split('name="token" value="')[1].split('"')[0]
    assert server._verify_ws_token("CA123", token)
    assert not server._verify_ws_token("CA999", token)


def test_ws_token_rejects_garbage_and_expiry():
    assert not server._verify_ws_token("CA123", "")
    assert not server._verify_ws_token("CA123", "garbage")
    import time as _time

    old_ts = str(int(_time.time()) - 3600)
    import hashlib as _hashlib
    import hmac as _hmac

    sig = _hmac.new(b"secret_token", f"CA123:{old_ts}".encode(), _hashlib.sha256).hexdigest()[:32]
    assert not server._verify_ws_token("CA123", f"{old_ts}.{sig}")


def test_parameter_values_are_attribute_escaped():
    from urllib.parse import urlencode

    query = urlencode({"context": 'say "hi" <now> & smile'})
    url = f"https://voice.gigler.ai/voice/outbound?{query}"
    form = {"To": "+15551234567"}
    sig = _sign(url, form)
    r = client.post(
        f"/voice/outbound?{query}",
        data=form,
        headers={"X-Twilio-Signature": sig},
    )
    assert r.status_code == 200
    assert "&lt;now&gt;" in r.text and "&amp;" in r.text
    import xml.dom.minidom

    doc = xml.dom.minidom.parseString(r.text)  # must be well-formed
    values = {
        p.getAttribute("name"): p.getAttribute("value")
        for p in doc.getElementsByTagName("Parameter")
    }
    assert values["context"] == 'say "hi" <now> & smile'  # round-trips intact


def test_outbound_rejects_tampered_query():
    url = "https://voice.gigler.ai/voice/outbound?callType=wake_up"
    form = {"To": "+15551234567"}
    sig = _sign(url, form)
    r = client.post(
        "/voice/outbound?callType=consultation",
        data=form,
        headers={"X-Twilio-Signature": sig},
    )
    assert r.status_code == 403


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"PASS {fn.__name__}")
    print(f"\n{len(fns)} tests passed")
