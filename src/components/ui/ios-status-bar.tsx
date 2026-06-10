import { cn } from "@/lib/utils";

/**
 * iOS status bar for screens rendered inside the Iphone17Pro frame.
 *
 * Real iOS centers the time in the left "ear" (screen edge to Dynamic
 * Island, 0-34.1% of screen width) and the radios in the right ear
 * (66-100%), with the row vertically centered on the island (center ~3.5%
 * of screen height -> 39px row at the 300px design width). Absolutely
 * positioned so it can never participate in layout shifts. Icon sizes track
 * real iOS proportions at this screen scale (~0.66x of a 393pt device).
 *
 * Glyphs draw with currentColor — set `text-black` / `text-white` via
 * className to match the screen behind it.
 */
export function IosStatusBar({
  time = "2:14",
  className,
}: {
  time?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-0 z-20 flex h-[39px] items-center justify-between",
        className
      )}
    >
      <div className="flex w-[34%] justify-center">
        <span className="text-[12.5px] font-semibold tracking-[-0.01em]">
          {time}
        </span>
      </div>
      <div className="flex w-[34%] items-center justify-center gap-[5px]">
        {/* Cellular bars */}
        <svg viewBox="0 0 17 11" className="h-[7.5px] w-auto" aria-hidden>
          <rect x="0" y="6.6" width="3.2" height="4.4" rx="1" fill="currentColor" />
          <rect x="4.6" y="4.4" width="3.2" height="6.6" rx="1" fill="currentColor" />
          <rect x="9.2" y="2.2" width="3.2" height="8.8" rx="1" fill="currentColor" />
          <rect x="13.8" y="0" width="3.2" height="11" rx="1" fill="currentColor" />
        </svg>
        {/* Wi-Fi */}
        <svg viewBox="0 0 15 11" className="h-[7.5px] w-auto" aria-hidden>
          <path
            d="M1.2 4.1a8.9 8.9 0 0 1 12.6 0L12.1 5.8a6.5 6.5 0 0 0-9.2 0Z"
            fill="currentColor"
          />
          <path
            d="M3.6 6.5a5.5 5.5 0 0 1 7.8 0L9.7 8.2a3.1 3.1 0 0 0-4.4 0Z"
            fill="currentColor"
          />
          <path d="M7.5 10.9 5.9 9.3a2.3 2.3 0 0 1 3.2 0Z" fill="currentColor" />
        </svg>
        {/* Battery */}
        <svg viewBox="0 0 25 12" className="h-[8px] w-auto" aria-hidden>
          <rect
            x="0.5"
            y="0.5"
            width="21"
            height="11"
            rx="3.5"
            stroke="currentColor"
            strokeOpacity="0.4"
            fill="none"
          />
          <rect x="2" y="2" width="18" height="8" rx="2" fill="currentColor" />
          <path
            d="M22.8 3.9v4.2a2.1 2.1 0 0 0 0-4.2Z"
            fill="currentColor"
            fillOpacity="0.4"
          />
        </svg>
      </div>
    </div>
  );
}
