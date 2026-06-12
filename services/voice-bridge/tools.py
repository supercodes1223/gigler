"""Function-calling tools and DynamoDB/Lambda integration for Gigler voice calls.

Mirrors the behavior of amplify/functions/gigler-inbound-sms/handler.ts so a
phone call is a first-class channel: same User/Gig/Message/GigParticipant
items, same async gig-processor invocation.
"""

import asyncio
import base64
import hashlib
import json
import random
import re
import string
import time
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import boto3

from config import (
    AWS_REGION,
    GIG_PARTICIPANT_TABLE,
    GIG_PROCESSOR_FUNCTION_NAME,
    GIG_TABLE,
    GIGLER_NUMBER,
    MESSAGE_TABLE,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_MESSAGING_SERVICE_SID,
    USER_TABLE,
)
from logging_config import log

ddb = boto3.resource("dynamodb", region_name=AWS_REGION)
user_table = ddb.Table(USER_TABLE)
gig_table = ddb.Table(GIG_TABLE)
message_table = ddb.Table(MESSAGE_TABLE)
participant_table = ddb.Table(GIG_PARTICIPANT_TABLE) if GIG_PARTICIPANT_TABLE else None
lambda_client = boto3.client("lambda", region_name=AWS_REGION)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _gen_id(prefix: str) -> str:
    ts = int(time.time() * 1000)
    rand = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"{prefix}_{ts}_{rand}"


class CallContext:
    """Mutable per-call state shared between pipeline and tools."""

    def __init__(
        self,
        caller_phone: str,
        call_sid: str,
        direction: str = "inbound",
        call_type: Optional[str] = None,
        gig_id: Optional[str] = None,
    ):
        self.caller_phone = caller_phone
        self.call_sid = call_sid
        self.direction = direction
        self.call_type = call_type
        self.gig_id = gig_id

        self.user_id: Optional[str] = None
        self.caller_name: Optional[str] = None
        self.is_known_user = False
        self.active_gigs: list[dict] = []
        self.created_gig_ids: list[str] = []
        self.end_call_reason: Optional[str] = None
        self.bot_spoke = False
        self.started_at = _now_iso()
        self.transcript: list[dict] = []

    def add_transcript_turn(self, role: str, text: str):
        self.transcript.append({"role": role, "text": text, "at": _now_iso()})


# ---------------------------------------------------------------------------
# Caller lookup (runs before the pipeline starts; sync, called via to_thread)
# ---------------------------------------------------------------------------

def lookup_caller(ctx: CallContext, user_id: Optional[str] = None) -> None:
    """Populate ctx with User + active Gigs, matching inbound-sms lookups."""
    user = None
    if user_id:
        user = user_table.get_item(Key={"id": user_id}).get("Item")
    if not user and ctx.caller_phone:
        resp = user_table.query(
            IndexName="byPhone",
            KeyConditionExpression=boto3.dynamodb.conditions.Key("phone").eq(ctx.caller_phone),
            Limit=1,
        )
        items = resp.get("Items", [])
        user = items[0] if items else None

    if not user:
        log.info(f"Caller {ctx.caller_phone} is not a known user")
        return

    ctx.user_id = user["id"]
    ctx.caller_name = user.get("name")
    ctx.is_known_user = True

    resp = gig_table.query(
        IndexName="byOwner",
        KeyConditionExpression=boto3.dynamodb.conditions.Key("ownerId").eq(ctx.user_id),
    )
    gigs = [g for g in resp.get("Items", []) if g.get("status") in ("active", "awaiting")]
    gigs.sort(key=lambda g: g.get("updatedAt", ""), reverse=True)
    ctx.active_gigs = [
        {"id": g["id"], "title": g.get("title"), "status": g.get("status"), "type": g.get("type")}
        for g in gigs[:10]
    ]
    log.info(
        f"Caller resolved: {ctx.caller_name or ctx.user_id} with {len(ctx.active_gigs)} active gigs",
        extra={"userId": ctx.user_id, "callSid": ctx.call_sid},
    )


