"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

import { ActScene, AttestScene, DatasetScene, RevenueScene } from "@/components/home/flow-scenes";
import { EASE_OUT } from "@/components/home/reveal";
import { ArrowRight } from "@/components/icons";

const REVEAL_MS = 750;
const CYCLE_MS = 3600;

const STAGES: { title: string; body: string; scene: (animate: boolean) => ReactNode }[] = [
  {
    title: "Machines act",
    body: "Robots, drones and sensors do real work in the physical world.",
    scene: (animate) => <ActScene animate={animate} />,
  },
  {
    title: "Actions become attestations",
    body: "The device key signs each action and it is recorded on Monad.",
    scene: () => <AttestScene />,
  },
  {
    title: "Attestations become datasets",
    body: "One persistent identity builds a history with provenance.",
    scene: () => <DatasetScene />,
  },
  {
    title: "Datasets become revenue",
    body: "Owners sell it. Buyers verify every row before they pay.",
    scene: () => <RevenueScene />,
  },
];

export function FlowStory() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduce = Boolean(useReducedMotion());
  const [shown, setShown] = useState(0);
  const [cycle, setCycle] = useState(STAGES.length - 1);

  useEffect(() => {
    if (!inView || reduce) return;
    const timers = STAGES.map((_, index) => window.setTimeout(() => setShown(index + 1), index * REVEAL_MS));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [inView, reduce]);

  const visible = reduce ? STAGES.length : shown;
  const revealing = visible < STAGES.length;

  useEffect(() => {
    if (revealing || reduce) return;
    const timer = window.setInterval(() => setCycle((value) => (value + 1) % STAGES.length), CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [revealing, reduce]);

  const current = reduce ? -1 : revealing ? visible - 1 : cycle;

  return (
    <div ref={ref} className="mt-16 flex flex-col lg:flex-row lg:items-stretch">
      {STAGES.map((stage, index) => (
        <Fragment key={stage.title}>
          {index > 0 ? <Connector lit={visible > index} flowing={!reduce && current === index - 1} /> : null}
          <div className="relative min-w-0 flex-1">
            <div
              className={`pointer-events-none absolute inset-0 rounded-3xl border border-dashed border-lilac-strong transition-opacity duration-500 ${
                visible > index ? "opacity-0" : "opacity-100"
              }`}
              aria-hidden="true"
            />
            <motion.article
              initial={reduce ? false : { opacity: 0, y: 14, scale: 0.98 }}
              animate={visible > index ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
              className={`relative h-full overflow-hidden rounded-3xl border bg-surface transition-[border-color,box-shadow] duration-500 ${
                current === index
                  ? "border-lilac-strong shadow-[0_24px_60px_-28px_rgba(110,85,243,0.55)] ring-4 ring-purple/10"
                  : "border-line"
              }`}
            >
              <div className="dot-grid relative flex h-48 items-center justify-center overflow-hidden border-b border-line bg-lilac/60 px-4">
                {stage.scene(!reduce)}
              </div>
              <div className="p-6">
                <span
                  className={`font-mono text-xs transition-colors duration-500 ${current === index ? "text-purple-deep" : "text-muted"}`}
                >
                  0{index + 1}
                </span>
                <h3 className="mt-3 text-lg font-semibold leading-snug tracking-[-0.02em] text-ink">{stage.title}</h3>
                <p className="mt-2 text-[15px] leading-6 text-muted">{stage.body}</p>
              </div>
            </motion.article>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function Connector({ lit, flowing }: { lit: boolean; flowing: boolean }) {
  return (
    <div className="relative flex h-12 flex-none items-center justify-center lg:h-auto lg:w-12 lg:items-start" aria-hidden="true">
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line lg:inset-x-0 lg:left-0 lg:top-24 lg:h-px lg:w-auto lg:translate-x-0" />
      <motion.div
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 origin-top bg-gradient-to-b from-purple to-purple-deep lg:inset-x-0 lg:left-0 lg:top-24 lg:h-px lg:w-auto lg:translate-x-0 lg:origin-left lg:bg-gradient-to-r"
        initial={false}
        animate={{ opacity: lit ? 1 : 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      />
      {flowing ? <span className="flow-packet absolute size-2 rounded-full bg-purple shadow-[0_0_12px_2px_rgba(131,110,249,0.7)]" /> : null}
      <span
        className={`relative grid size-7 place-items-center rounded-full border bg-surface transition-colors duration-500 lg:mt-[5.125rem] ${
          lit ? "border-lilac-strong text-purple-deep" : "border-line text-muted"
        }`}
      >
        <ArrowRight width={13} height={13} className="rotate-90 lg:rotate-0" />
      </span>
    </div>
  );
}
