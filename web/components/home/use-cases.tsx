import Image from "next/image";

import { Reveal } from "@/components/home/reveal";
import { Accent, SectionHeading } from "@/components/home/section-heading";
import { machineSrc } from "@/lib/machines";

const CASES = [
  {
    slug: "vending-street",
    title: "Vending and retail",
    body: "Every sale is a signed record: demand by location, hour and product.",
  },
  {
    slug: "arm-industrial",
    title: "Robot arms",
    body: "Picks, places and welds become training data with a provable source.",
  },
  {
    slug: "drone-survey",
    title: "Drones",
    body: "Flight and survey logs that insurers and regulators can check.",
  },
  {
    slug: "drone-crop",
    title: "Agriculture",
    body: "Soil readings and spray runs with provenance crop buyers can trust.",
  },
  {
    slug: "courier-street",
    title: "Delivery robots",
    body: "Pays for its own charging inside its owner's limits, and logs every drop.",
  },
  {
    slug: "ev-charger",
    title: "EV charging",
    body: "Metered sessions that settle payment and prove the energy delivered.",
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="scroll-mt-24 bg-surface py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading
            eyebrow="Use cases"
            title={
              <>
                Every machine is a <Accent>data source.</Accent>
              </>
            }
          />
          <Reveal className="max-w-sm text-[15px] leading-7 text-fg lg:pb-2">
            If it moves, senses or sells, its work can become verifiable data. GPIO, serial and MQTT come built in, and
            anything else becomes a plugin.
          </Reveal>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CASES.map((item, index) => (
            <Reveal key={item.slug} delay={0.05 * (index % 3)}>
              <article className="group relative aspect-[4/5] overflow-hidden rounded-3xl bg-lilac">
                <Image
                  src={machineSrc(item.slug)}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#200052]/85 via-[#200052]/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7">
                  <h3 className="text-xl font-semibold tracking-[-0.02em] text-white">{item.title}</h3>
                  <p className="mt-2 text-[15px] leading-6 text-white/75">{item.body}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