def _ensure_user(ctx: CallContext) -> dict:
    """Get or create the User record for this caller (mirrors createUser)."""
    if ctx.is_known_user and ctx.user_id:
        return {"id": ctx.user_id, "phone": ctx.caller_phone, "name": ctx.caller_name}

    now = _now_iso()
    user = {
        "id": _gen_id("usr"),
        "phone": ctx.caller_phone,
        "plan": "free",
        # The call itself is the onboarding; leaving this False would trap the
        # user in inbound-sms's name-collection flow on their next text.
        "onboardingComplete": True,
        "vcardStatus": "pending",
        "timezone": "America/Los_Angeles",
        "createdAt": now,
        "updatedAt": now,
    }
    user_table.put_item(Item=user)
    ctx.user_id = user["id"]
    ctx.is_known_user = True
    log.info(f"Created user {user['id']} for caller {ctx.caller_phone}", extra={"callSid": ctx.call_sid})
    return user


# ---------------------------------------------------------------------------
# Persistence helpers
# ---------------------------------------------------------------------------

GENERAL_THREAD_ID = "_general"


def _log_message(gig_id: str, sender_id: str, sender_name: str, body: str, direction: str, message_type: str = "voice_note"):
    message_table.put_item(
        Item={
            "gigId": gig_id,
            "timestamp": _now_iso(),
            "senderId": sender_id,
            "senderName": sender_name,
            "body": body,
            "direction": direction,
            "messageType": message_type,
        }
    )


def write_call_transcript(ctx: CallContext) -> None:
    """Persist the call transcript to the Message table as voice_note turns."""
    if not ctx.transcript:
        log.info(
            f"No transcript turns to write (bot_spoke={ctx.bot_spoke})",
            extra={"callSid": ctx.call_sid},
        )
        return
    thread_id = ctx.created_gig_ids[0] if ctx.created_gig_ids else (ctx.gig_id or GENERAL_THREAD_ID)
    caller_label = ctx.caller_name or ctx.caller_phone or "Caller"

    lines = []
    for turn in ctx.transcript:
        who = {"caller": caller_label, "gigler": "Gigler", "tool": "[tool]"}.get(turn["role"], turn["role"])
        lines.append(f"{who}: {turn['text']}")
    body = f"[Voice call transcript — {ctx.direction}, {ctx.started_at}]\n" + "\n".join(lines)

    # Logged as an outbound Gigler message: conversation history maps
    # inbound -> user role, and the transcript contains Gigler's own lines,
    # so it must not replay as if the user said it.
    _log_message(
        thread_id,
        "gigler",
        "Gigler",
        body[:8000],
        "outbound",
        "voice_note",
    )
    log.info(
        f"Wrote call transcript ({len(ctx.transcript)} turns) to thread {thread_id}",
        extra={"callSid": ctx.call_sid, "userId": ctx.user_id},
    )


def _send_sms(to: str, body: str) -> bool:
    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
    params = {"To": to, "Body": body, "From": GIGLER_NUMBER}
    if TWILIO_MESSAGING_SERVICE_SID:
        params["MessagingServiceSid"] = TWILIO_MESSAGING_SERVICE_SID
    auth = base64.b64encode(f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()).decode()
    req = urllib.request.Request(url, data=urllib.parse.urlencode(params).encode(), method="POST")
    req.add_header("Authorization", f"Basic {auth}")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception as e:
        log.error(f"SMS send failed: {e}")
        return False


# ---------------------------------------------------------------------------
# Tool declarations
# ---------------------------------------------------------------------------

