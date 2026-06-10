/**
 * SF Symbols-style glyphs for the iPhone mockup screens.
 *
 * Lucide's stroked icons read as hand-drawn next to real iOS UI; these are
 * filled vector approximations of the SF Symbols Apple uses (speaker.wave.2,
 * video.fill, mic.slash.fill, ellipsis, phone.down.fill, the keypad dot
 * grid, message.fill, phone.fill, envelope.fill, star.fill). Drawn by hand —
 * SF Symbols artwork itself is licensed for Apple platforms only.
 */

type IconProps = { className?: string };

export function SpeakerWave2Fill({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path
        fill="currentColor"
        d="M10.74 4.3 6.8 7.84H4.9A1.9 1.9 0 0 0 3 9.74v4.52c0 1.05.85 1.9 1.9 1.9h1.9l3.94 3.54c.64.58 1.66.12 1.66-.74V5.04c0-.86-1.02-1.32-1.66-.74Z"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        d="M15.4 9.1a4.3 4.3 0 0 1 0 5.8"
      />
      <path
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        d="M18.3 6.5a8.3 8.3 0 0 1 0 11"
      />
    </svg>
  );
}

export function VideoFill({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path
        fill="currentColor"
        d="M2.5 8.3A2.3 2.3 0 0 1 4.8 6h8.4a2.3 2.3 0 0 1 2.3 2.3v7.4a2.3 2.3 0 0 1-2.3 2.3H4.8a2.3 2.3 0 0 1-2.3-2.3V8.3Z"
      />
      <path
        fill="currentColor"
        d="m17 10.4 3.6-2.5c.66-.46 1.56.02 1.56.82v6.56c0 .8-.9 1.28-1.56.82L17 13.6v-3.2Z"
      />
    </svg>
  );
}

export function MicSlashFill({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <mask id="sf-mic-slash-cut">
        <rect width="24" height="24" fill="#fff" />
        <path
          d="M3.8 3.8 20.2 20.2"
          stroke="#000"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </mask>
      <g mask="url(#sf-mic-slash-cut)">
        <rect x="9.2" y="2.2" width="5.6" height="11.6" rx="2.8" fill="currentColor" />
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          d="M6 11.4a6 6 0 0 0 12 0"
        />
        <path
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          d="M12 17.4v3.4"
        />
      </g>
      <path
        d="M4.5 4.5 19.5 19.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function EllipsisFill({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <circle cx="5.6" cy="12" r="1.9" fill="currentColor" />
      <circle cx="12" cy="12" r="1.9" fill="currentColor" />
      <circle cx="18.4" cy="12" r="1.9" fill="currentColor" />
    </svg>
  );
}

export function PhoneDownFill({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path
        fill="currentColor"
        d="M2.3 13.1c-.5-1.4.3-2.6 1.9-3.4C6.6 8.5 9.6 8 12 8s5.4.5 7.8 1.7c1.6.8 2.4 2 1.9 3.4l-.46 1.26c-.37 1-1.5 1.55-2.57 1.24l-2.7-.78c-.88-.26-1.5-1-1.58-1.9l-.1-1.13A9.6 9.6 0 0 0 12 11.5c-.8 0-1.55.1-2.3.29l-.1 1.13c-.08.9-.7 1.64-1.58 1.9l-2.7.78c-1.06.31-2.2-.23-2.56-1.24L2.3 13.1Z"
      />
    </svg>
  );
}

export function KeypadDotsFill({ className }: IconProps) {
  const cols = [6.4, 12, 17.6];
  const rows = [4.6, 9.4, 14.2, 19];
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      {rows.map((y) =>
        cols.map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.55" fill="currentColor" />
        ))
      )}
    </svg>
  );
}

export function MessageFill({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path
        fill="currentColor"
        d="M12 3.2c-5.3 0-9.5 3.72-9.5 8.3 0 2 .82 3.85 2.2 5.28-.18 1.1-.75 2.16-1.62 2.98-.3.28-.1.78.31.77 1.66-.05 3.16-.6 4.31-1.41 1.3.51 2.75.78 4.3.78 5.3 0 9.5-3.71 9.5-8.4 0-4.58-4.2-8.3-9.5-8.3Z"
      />
    </svg>
  );
}

export function PhoneFill({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path
        fill="currentColor"
        d="M7.05 3.3c.74-.74 1.96-.65 2.6.18l1.66 2.16c.52.68.5 1.63-.05 2.28l-1.03 1.23c-.25.3-.3.73-.1 1.07a12.3 12.3 0 0 0 3.65 3.65c.34.2.77.15 1.07-.1l1.23-1.03c.65-.55 1.6-.57 2.28-.05l2.16 1.66c.83.64.92 1.86.18 2.6l-1 1c-.83.83-2.04 1.2-3.18.9C10.9 17.4 6.6 13.1 5.15 7.48c-.3-1.14.07-2.35.9-3.18l1-1Z"
      />
    </svg>
  );
}

export function EnvelopeFill({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path
        fill="currentColor"
        d="M2 7.2 11.2 13c.5.32 1.1.32 1.6 0L22 7.2V7a2.5 2.5 0 0 0-2.5-2.5h-15A2.5 2.5 0 0 0 2 7v.2Z"
      />
      <path
        fill="currentColor"
        d="m22 9.5-8.4 5.3c-1 .62-2.2.62-3.2 0L2 9.5V17a2.5 2.5 0 0 0 2.5 2.5h15A2.5 2.5 0 0 0 22 17V9.5Z"
      />
    </svg>
  );
}

export function StarFill({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path
        fill="currentColor"
        d="M11.45 2.93c.22-.48.88-.48 1.1 0l2.4 5.14 5.63.65c.52.06.73.7.34 1.06l-4.16 3.8 1.1 5.56c.11.52-.45.92-.91.65L12 17.06l-4.95 2.73c-.46.27-1.02-.13-.91-.65l1.1-5.56-4.16-3.8c-.39-.36-.18-1 .34-1.06l5.63-.65 2.4-5.14Z"
      />
    </svg>
  );
}
