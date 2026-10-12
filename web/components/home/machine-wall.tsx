import Image from "next/image";
import type { CSSProperties } from "react";

import { CheckIcon } from "@/components/icons";
import { machineSrc, machines, type Machine } from "@/lib/machines";

const COLUMNS = [
  { duration: 58, delay: -8 },
  { duration: 46, delay: -31 },
  { duration: 64, delay: -17 },
  { duration: 52, delay: -40 },
] as const;

const PING_PERIOD = 15;

/** Decorative wall of machines rising forever. Each column repeats its list twice for a seamless loop. */
export function MachineWall() {
  const columns = COLUMNS.map((_, index) => machines.filter((__, item) => item % COLUMNS.length === index));

  return (
    <div className="relative h-full" aria-hidden="true">
      <div className="wall absolute inset-0 overflow-hidden bg-lilac">
        <div className="dot-grid absolute inset-0 opacity-70" />
        <div className="absolute -right-24 top-1/4 size-[28rem] rounded-full bg-purple/25 blur-3xl" />
        <div className="wall-fade relative grid h-full grid-cols-3 gap-3 px-3 sm:grid-cols-4 sm:gap-4 sm:px-5 lg:pl-8 lg:pr-6">
          {columns.map((column, index) => (
            <div key={index} className={index === 3 ? "hidden sm:block" : undefined}>
              <div
                className="wall-track flex flex-col"
                style={
                  {
                    "--wall-duration": `${COLUMNS[index].duration}s`,
                    "--wall-delay": `${COLUMNS[index].delay}s`,
                  } as CSSProperties
                }
              >
                {[...column, ...column].map((machine, position) => (
                  <Tile
                    key={`${machine.slug}-${position}`}
                    machine={machine}
                    pingDelay={(index * 3.7 + position * 5.3) % PING_PERIOD}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <svg
        className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <line x1="20" y1="0" x2="0" y2="100" stroke="#836ef9" strokeOpacity="0.55" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function Tile({ machine, pingDelay }: { machine: Machine; pingDelay: number }) {
  return (
    <div className="pb-3 sm:pb-4">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-surface shadow-[0_12px_30px_-14px_rgba(32,0,82,0.35)] ring-1 ring-surface/80">
        <Image
          src={machineSrc(machine.slug)}
          alt=""
          fill
          sizes="(min-width: 1024px) 13vw, (min-width: 640px) 24vw, 32vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#200052]/45 via-transparent to-[#836ef9]/10" />
        <div className="absolute inset-x-2 bottom-2 hidden items-center justify-between gap-2 rounded-lg bg-surface/90 px-2 py-1.5 sm:flex">
          <span className="truncate text-[11px] font-medium text-ink">{machine.label}</span>
          <span className="flex-none font-mono text-[10px] text-muted">#{machine.agent}</span>
        </div>
        <div
          className="wall-ping absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-[10px] font-semibold text-purple-deep shadow-[0_6px_16px_-6px_rgba(91,63,230,0.6)]"
          style={{ "--ping-delay": `${pingDelay.toFixed(2)}s` } as CSSProperties}
        >
          <CheckIcon width={11} height={11} strokeWidth={2.5} />
          Attested
        </div>
      </div>
    </div>
  );
}