GIGLER_TOOL_DECLARATIONS = [
    {
        "name": "get_my_gigs",
        "description": (
            "Look up the caller's gigs and their statuses. Use when they ask "
            "'where is my...', 'what's the status', or 'what am I working on with you'."
        ),
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "create_gig",
        "description": (
            "Create a new gig from what the caller asked for. Call this once you "
            "understand the request well enough to start. The work begins "
            "immediately and links are delivered by text."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Short, friendly gig title, e.g. 'Friday Rooftop Party Invite Site'.",
                },
                "description": {
                    "type": "string",
                    "description": "The caller's request in full detail, including every specific they mentioned (dates, addresses, styles, names).",
                },
                "gig_type": {
                    "type": "string",
                    "description": "Best-fit category for the request.",
                    "enum": [
                        "coding", "planning", "creative", "professional", "lifestyle",
                        "scheduling", "education", "business_formation", "reservations",
                        "household", "custom",
                    ],
                },
                "caller_name": {
                    "type": "string",
                    "description": "The caller's first name if they told you and they're a new user.",
                },
            },
            "required": ["title", "description", "gig_type"],
        },
    },
    {
        "name": "send_gig_link",
        "description": (
            "Text the caller the most recent link for one of their gigs. Use when "
            "they ask you to resend a link or where their deliverable is."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "gig_id": {
                    "type": "string",
                    "description": "The gig id from get_my_gigs.",
                },
            },
            "required": ["gig_id"],
        },
    },
    {
        "name": "end_call",
        "description": (
            "Hang up the phone call. Call this AFTER you have said your final goodbye. "
            "Do NOT call this until you have finished speaking your farewell."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "reason": {
                    "type": "string",
                    "description": "Why the call is ending.",
                    "enum": ["completed", "caller_done", "voicemail", "unclear_audio", "time_limit"],
                },
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Tool handlers
# ---------------------------------------------------------------------------

async def handle_get_my_gigs(ctx: CallContext, args: dict[str, Any]) -> str:
    if not ctx.is_known_user:
        return "Caller is not a registered user yet. Offer to start their first gig."

    def _query():
        resp = gig_table.query(
            IndexName="byOwner",
            KeyConditionExpression=boto3.dynamodb.conditions.Key("ownerId").eq(ctx.user_id),
        )
        return resp.get("Items", [])

    gigs = await asyncio.to_thread(_query)
    active = [g for g in gigs if g.get("status") in ("active", "awaiting", "completed")]
    active.sort(key=lambda g: g.get("updatedAt", ""), reverse=True)
    if not active:
        return "No gigs found. Offer to start one."
    summary = [
        {"id": g["id"], "title": g.get("title"), "status": g.get("status"), "type": g.get("type")}
        for g in active[:8]
    ]
    return json.dumps({"gigs": summary})


async def handle_create_gig(ctx: CallContext, args: dict[str, Any]) -> str:
    title = (args.get("title") or "New Gig").strip()[:100]
    description = (args.get("description") or title).strip()
    gig_type = args.get("gig_type", "custom")
    caller_name = (args.get("caller_name") or "").strip()

    def _create():
        user = _ensure_user(ctx)
        if caller_name and not ctx.caller_name:
            user_table.update_item(
                Key={"id": ctx.user_id},
                UpdateExpression="SET #n = :n, updatedAt = :now",
                ExpressionAttributeNames={"#n": "name"},
                ExpressionAttributeValues={":n": caller_name, ":now": _now_iso()},
            )
            ctx.caller_name = caller_name

        now = _now_iso()
        gig_id = _gen_id("gig")
        gig_table.put_item(
            Item={
                "id": gig_id,
                "ownerId": ctx.user_id,
                "title": title,
                "description": description,
                "type": gig_type,
                "status": "active",
                "metadata": json.dumps({"source": "voice_call", "callSid": ctx.call_sid}),
                "createdAt": now,
                "updatedAt": now,
            }
        )
        if participant_table is not None:
            participant_table.put_item(
                Item={
                    "gigId": gig_id,
                    "phone": ctx.caller_phone,
                    "userId": ctx.user_id,
                    "role": "owner",
                    "name": ctx.caller_name,
                    "isGuest": False,
                    "joinedAt": now,
                }
            )

        _log_message(
            gig_id,
            ctx.user_id,
            ctx.caller_name or ctx.caller_phone,
            f"[via voice call] {description}",
            "inbound",
            "voice_note",
        )

        if GIG_PROCESSOR_FUNCTION_NAME:
            lambda_client.invoke(
                FunctionName=GIG_PROCESSOR_FUNCTION_NAME,
                InvocationType="Event",
                Payload=json.dumps(
                    {
                        "gigId": gig_id,
                        "userId": ctx.user_id,
                        "message": description,
                        "mediaUrls": [],
                        "phone": ctx.caller_phone,
                        "senderName": ctx.caller_name,
                        # NOTE: unlike the SMS flow, do NOT skipReply — the
                        # processor's full pipeline is what produces the
                        # deliverable and texts the link we promise on the call.
                        "skipReply": False,
                        "_trace": {
                            "traceId": uuid.uuid4().hex,
                            "requestId": ctx.call_sid or "voice-call",
                            "source": "gigler-voice-bridge",
                        },
                    }
                ).encode(),
            )
        return gig_id

    try:
        gig_id = await asyncio.to_thread(_create)
    except Exception as e:
        log.error(f"create_gig failed: {e}", exc_info=e, extra={"callSid": ctx.call_sid})
        return "Gig creation failed. Apologize briefly and suggest texting the request instead."

    ctx.created_gig_ids.append(gig_id)
    await asyncio.to_thread(
        _send_sms,
        ctx.caller_phone,
        f'Gigler here — your gig "{title}" is underway. I\'ll text your link in this thread shortly.',
    )
    log.info(f"Created gig {gig_id} from voice call", extra={"callSid": ctx.call_sid, "userId": ctx.user_id})
    return json.dumps(
        {
            "ok": True,
            "gig_id": gig_id,
            "note": "Gig created and work started. A confirmation text was already sent. Tell the caller the link will arrive by text shortly.",
        }
    )


_URL_RE = re.compile(r"https?://\S+")


async def handle_send_gig_link(ctx: CallContext, args: dict[str, Any]) -> str:
    gig_id = args.get("gig_id", "")
    if not gig_id:
        return "Missing gig_id. Use get_my_gigs first."

    def _find_link():
        resp = message_table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key("gigId").eq(gig_id),
            ScanIndexForward=False,
            Limit=50,
        )
        for item in resp.get("Items", []):
            if item.get("direction") != "outbound":
                continue
            m = _URL_RE.search(item.get("body", ""))
            if m:
                return m.group(0).rstrip(".,)")
        return None

    link = await asyncio.to_thread(_find_link)
    if not link:
        return "No link found for that gig yet. Tell the caller it's still in progress and will be texted when ready."

    sent = await asyncio.to_thread(
        _send_sms, ctx.caller_phone, f"Gigler here — your link: {link}"
    )
    if not sent:
        return "Texting the link failed. Apologize and say you'll follow up."
    return "Link texted to the caller. Confirm they should see it momentarily."


async def _hangup_after_grace(call_sid: str):
    # Grace period so the spoken goodbye finishes playing before hangup.
    await asyncio.sleep(8)
    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls/{call_sid}.json"
    auth = base64.b64encode(f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()).decode()
    req = urllib.request.Request(url, data=b"Status=completed", method="POST")
    req.add_header("Authorization", f"Basic {auth}")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        await asyncio.to_thread(urllib.request.urlopen, req)
        log.info("Call terminated via Twilio", extra={"callSid": call_sid})
    except Exception as e:
        log.error(f"Failed to end call via Twilio: {e}", extra={"callSid": call_sid})


async def handle_end_call(ctx: CallContext, args: dict[str, Any]) -> str:
    reason = args.get("reason", "completed")
    if ctx.end_call_reason:
        return "Call is already ending."
    ctx.end_call_reason = reason
    log.info(f"Ending call (reason={reason})", extra={"callSid": ctx.call_sid, "action": "end_call"})
    if not ctx.call_sid:
        return "Cannot hang up — missing call sid."

    # Hang up in the background so the tool result returns immediately and the
    # goodbye audio isn't stalled behind this handler.
    asyncio.create_task(_hangup_after_grace(ctx.call_sid))
    return "Call ending. Stay silent."


TOOL_HANDLERS = {
    "get_my_gigs": handle_get_my_gigs,
    "create_gig": handle_create_gig,
    "send_gig_link": handle_send_gig_link,
    "end_call": handle_end_call,
}


# Dedup guard: Gemini Live occasionally fires the same tool call twice.
_recent_tool_calls: dict[str, tuple[float, str]] = {}
_DEDUP_WINDOW_S = 8.0


async def dispatch_tool_call(ctx: CallContext, name: str, args: dict[str, Any]) -> str:
    handler = TOOL_HANDLERS.get(name)
    if not handler:
        log.warning(f"Unknown tool: {name}", extra={"callSid": ctx.call_sid})
        return f"Unknown tool: {name}"

    dedup_key = f"{ctx.call_sid}:{name}:{hashlib.md5(str(sorted(args.items())).encode()).hexdigest()}"
    now = time.monotonic()
    if dedup_key in _recent_tool_calls:
        last_time, last_result = _recent_tool_calls[dedup_key]
        if now - last_time < _DEDUP_WINDOW_S:
            log.info(f"Dedup: skipping duplicate {name} call", extra={"callSid": ctx.call_sid})
            return last_result

    result = await handler(ctx, args)
    _recent_tool_calls[dedup_key] = (now, result)

    stale = [k for k, (t, _) in _recent_tool_calls.items() if now - t > 30]
    for k in stale:
        del _recent_tool_calls[k]

    return result
