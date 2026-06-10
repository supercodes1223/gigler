import { WaitlistButton } from "./WaitlistButton";

export function FinalCta() {
  return (
    <section className="px-6 pb-24 pt-8 md:pb-32">
      <div
        className="glass relative mx-auto flex max-w-4xl flex-col items-center overflow-hidden rounded-[2.5rem] px-6 py-16 text-center md:py-20"
        style={{
          backgroundImage:
            "radial-gradient(60% 80% at 20% 10%, rgba(201,236,217,0.55) 0%, transparent 60%), radial-gradient(50% 70% at 85% 20%, rgba(207,229,247,0.55) 0%, transparent 60%), radial-gradient(55% 75% at 60% 100%, rgba(226,220,245,0.5) 0%, transparent 60%)",
        }}
      >
        <h2 className="max-w-xl text-balance text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
          The first assistant that actually feels like one.
        </h2>
        <p className="mt-4 text-balance text-base text-foreground/65 md:text-lg">
          Coming soon. iOS-first. Pricing announced at launch.
        </p>
        <WaitlistButton size="lg" className="mt-8 h-12 px-7 text-base" />
      </div>
    </section>
  );
}

export function MarketingFooter() {
  return (
    <footer className="hairline relative overflow-hidden border-t pt-12">
      <span className="sr-only">© 2026 Gigler</span>
      {/* Giant wordmark. SVG textLength stretches the word to exactly fill
          its box, so it always spans 95% of the page width with the whole
          word (descender included) visible. */}
      <div aria-hidden className="pointer-events-none flex select-none justify-center pb-2">
        <svg viewBox="0 0 273 102" className="w-[95%]">
          <text
            x="50%"
            y="78"
            textAnchor="middle"
            textLength="271"
            lengthAdjust="spacingAndGlyphs"
            fontSize="100"
            fontWeight="600"
            letterSpacing="-2"
            className="fill-foreground/[0.045]"
            style={{ fontFamily: "var(--font-sans), sans-serif" }}
          >
            Gigler
          </text>
        </svg>
      </div>
    </footer>
  );
}
