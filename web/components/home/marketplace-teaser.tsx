import Image from "next/image";

import { Reveal } from "@/components/home/reveal";
import { SmartLink } from "@/components/smart-link";
import { Eyebrow } from "@/components/home/section-heading";
import { CheckIcon, DataIcon } from "@/components/icons";
import { machineSrc } from "@/lib/machines";

const POINTS = [
  "Owners package the records their machines already keep",
  "Each row hashes to an attestation the device signed on Monad",
  "Buyers verify before they pay, without trusting the seller",
];

const BUYERS = ["AI trainers", "Researchers", "Auditors", "Insurers"];

export function MarketplaceTeaser() {
  return (
    <section id="marketplace" className="scroll-mt-24 px-4 py-28 sm:px-6 sm:py-36">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-lilac-strong bg-gradient-to-br from-lilac via-surface to-lilac-strong/70">
        <div className="dot-grid absolute inset-0 opacity-50 [mask-image:linear-gradient(to_left,#000,transparent_70%)]" />
        <div className="relative grid items-center gap-14 p-8 sm:p-12 lg:grid-cols-2 lg:p-16">
          <Reveal>
            <div className="flex flex-wrap items-center gap-3">
              <Eyebrow>Data marketplace</Eyebrow>
              <SmartLink
                href="/marketplace"
                className="rounded-full bg-purple px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white"
              >
                Open
              </SmartLink>
            </div>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-5xl">
              Datasets become{" "}
              <span className="font-serif text-[1.1em] font-normal italic tracking-normal text-purple">revenue.</span>
            </h2>
            <p className="mt-5 max-w-lg text-lg leading-8 text-fg">
              A machine&apos;s attested history is worth something to the people building and insuring the physical
              world. Owners will list it here, and buyers will check every row before they pay.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Who buys machine data">
              {BUYERS.map((buyer) => (
                <li
                  key={buyer}
                  className="rounded-full border border-lilac-strong bg-surface/80 px-3 py-1 text-[13px] font-medium text-ink"
                >
                  {buyer}
                </li>
              ))}
            </ul>
            <ul className="mt-8 space-y-3">
              {POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-[15px] leading-6 text-fg">
                  <span className="mt-0.5 grid size-5 flex-none place-items-center rounded-full bg-purple text-white">
                    <CheckIcon width={12} height={12} strokeWidth={2.5} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.1} className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-6 rounded-[2rem] bg-purple/10 blur-2xl" />
            <div className="relative rotate-[-1.5deg] rounded-3xl border border-line bg-surface p-5 shadow-[0_40px_80px_-40px_rgba(32,0,82,0.45)]">
              <div className="relative h-36 overflow-hidden rounded-2xl">
                <Image src={machineSrc("vending-street")} alt="" fill sizes="420px" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#200052]/60 to-transparent" />
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-surface/95 px-2.5 py-1 text-[11px] font-medium text-ink">
                  <DataIcon width={13} height={13} />
                  Dataset
                </span>
              </div>
              <div className="mt-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold tracking-[-0.01em] text-ink">Vending sales · Lagos</p>
                  <p className="mt-0.5 text-sm text-muted">30 days · 4,812 rows · 6 machines</p>
                </div>
                <p className="flex-none font-mono text-sm font-medium text-ink">12 MON</p>
              </div>
              <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-success-soft px-3 py-2.5 text-xs text-success">
                <CheckIcon width={14} height={14} strokeWidth={2.25} />
                Every row matches a signed attestation
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
