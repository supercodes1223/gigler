#!/bin/bash
# Assemble the captioned submission video (~2:20, 1080p30, no audio).
# Run from repo root: bash docs/submission/video-assets/assemble.sh
set -euo pipefail

A=docs/submission/video-assets
OUT=$A/out
SEG=$OUT/segments
mkdir -p "$SEG"

FPS=30
F="-y -loglevel error"

img_seg () { # img_seg <in.png> <seconds> <out.mp4> — still with fade in/out
  local in=$1 dur=$2 out=$3
  ffmpeg $F -loop 1 -t "$dur" -i "$in" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#060a08,fade=t=in:st=0:d=0.35,fade=t=out:st=$(echo "$dur-0.35" | bc):d=0.35,format=yuv420p" \
    -r $FPS -c:v libx264 -preset medium -crf 18 "$out"
}

# 1. Title (7s) / 2. Problem (8s)
img_seg "$OUT/card-title.png"   7 "$SEG/01-title.mp4"
img_seg "$OUT/card-problem.png" 8 "$SEG/02-problem.mp4"

# 3. Landing scroll (webm, 15.2s -> trim to 14s)
ffmpeg $F -i "$OUT"/page@*.webm -t 14 \
  -vf "scale=1920:1080,fade=t=in:st=0:d=0.35,fade=t=out:st=13.65:d=0.35,format=yuv420p" \
  -r $FPS -c:v libx264 -preset medium -crf 18 "$SEG/03-landing.mp4"

# 4. SMS exchange: steps 1-5 (6s each = 30s)
for i in 01 02 03 04 05; do
  img_seg "$OUT/step-$i.png" 6 "$SEG/04-sms-$i.mp4"
done

# 5. Quality card (10s) / 6. Judge log (10s)
img_seg "$OUT/card-quality.png" 10 "$SEG/05-quality.mp4"
img_seg "$OUT/judge-log.png"    10 "$SEG/06-judgelog.mp4"

# 7a. OTP gate (5s)
img_seg "$OUT/deliverable.png" 5 "$SEG/07-otp.mp4"

# 7b. Invite site vertical pan (12s) — tall mobile shot (972x3540) panned top->bottom
#     Scale to width 800 (height ~2913), centered on 1920x1080 dark stage, crop window pans.
ffmpeg $F -loop 1 -t 12 -i "$OUT/invite-site-mobile.png" -f lavfi -i "color=#060a08:s=1920x1080:r=$FPS" \
  -filter_complex "[0:v]scale=800:-2[site];[1:v][site]overlay=x=560:y='-(h-1080)*t/12':shortest=1,fade=t=in:st=0:d=0.35,fade=t=out:st=11.65:d=0.35,format=yuv420p" \
  -t 12 -r $FPS -c:v libx264 -preset medium -crf 18 "$SEG/08-site.mp4"

# 8. Architecture diagram with slow zoom toward the Quality Loop band (12s)
ffmpeg $F -i architecture/gigler-challenge-architecture.png \
  -vf "scale=3840:2160,zoompan=z='1+0.25*on/(12*$FPS)':x='(iw-iw/zoom)/2':y='(ih*0.38-ih*0.38/zoom)':d=12*$FPS:s=1920x1080:fps=$FPS,fade=t=in:st=0:d=0.35,fade=t=out:st=11.65:d=0.35,format=yuv420p" \
  -t 12 -r $FPS -c:v libx264 -preset medium -crf 18 "$SEG/09-arch.mp4"

# 9. Close (8s)
img_seg "$OUT/card-close.png" 8 "$SEG/10-close.mp4"

# Concat
ls "$SEG"/*.mp4 | sort | sed "s/^/file '/; s/$/'/" | sed "s|$SEG/||" > "$SEG/list.txt"
(cd "$SEG" && ffmpeg $F -f concat -safe 0 -i list.txt -c copy ../gigler-submission-video.mp4)

ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/gigler-submission-video.mp4"
echo "DONE -> $OUT/gigler-submission-video.mp4"
