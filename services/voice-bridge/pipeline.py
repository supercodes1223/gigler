"""Pipecat pipeline: Twilio Media Streams <-> Gemini Live for Gigler voice calls.

Ported from AmpLanding's production voice bridge, stripped down to Gigler's
needs: inbound "call Gigler" support, outbound wake-up/check-in calls,
gig tools, transcript capture into the Message table.
"""

import asyncio
import json
import time

from pipecat.frames.frames import (
    Frame,
    TranscriptionFrame,
    TTSAudioRawFrame,
    TTSTextFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.serializers.twilio import TwilioFrameSerializer
from pipecat.services.google.gemini_live import GeminiLiveLLMService
from pipecat.services.google.gemini_live.llm import (
    EndSensitivity,
    GeminiVADParams,
    StartSensitivity,
)
from pipecat.services.llm_service import FunctionCallParams
from pipecat.transports.network.fastapi_websocket import (
    FastAPIWebsocketParams,
    FastAPIWebsocketTransport,
)

from config import (
    GEMINI_MODEL,
    GEMINI_VOICE,
    GOOGLE_API_KEY,
    MAX_CALL_SECONDS,
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
)
from logging_config import log
from prompts import build_system_instruction
from tools import (
    CallContext,
    GIGLER_TOOL_DECLARATIONS,
    dispatch_tool_call,
    lookup_caller,
    write_call_transcript,
)


class TranscriptCollector(FrameProcessor):
    """Captures user speech (TranscriptionFrame, pushed upstream by the LLM)
    and Gigler speech (TTSTextFrame, pushed downstream) into ctx.transcript."""

    def __init__(self, ctx: CallContext):
        super().__init__()
        self._ctx = ctx

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)
        if isinstance(frame, TranscriptionFrame) and frame.text.strip():
            self._ctx.add_transcript_turn("caller", frame.text.strip())
        elif isinstance(frame, TTSTextFrame) and frame.text.strip():
            self._ctx.bot_spoke = True
            self._ctx.add_transcript_turn("gigler", frame.text.strip())
        elif isinstance(frame, TTSAudioRawFrame):
            self._ctx.bot_spoke = True
        await self.push_frame(frame, direction)


