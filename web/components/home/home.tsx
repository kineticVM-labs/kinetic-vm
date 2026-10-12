import { Builders } from "@/components/home/builders";
import { ClosingCta, SiteFooter } from "@/components/home/closing";
import { HeroCopy } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { MachineWall } from "@/components/home/machine-wall";
import { MarketplaceTeaser } from "@/components/home/marketplace-teaser";
import { Pillars } from "@/components/home/pillars";
import { Problem } from "@/components/home/problem";
import { ProofFeed } from "@/components/home/proof-feed";
import { Security } from "@/components/home/security";
import { SiteHeader } from "@/components/home/site-header";
import { StackStrip } from "@/components/home/stack-strip";
import { UseCases } from "@/components/home/use-cases";
import { claimHref } from "@/lib/links";

export function Home({ host }: { host: string }) {
  const claim = claimHref(host);
  return (
    <>
      <SiteHeader claim={claim} />
      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-40 -top-40 size-[40rem] rounded-full bg-purple/10 blur-[120px]" />
          <div className="relative mx-auto flex max-w-7xl items-center px-6 pb-14 pt-32 sm:pt-40 lg:min-h-[max(44rem,min(100dvh,60rem))] lg:py-28">
            <HeroCopy />
          </div>
          <div className="relative h-[26rem] sm:h-[34rem] lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[52%]">
            <MachineWall />
          </div>
        </section>
        <StackStrip />
        <Problem />
        <Pillars />
        <HowItWorks />
        <ProofFeed />
        <MarketplaceTeaser />
        <UseCases />
        <Builders />
        <Security />
        <ClosingCta claim={claim} />
      </main>
      <SiteFooter />
    </>
  );
}
