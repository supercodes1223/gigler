import { GlassNav } from "@/components/marketing/GlassNav";
import { MeshHero } from "@/components/marketing/MeshHero";
import { IphoneDemo } from "@/components/marketing/IphoneDemo";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { UseCases } from "@/components/marketing/UseCases";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { Trust } from "@/components/marketing/Trust";
import { FinalCta, MarketingFooter } from "@/components/marketing/FinalCta";

export default function Home() {
  return (
    <main className="flex-1">
      <GlassNav />
      <MeshHero />

      <section id="demo" className="px-6 py-24 md:py-32">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="See it work"
            title="Like texting a very capable friend."
            subtitle="Watch Gigler take Friday dinner from “can you?” to confirmed, start to finish."
          />
          <div className="mt-14">
            <IphoneDemo />
          </div>
        </div>
      </section>

      <UseCases />
      <HowItWorks />
      <Trust />
      <FinalCta />
      <MarketingFooter />
    </main>
  );
}