async def run_voice_pipeline(
    websocket,
    stream_sid: str,
    call_sid: str,
    caller_phone: str,
    direction: str = "inbound",
    call_type: str | None = None,
    user_id: str | None = None,
    gig_id: str | None = None,
    extra_context: str | None = None,
):
    """Set up and run the Pipecat pipeline for a single Gigler call."""

    ctx = CallContext(
        caller_phone=caller_phone,
        call_sid=call_sid,
        direction=direction,
        call_type=call_type,
        gig_id=gig_id,
    )

    # Caller lookup (User + active Gigs) for system-instruction context.
    try:
        await asyncio.to_thread(lookup_caller, ctx, user_id)
    except Exception as e:
        log.warning(f"Caller lookup failed (continuing as unknown): {e}", extra={"callSid": call_sid})

    system_instruction = build_system_instruction(
        caller_name=ctx.caller_name,
        is_known_user=ctx.is_known_user,
        active_gigs=ctx.active_gigs,
        direction=direction,
        call_type=call_type,
        extra_context=extra_context,
    )

    log.info(
        f"Starting pipeline: direction={direction}, type={call_type}, known={ctx.is_known_user}, caller={ctx.caller_name or 'unknown'}",
        extra={"callSid": call_sid, "callerPhone": caller_phone, "userId": ctx.user_id},
    )

    serializer = TwilioFrameSerializer(
        stream_sid=stream_sid,
        call_sid=call_sid,
        account_sid=TWILIO_ACCOUNT_SID,
        auth_token=TWILIO_AUTH_TOKEN,
    )

    transport = FastAPIWebsocketTransport(
        websocket=websocket,
        params=FastAPIWebsocketParams(
            serializer=serializer,
            audio_in_enabled=True,
            audio_out_enabled=True,
        ),
    )

    vad_params = GeminiVADParams(
        start_sensitivity=StartSensitivity.START_SENSITIVITY_HIGH,
        end_sensitivity=EndSensitivity.END_SENSITIVITY_LOW,
        prefix_padding_ms=200,
    )

    llm = GeminiLiveLLMService(
        api_key=GOOGLE_API_KEY,
        system_instruction=system_instruction,
        tools=[{"function_declarations": GIGLER_TOOL_DECLARATIONS}],
        settings=GeminiLiveLLMService.Settings(
            model=GEMINI_MODEL,
            voice=GEMINI_VOICE,
            vad=vad_params,
        ),
        inference_on_context_initialization=True,
    )

    async def tool_handler(params: FunctionCallParams):
        log.info(
            f"Tool call: {params.function_name}",
            extra={"callSid": call_sid, "userId": ctx.user_id, "action": f"tool_{params.function_name}"},
        )
        result = await dispatch_tool_call(ctx, params.function_name, params.arguments)
        result_str = json.dumps(result) if not isinstance(result, str) else result
        ctx.add_transcript_turn("tool", f"{params.function_name} -> {result_str[:300]}")
        await llm._tool_result(params.tool_call_id, params.function_name, {"result": result_str})

    for tool_decl in GIGLER_TOOL_DECLARATIONS:
        llm.register_function(tool_decl["name"], tool_handler)

    # User transcription frames travel upstream from the LLM (seen by the
    # collector before it); TTS text/audio travels downstream (seen by the
    # collector after it).
    user_transcripts = TranscriptCollector(ctx)
    bot_transcripts = TranscriptCollector(ctx)
    pipeline = Pipeline([transport.input(), user_transcripts, llm, bot_transcripts, transport.output()])

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            audio_in_sample_rate=8000,
            audio_out_sample_rate=8000,
            allow_interruptions=True,
        ),
    )

    runner = PipelineRunner()
    call_disconnected = False
    post_call_handled = False
    started_at = time.monotonic()
    max_duration_task: asyncio.Task | None = None
    first_turn_task: asyncio.Task | None = None

    async def first_turn_watchdog():
        """Gemini Live sometimes stays silent until the caller speaks. Force a
        spoken greeting if no bot audio within the first couple of seconds.
        (Same workaround as the original production bridge.)"""
        for _ in range(50):
            if call_disconnected or ctx.bot_spoke:
                return
            if getattr(llm, "_session", None):
                break
            await asyncio.sleep(0.1)
        await asyncio.sleep(1.5)
        if call_disconnected or ctx.bot_spoke:
            return
        log.info("No first bot audio; nudging Gemini to greet", extra={"callSid": call_sid})
        try:
            await llm._create_single_response([
                {
                    "role": "user",
                    "content": (
                        "SYSTEM CONTROL: The call just connected and you have not "
                        "spoken yet. Greet the caller now exactly as your "
                        "instructions describe for this call type. Keep it to one "
                        "short sentence, then wait for their reply."
                    ),
                }
            ])
        except Exception as e:
            log.warning(f"First-turn nudge failed (non-fatal): {e}", extra={"callSid": call_sid})

    async def max_duration_watchdog():
        """Ask Gigler to wrap up near the cap; hard-hangup shortly after."""
        await asyncio.sleep(MAX_CALL_SECONDS)
        if call_disconnected:
            return
        log.info("Max call duration reached; asking model to wrap up", extra={"callSid": call_sid})
        try:
            await llm._create_single_response([
                {
                    "role": "user",
                    "content": (
                        "SYSTEM CONTROL: The call has reached its time limit. "
                        "Say a brief, friendly goodbye now, then call the end_call tool."
                    ),
                }
            ])
        except Exception as e:
            log.warning(f"Wrap-up nudge failed: {e}", extra={"callSid": call_sid})
        await asyncio.sleep(30)
        if not call_disconnected:
            log.warning("Hard-terminating call after grace period", extra={"callSid": call_sid})
            await dispatch_tool_call(ctx, "end_call", {"reason": "time_limit"})

    @transport.event_handler("on_client_connected")
    async def on_connected(transport, client):
        nonlocal max_duration_task, first_turn_task
        log.info("Client connected", extra={"callSid": call_sid})
        max_duration_task = asyncio.create_task(max_duration_watchdog())
        first_turn_task = asyncio.create_task(first_turn_watchdog())

    @transport.event_handler("on_client_disconnected")
    async def on_disconnected(transport, client):
        nonlocal call_disconnected, post_call_handled
        call_disconnected = True
        for t in (max_duration_task, first_turn_task):
            if t and not t.done():
                t.cancel()
        log.info(
            f"Call disconnected after {time.monotonic() - started_at:.0f}s",
            extra={"callSid": call_sid, "userId": ctx.user_id},
        )
        if not post_call_handled:
            post_call_handled = True
            await _handle_post_call(ctx)
        await task.cancel()

    await runner.run(task)

    call_disconnected = True
    for t in (max_duration_task, first_turn_task):
        if t and not t.done():
            t.cancel()
    if not post_call_handled:
        post_call_handled = True
        await _handle_post_call(ctx)

    log.info("Pipeline finished", extra={"callSid": call_sid})
    return ctx


async def _handle_post_call(ctx: CallContext):
    """Persist the call transcript to the Message table."""
    try:
        await asyncio.to_thread(write_call_transcript, ctx)
    except Exception as e:
        log.error(f"Failed to write call transcript: {e}", exc_info=e, extra={"callSid": ctx.call_sid})
