import type { CSSProperties } from "react";

import { CheckIcon, KeyIcon } from "@/components/icons";

const CYCLE = "3.6s";
const SPLINES = "0.45 0 0.2 1;0.45 0 0.2 1;0.45 0 0.2 1;0.45 0 0.2 1";

function delay(seconds: number): CSSProperties {
  return { "--d": `${seconds}s` } as CSSProperties;
}

/** A two-joint arm carries a box from one pedestal to the other. */
export function ActScene({ animate }: { animate: boolean }) {
  const swing = (from: number, to: number, cx: number, cy: number) =>
    animate ? (
      <animateTransform
        attributeName="transform"
        type="rotate"
        values={`${from} ${cx} ${cy};${from} ${cx} ${cy};${to} ${cx} ${cy};${to} ${cx} ${cy};${from} ${cx} ${cy}`}
        keyTimes="0;0.15;0.5;0.7;1"
        calcMode="spline"
        keySplines={SPLINES}
        dur={CYCLE}
        repeatCount="indefinite"
      />
    ) : null;

  return (
    <svg viewBox="0 0 140 128" className="h-40 w-auto overflow-visible" aria-hidden="true">
      <line x1="0" y1="120" x2="140" y2="120" className="stroke-line" strokeWidth="1.5" />
      <rect x="10" y="109" width="24" height="11" rx="2" className="fill-lilac-strong" />
      <rect x="86" y="109" width="24" height="11" rx="2" className="fill-lilac-strong" />
      <rect x="47" y="106" width="26" height="14" rx="3" className="fill-night dark:fill-lilac-strong" />

      <g transform={animate ? undefined : "rotate(30 60 100)"}>
        {swing(-30, 30, 60, 100)}
        <rect x="55" y="58" width="10" height="44" rx="5" className="fill-purple" />
        <g transform={animate ? undefined : "rotate(120 60 60)"}>
          {swing(-120, 120, 60, 60)}
          <rect x="56" y="22" width="8" height="40" rx="4" className="fill-purple-deep" />
          <g transform={animate ? undefined : "rotate(-150 60 24)"}>
            {swing(150, -150, 60, 24)}
            <circle cx="60" cy="24" r="3" className="fill-night dark:fill-lilac-strong" />
            <path d="M54 25v6M66 25v6" className="stroke-ink" strokeWidth="2" strokeLinecap="round" />
            <rect x="54.5" y="29" width="11" height="10" rx="1.5" fill="#e9b872" />
            <path d="M54.5 33h11" stroke="#c99545" strokeWidth="1" />
          </g>
          <circle cx="60" cy="60" r="5" className="fill-surface stroke-purple" strokeWidth="2" />
        </g>
        <circle cx="60" cy="100" r="6.5" className="fill-surface stroke-purple" strokeWidth="2" />
      </g>

      {animate ? (
        <circle cx="98" cy="104" r="4" fill="none" className="stroke-purple" strokeWidth="1.5">
          <animate attributeName="r" values="4;4;4;18;18" keyTimes="0;0.5;0.52;0.7;1" dur={CYCLE} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0;0.9;0;0" keyTimes="0;0.5;0.52;0.7;1" dur={CYCLE} repeatCount="indefinite" />
        </circle>
      ) : null}

      <g opacity={animate ? 0 : 1}>
        {animate ? (
          <animate
            attributeName="opacity"
            values="0;0;1;1;0;0"
            keyTimes="0;0.5;0.56;0.74;0.82;1"
            dur={CYCLE}
            repeatCount="indefinite"
          />
        ) : null}
        <rect x="80" y="2" width="58" height="17" rx="8.5" className="fill-surface stroke-lilac-strong" />
        <text x="109" y="13.5" textAnchor="middle" className="fill-purple-deep font-mono" fontSize="8">
          pick_place
        </text>
      </g>
    </svg>
  );
}

