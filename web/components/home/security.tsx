import type { ReactNode } from "react";

import { Reveal } from "@/components/home/reveal";
import { Accent, SectionHeading } from "@/components/home/section-heading";
import { ChipIcon, GaugeIcon, KeyIcon, RevokeIcon } from "@/components/icons";

const PRINCIPLES: { icon: ReactNode; title: string; body: string }[] = [
  {
    icon: <ChipIcon />,
    title: "Keys stay on the device",
    body: "The signing key lives behind one interface, as a software key or in an NXP SE050 secure element. It is never logged or exported.",
  },
  {
    icon: <KeyIcon />,
    title: "A machine never owns itself",
    body: "The device key never gets operator rights over its own identity NFT. The identity sits in the owner's wallet.",
  },
  {
    icon: <GaugeIcon />,
    title: "Every payment hits the vault",
    body: "Per-transaction and daily caps, a recipient allowlist and a pause switch. There is no path around them.",
  },
  {
    icon: <RevokeIcon />,
    title: "The owner can always pull the plug",
    body: "Revoke or rotate the device key onchain at any time. If the device's local cache disagrees with the chain, the chain wins.",
  },
];

export function Security() {
  return (
    <section id="security" className="scroll-mt-24 border-t border-line bg-surface py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          align="center"
          eyebrow="Security by design"
          title={
            <>
              Autonomous, <Accent>never unaccountable.</Accent>
            </>
          }
          body="Machines get exactly as much freedom as their owner grants, and the chain enforces it."
        />
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((item, index) => (
            <Reveal key={item.title} delay={0.06 * index} className="rounded-3xl border border-line bg-paper p-7">
              <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-b from-[#8c79fa] to-[#6d55f3] text-white shadow-[0_10px_20px_-10px_rgba(110,85,243,0.8)]">
                {item.icon}
              </span>
              <h3 className="mt-6 text-lg font-semibold leading-snug tracking-[-0.015em] text-ink">{item.title}</h3>
              <p className="mt-2.5 text-[15px] leading-7 text-fg">{item.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
