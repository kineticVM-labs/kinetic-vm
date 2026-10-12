"use client";

import { useEffect, useState } from "react";

import { CheckIcon, CopyIcon } from "@/components/icons";

export function CopyCommand({ command, display }: { command: string; display: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="group inline-flex max-w-full items-center gap-3 rounded-xl border border-line bg-surface/80 py-2 pl-3.5 pr-2 text-left font-mono text-[13px] text-fg shadow-[0_1px_2px_rgba(32,0,82,0.05)] transition-colors duration-150 hover:border-lilac-strong"
      aria-label={copied ? "Install command copied" : "Copy the install command"}
    >
      <span className="text-purple" aria-hidden="true">
        $
      </span>
      <span className="truncate">{display}</span>
      <span
        className={`grid size-7 flex-none place-items-center rounded-lg transition-colors duration-150 ${
          copied ? "bg-success-soft text-success" : "bg-lilac text-purple-deep group-hover:bg-lilac-strong"
        }`}
        aria-hidden="true"
      >
        {copied ? <CheckIcon width={15} height={15} /> : <CopyIcon width={15} height={15} />}
      </span>
    </button>
  );
}
