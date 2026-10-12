"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import Link from "next/link";

import { CopyCommand } from "@/components/home/copy-command";
import { EASE_OUT } from "@/components/home/reveal";
import { ArrowRight } from "@/components/icons";
import { links } from "@/lib/links";

const INSTALL = "curl -fsSL https://raw.githubusercontent.com/kineticVM-labs/kinetic-vm/main/install.sh | sh";

const container: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
};

export function HeroCopy() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="relative z-10 w-full min-w-0 max-w-xl"
      variants={container}
      initial={reduce ? false : "hidden"}
      animate="shown"
    >
      <motion.p
        variants={item}
        className="inline-flex items-center gap-2 rounded-full border border-lilac-strong bg-surface/80 py-1.5 pl-2.5 pr-3.5 text-[13px] text-fg shadow-[0_1px_2px_rgba(32,0,82,0.05)]"
      >
        <span className="live-dot size-2 rounded-full bg-purple" aria-hidden="true" />
        Live on Monad testnet
        <span className="text-line" aria-hidden="true">
          |
        </span>
        <span className="font-mono text-xs text-purple-deep">ERC-8004</span>
      </motion.p>

      <motion.h1
        variants={item}
        className="mt-7 text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-6xl xl:text-7xl"
      >
        The physical world is AI&apos;s next{" "}
        <span className="font-serif text-[1.08em] font-normal italic tracking-[-0.01em] text-purple">dataset.</span>
      </motion.h1>

      <motion.p variants={item} className="mt-6 max-w-lg text-lg leading-8 text-fg sm:text-xl sm:leading-9">
        KineticVM gives every robot, drone and sensor an onchain identity and signs everything it does on Monad. Owners
        get a machine history that buyers can verify, and a new way to earn from it.
      </motion.p>

      <motion.div variants={item} className="mt-9 flex flex-wrap items-center gap-3">
        <Link href="/marketplace" className="btn btn-primary btn-lg group">
          Explore marketplace
          <ArrowRight width={18} height={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
        <a href={links.docs} className="btn btn-secondary btn-lg">
          Read docs
        </a>
      </motion.div>

      <motion.div variants={item} className="mt-10 max-w-md">
        <p className="mb-2.5 text-xs font-medium uppercase tracking-[0.16em] text-muted">Install on Linux, Raspberry Pi or macOS</p>
        <CopyCommand command={INSTALL} display="curl -fsSL …/kinetic-vm/main/install.sh | sh" />
      </motion.div>
    </motion.div>
  );
}
