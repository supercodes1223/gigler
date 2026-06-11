# Demo Video — captions-only edit plan (2:20 target, 3:00 hard cap)

> Decision (locked): **no voiceover** — fully captioned, assembled by the agent with
> the HTML stage pipeline in `video-assets/` + ffmpeg. Demo gig: **invite site**,
> driven live against production (real backend, real deliverable, real judge logs).
> All caption copy lives in the stage/card HTML; this file is the edit sequence.

## Sequence

| # | Time | Clip | Source | Caption (on-frame) |
|---|------|------|--------|--------------------|
| 1 | 0:00–0:08 | Title card | `card.html?card=title` | Gigler Orca — AI gig orchestration for completed work |
| 2 | 0:08–0:18 | Problem card | `card.html?card=problem` | People don't want to operate AI tools. They want outcomes. |
| 3 | 0:18–0:34 | Landing scroll | live capture of gigler.ai (webm) | Live at gigler.ai — text it like a friend |
| 4 | 0:34–1:10 | SMS exchange, stepped | `demo-stage.html?step=1..N` (real replies from the live run) | One SMS in → a Gemini agent classifies, plans, executes |
| 5 | 1:10–1:28 | Quality Loop card | `card.html?card=quality` | NEW — Track 2: a judge in front of every action |
| 6 | 1:28–1:40 | CloudWatch judge verdict | screenshot, zoom/crop, PII redacted | Runs on every message, in production |
| 7 | 1:40–2:00 | The deliverable | live capture of the generated `gigler.ai/{shortCode}` invite site | Seconds later: a hosted, shareable deliverable |
| 8 | 2:00–2:12 | Architecture diagram | `architecture/gigler-challenge-architecture.png`, slow zoom on the Quality Loop band | Gemini 3.1 Pro worker · Gemini 2.5 Flash judge · learning loop |
| 9 | 2:12–2:24 | Close card | `card.html?card=close` | Text it. It gets done. — gigler.ai |

## Production checklist

- [x] Stage pipeline proven (`capture.mjs`: stage / steps / scroll / page)
- [x] Landing scroll captured (`video-assets/out/*.webm`)
- [ ] Live demo run against prod **after the quality-loop deploy** (so beat 6 shows real judge verdicts)
- [ ] Replace `messages.js` placeholders with the real exchange from the run
- [ ] Capture the generated invite-site deliverable (page + short scroll)
- [ ] CloudWatch judge-verdict screenshot — redact phone numbers / IDs
- [ ] Assemble with ffmpeg (1080p MP4, crossfades, no audio or low neutral bed)
- [ ] Watch once end-to-end; confirm < 3:00; upload YouTube unlisted

## Notes

- Beat 6 is the single most important Track-2 frame. Cut B-roll before cutting this.
- Don't show the real Gigler number — the demo stage uses a generic "Gigler" contact header by design.
- Captions are styled inside the HTML stages (no ffmpeg drawtext needed except the two screenshot beats, which get a caption bar added at assembly).
