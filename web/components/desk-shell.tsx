"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { SmartLink } from "@/components/smart-link";
import { ThemeToggle } from "@/components/theme-toggle";

const RISE = { type: "spring" as const, stiffness: 320, damping: 30 };

/** Page frame for the wallet flows: claim, deposit and withdraw. */
export function DeskShell({
  home,
  wallet,
  tone,
  children,
}: {
  home: string;
  wallet: ReactNode;
  tone: "idle" | "done" | "failed";
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="dot-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-48 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-purple/15 blur-[120px]" />
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <SmartLink href={home} className="rounded-lg">
          <Logo />
        </SmartLink>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {wallet}
        </div>
      </header>
      <main className="relative flex justify-center px-5 pb-20 pt-8 sm:pt-16">
        <motion.section
          className={`w-full max-w-lg rounded-3xl border bg-surface px-6 py-8 shadow-[0_40px_80px_-40px_rgba(32,0,82,0.3)] sm:px-9 sm:py-10 ${
            tone === "done" ? "claim-done" : tone === "failed" ? "claim-failed" : "border-line"
          }`}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={RISE}
        >
          {children}
        </motion.section>
      </main>
    </div>
  );
}

export function DeskEyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs uppercase tracking-[0.18em] text-purple-deep">{children}</p>;
}
