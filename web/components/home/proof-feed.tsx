"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

import { EASE_OUT, Reveal } from "@/components/home/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { machineSrc } from "@/lib/machines";

type Event = { slug: string; name: string; action: string; detail: string; agent: number; hash: string };

const SAMPLE: readonly Event[] = [
  { slug: "vending-cola", name: "vending-01", action: "vend", detail: "slot B4 · 1.5 MON", agent: 142, hash: "0x7c1e…09ab" },
  { slug: "arm-industrial", name: "cell-arm-3", action: "gpio_write", detail: "gripper → closed", agent: 92, hash: "0x2f90…a1c3" },
  { slug: "drone-crop", name: "agri-drone-7", action: "spray", detail: "row 14 · 2.1 L", agent: 267, hash: "0x9ab4…77e2" },
  { slug: "ev-charger", name: "charger-ng-2", action: "session", detail: "18.4 kWh delivered", agent: 330, hash: "0x51d2…c04f" },
  { slug: "courier-street", name: "courier-12", action: "deliver", detail: "parcel 8812 dropped", agent: 56, hash: "0xe03a…6b19" },
  { slug: "parcel-locker", name: "locker-lekki", action: "unlock", detail: "door 6 · code ok", agent: 61, hash: "0x4c8f…d2a0" },
  { slug: "printer-farm", name: "print-farm-1", action: "job_done", detail: "bracket v2 · 42 min", agent: 73, hash: "0xb71c…3e58" },
  { slug: "coffee-machine", name: "espresso-04", action: "brew", detail: "double · 0.4 MON", agent: 176, hash: "0x08fe…91c7" },
];

const VISIBLE = 5;
const TICK_MS = 2600;

export function ProofFeed() {
  const reduce = useReducedMotion();
  const [head, setHead] = useState(VISIBLE);

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => setHead((value) => value + 1), TICK_MS);
    return () => window.clearInterval(timer);
  }, [reduce]);

  const rows = Array.from({ length: VISIBLE }, (_, offset) => {
    const sequence = head - offset;
    return { sequence, event: SAMPLE[sequence % SAMPLE.length], age: offset * 3 };
  });

  return (
    <section id="proof" className="relative scroll-mt-24 overflow-hidden bg-night py-28 text-white sm:py-36">
      <div className="pointer-events-none absolute -left-40 top-0 size-[36rem] rounded-full bg-purple/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 size-[28rem] rounded-full bg-[#a0055d]/20 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_75%)]" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2 lg:gap-20">
        <div>
          <SectionHeading
            tone="dark"
            eyebrow="Onchain proof"
            title={
              <>
                Every action,{" "}
                <span className="font-serif text-[1.1em] font-normal italic tracking-normal text-[#b9abff]">on the record.</span>
              </>
            }
            body="Each record is signed by the machine's own key and written to Monad under its ERC-8004 identity. A buyer can hash any row and match it to the chain, without trusting the owner to have kept the history intact, or not invented it."
          />
          <Reveal delay={0.1} className="mt-10 flex flex-wrap gap-x-10 gap-y-6">
            <Stat value="EIP-712" label="typed, signed proofs" />
            <Stat value="ERC-8004" label="identity and validation" />
            <Stat value="keccak256" label="row-level data hashes" />
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-2 shadow-[0_40px_120px_-40px_rgba(131,110,249,0.5)] backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="flex items-center gap-2.5 text-sm font-medium">
                <span className="live-dot size-2 rounded-full bg-[#4ade80]" aria-hidden="true" />
                Attestation feed
              </p>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40">Preview · sample data</p>
            </div>
            <ul className="space-y-1.5" aria-live="off">
              <AnimatePresence initial={false}>
                {rows.map(({ sequence, event, age }) => (
                  <motion.li
                    key={sequence}
                    layout={!reduce}
                    initial={{ opacity: 0, y: -14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                    className={`flex items-center gap-3.5 rounded-2xl px-3 py-3 sm:px-4 ${
                      age === 0 ? "bg-white/[0.09] ring-1 ring-white/15" : "bg-white/[0.03]"
                    }`}
                  >
                    <div className="relative size-10 flex-none overflow-hidden rounded-xl">
                      <Image src={machineSrc(event.slug)} alt="" fill sizes="40px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{event.name}</span>
                        <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-[#c4b8ff]">
                          {event.action}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-white/50">
                        {event.detail} · agent #{event.agent}
                      </p>
                    </div>
                    <div className="hidden flex-none text-right sm:block">
                      <p className="font-mono text-xs text-white/80">{event.hash}</p>
                      <p className="mt-0.5 text-[11px] text-white/40">{age === 0 ? "just now" : `${age}s ago`}</p>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-mono text-lg text-white">{value}</p>
      <p className="mt-1 text-sm text-white/55">{label}</p>
    </div>
  );
}
