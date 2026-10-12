import Image from "next/image";
import type { ReactNode } from "react";

import { Reveal } from "@/components/home/reveal";
import { Accent, SectionHeading } from "@/components/home/section-heading";
import { CheckIcon, IdentityIcon, ProofIcon, VaultIcon } from "@/components/icons";
import { machineSrc } from "@/lib/machines";

export function Pillars() {
  return (
    <section id="product" className="scroll-mt-24 bg-surface py-28 sm:py-36">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="The solution"
          title={
            <>
              Turn a device into an <Accent>accountable</Accent> economic actor.
            </>
          }
          body="KineticVM gives every physical AI three things. Together they let it act, transact and build a history anyone can check."
        />
        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          <Pillar
            index={0}
            icon={<IdentityIcon />}
            title="One persistent identity"
            body="Each machine is an ERC-8004 agent on Monad, owned by whoever holds the NFT. Its history follows that identity for life."
          >
            <IdentityVisual />
          </Pillar>
          <Pillar
            index={1}
            icon={<ProofIcon />}
            title="Signed proof of every action"
            body="The runtime connects AI models to real hardware. When the machine acts, its device-bound key signs the record and it lands on Monad as an attestation."
          >
            <ProofVisual />
          </Pillar>
          <Pillar
            index={2}
            icon={<VaultIcon />}
            title="A wallet it can't overspend"
            body="The machine pays for what it needs from a vault with per-transaction and daily caps. The owner can tighten, pause or withdraw at any time."
          >
            <VaultVisual />
          </Pillar>
        </div>
      </div>
    </section>
  );
}

function Pillar({
  index,
  icon,
  title,
  body,
  children,
}: {
  index: number;
  icon: ReactNode;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <Reveal delay={0.08 * index} className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-paper">
      <div className="dot-grid relative flex h-72 items-center justify-center overflow-hidden border-b border-line bg-lilac/60 px-6">
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-lilac/80 to-transparent" />
        <div className="relative w-full max-w-[19rem] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1">
          {children}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-7 sm:p-8">
        <span className="grid size-10 place-items-center rounded-xl bg-surface text-purple-deep shadow-[0_1px_2px_rgba(32,0,82,0.08)] ring-1 ring-line">
          {icon}
        </span>
        <h3 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-ink">{title}</h3>
        <p className="mt-3 text-[15px] leading-7 text-fg">{body}</p>
      </div>
    </Reveal>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-[0_18px_40px_-18px_rgba(32,0,82,0.28)]">{children}</div>
  );
}

function IdentityVisual() {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="relative size-11 flex-none overflow-hidden rounded-xl">
          <Image src={machineSrc("vending-cola")} alt="" fill sizes="44px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">vending-01</p>
          <p className="font-mono text-[11px] text-muted">Agent #142 · ERC-8004</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2 py-1 text-[11px] font-medium text-success">
          <span className="size-1.5 rounded-full bg-success-soft0" />
          Active
        </span>
      </div>
      <dl className="mt-4 divide-y divide-line rounded-xl border border-line text-xs">
        <Row label="Owner" value="0x9f2c…41d7" />
        <Row label="Device key" value="0x3a71…c8e0" />
        <Row label="Network" value="Monad" plain />
      </dl>
    </Card>
  );
}

function VaultVisual() {
  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-muted">Spent today</p>
        <p className="font-mono text-[11px] text-muted">cap 25 MON</p>
      </div>
      <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-ink">
        9.4 <span className="text-sm font-medium text-muted">MON</span>
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-lilac">
        <div className="h-full w-[38%] rounded-full bg-gradient-to-r from-purple to-purple-deep" />
      </div>
      <ul className="mt-4 space-y-2 text-xs">
        <Payment to="Supplier 0x51b0…" amount="1.20" />
        <Payment to="Charger 0xc7e2…" amount="0.80" />
      </ul>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-lilac/70 px-3 py-2 text-xs">
        <span className="text-fg">Per transaction</span>
        <span className="font-mono font-medium text-ink">≤ 2 MON</span>
      </div>
    </Card>
  );
}

function ProofVisual() {
  const rows = [
    { action: "vend", detail: "slot B4", hash: "0x7c1e…09ab", fresh: true },
    { action: "gpio_write", detail: "pin 17 → high", hash: "0x2f90…a1c3", fresh: false },
    { action: "soil_read", detail: "41% moisture", hash: "0x9ab4…77e2", fresh: false },
  ];
  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div
          key={row.hash}
          className={`flex items-center gap-3 rounded-xl border bg-surface px-3 py-2.5 shadow-[0_10px_24px_-16px_rgba(32,0,82,0.3)] ${
            row.fresh ? "border-lilac-strong ring-4 ring-purple/10" : "border-line opacity-80"
          }`}
        >
          <span
            className={`grid size-7 flex-none place-items-center rounded-lg ${
              row.fresh ? "bg-purple text-white" : "bg-lilac text-purple-deep"
            }`}
          >
            <CheckIcon width={14} height={14} strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs font-medium text-ink">{row.action}</p>
            <p className="truncate text-[11px] text-muted">{row.detail}</p>
          </div>
          <span className="font-mono text-[11px] text-purple-deep">{row.hash}</span>
        </div>
      ))}
    </div>
  );
}

function Row({ label, value, plain }: { label: string; value: string; plain?: boolean }) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <dt className="text-muted">{label}</dt>
      <dd className={plain ? "font-medium text-ink" : "font-mono text-ink"}>{value}</dd>
    </div>
  );
}

function Payment({ to, amount }: { to: string; amount: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-fg">{to}</span>
      <span className="font-mono text-ink">−{amount}</span>
    </li>
  );
}