/** The record gets signed, then a new block carrying it joins the chain. */
export function AttestScene() {
  return (
    <div className="w-[13.25rem] space-y-3">
      <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-3 shadow-[0_12px_28px_-16px_rgba(32,0,82,0.35)]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-medium text-ink">pick_place</span>
          <span className="text-[10px] text-muted">slot B4</span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-purple-deep">
          <KeyIcon width={12} height={12} />
          sig 0x7c1e…09ab
        </div>
        <div className="flow-loop flow-scan pointer-events-none absolute inset-x-0 top-0 h-7 bg-gradient-to-b from-transparent via-purple/25 to-transparent" />
        <span className="flow-loop flow-stamp absolute right-2.5 top-2.5 rounded-full bg-purple px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
          Signed
        </span>
      </div>
      <div className="overflow-hidden" style={{ "--step": "2.75rem" } as CSSProperties}>
        <div className="flow-loop flow-chain flex gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className={`grid size-9 flex-none place-items-center rounded-lg border ${
                index === 5 ? "border-purple bg-purple text-white" : "border-line bg-surface"
              }`}
            >
              {index === 5 ? (
                <CheckIcon width={14} height={14} strokeWidth={2.5} />
              ) : (
                <span className="h-1 w-4 rounded-full bg-line" />
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="flow-loop flow-stamp text-center text-[11px] font-medium text-purple-deep">Recorded on Monad</p>
    </div>
  );
}

const ROWS = [
  { record: '{"vend":"B4"}', hash: "0x7c1e" },
  { record: '{"pick":"A2"}', hash: "0x2f90" },
  { record: '{"soil":41}', hash: "0x9ab4" },
  { record: '{"vend":"C1"}', hash: "0x51d2" },
];

/** Signed rows stack up under one identity into a dataset. */
export function DatasetScene() {
  return (
    <div className="w-[13.25rem] rounded-xl border border-line bg-surface p-3 shadow-[0_12px_28px_-16px_rgba(32,0,82,0.35)]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-medium text-ink">vending-01.jsonl</span>
        <span className="text-[10px] text-muted">dataset</span>
      </div>
      <ul className="mt-2.5 space-y-1.5">
        {ROWS.map((row, index) => (
          <li
            key={row.hash}
            className="flow-loop flow-row flex items-center justify-between rounded-md bg-lilac px-2 py-1 font-mono text-[10px]"
            style={delay(index * 0.35)}
          >
            <span className="text-ink">{row.record}</span>
            <span className="flex items-center gap-1 text-purple-deep">
              <CheckIcon width={10} height={10} strokeWidth={2.5} />
              {row.hash}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2.5 flex justify-between text-[10px] text-muted">
        <span>1 identity</span>
        <span>4,812 rows</span>
      </div>
    </div>
  );
}

const CHECKS = ["Hash matches attestation", "Signed by the device key", "Identity #142 on Monad"];

/** A buyer verifies the rows, then the owner gets paid. */
export function RevenueScene() {
  return (
    <div className="relative w-[13.25rem]">
      <div className="rounded-xl border border-line bg-surface p-3 shadow-[0_12px_28px_-16px_rgba(32,0,82,0.35)]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-ink">Buyer · AI lab</span>
          <span className="text-[10px] text-muted">verifying</span>
        </div>
        <ul className="mt-2.5 space-y-2">
          {CHECKS.map((check, index) => (
            <li key={check} className="flow-loop flow-row flex items-center gap-2 text-[10.5px] text-fg" style={delay(index * 0.3)}>
              <span className="grid size-4 flex-none place-items-center rounded-full bg-success-soft text-success">
                <CheckIcon width={9} height={9} strokeWidth={3} />
              </span>
              {check}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-[10.5px]">
          <span className="text-muted">Paid to owner</span>
          <span className="font-mono font-medium text-ink">12 MON</span>
        </div>
      </div>
      <div className="flow-loop flow-pop absolute -bottom-4 right-2 rounded-full bg-purple px-2.5 py-1 font-mono text-xs font-semibold text-white shadow-[0_10px_24px_-8px_rgba(110,85,243,0.8)]">
        +12 MON
      </div>
    </div>
  );
}
