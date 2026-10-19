"use client";

import { useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useChainId, useConnection, useSendTransaction, useSignMessage, useSwitchChain } from "wagmi";

import { CheckIcon, CopyIcon } from "@/components/icons";
import { ConnectWallet } from "@/components/marketplace/connect-wallet";
import type { ListingAccess } from "@/lib/marketplace/catalog";
import { formatMon, formatRows } from "@/lib/marketplace/format";
import { MARKET_CHAIN_ID } from "@/lib/monad";

export type CheckRow = {
  index: number;
  paramsHash: string;
  requestHash: string;
};

export function BuyPanel({
  slug,
  priceWei,
  payout,
  rowCount,
  signedIn,
  sample,
  checks,
  access,
}: {
  slug: string;
  priceWei: string;
  payout: `0x${string}`;
  rowCount: number;
  signedIn: boolean;
  sample: boolean;
  checks: CheckRow[];
  access: ListingAccess | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const connection = useConnection();
  const chainId = useChainId();
  const { sendTransactionAsync, isPending } = useSendTransaction();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const [error, setError] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<ListingAccess | null>(access);
  const [copied, setCopied] = useState<"data" | "manifest" | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<CheckRow[]>(checks);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<"idle" | "loading" | "playing" | "verified" | "ready" | "failed">("idle");
  const [pendingHash, setPendingHash] = useState<`0x${string}` | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const connected = connection.status === "connected" ? connection.address : undefined;
  const onChain = chainId === MARKET_CHAIN_ID;
  const working = busy || isPending || switching;
  const succeeded = phase === "verified" || phase === "ready";
  const checking = phase === "loading" || phase === "playing";
  const revealed = phase === "playing" ? rows.slice(0, Math.min(rows.length, shown + 1)) : rows;
  const matched = sample
    ? rows.length === 0
      ? 0
      : Math.min(rowCount, Math.round((revealed.length / rows.length) * rowCount))
    : succeeded
      ? rowCount
      : revealed.length;

  useEffect(() => {
    if (phase !== "playing" || reduce) return;
    const timer = window.setTimeout(() => {
      if (shown + 1 >= rows.length) setPhase("verified");
      else setShown((value) => value + 1);
    }, 420);
    return () => window.clearTimeout(timer);
  }, [phase, shown, rows.length, reduce]);

  useEffect(() => {
    if (phase !== "verified") return;
    const timer = window.setTimeout(() => setPhase("ready"), 3000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [revealed.length, phase]);

  async function verify() {
    if (phase === "loading" || phase === "playing") return;
    setError(null);
    setShown(0);
    if (sample) {
      setRows(checks);
      if (checks.length === 0) {
        setPhase("failed");
        setError("Those rows did not verify.");
        return;
      }
      if (reduce) {
        setShown(checks.length);
        setPhase("verified");
        return;
      }
      setPhase("playing");
      return;
    }
    setRows([]);
    setPhase("loading");
    try {
      const response = await fetch(`/api/marketplace/listings/${slug}/verify`, { method: "POST" });
      const type = response.headers.get("content-type") ?? "";
      if (type.includes("application/json")) {
        const payload = (await response.json()) as { error?: string; rows?: CheckRow[] };
        if (!response.ok || !payload.rows || payload.rows.length === 0) {
          throw new Error(payload.error ?? "Those rows did not verify.");
        }
        setRows(payload.rows);
        setShown(0);
        setPhase("playing");
        return;
      }
      if (!response.ok || !response.body) throw new Error("Those rows did not verify.");
      const failure = await readChecks(response.body, (row) => {
        setRows((current) => [...current, row]);
      });
      if (failure) {
        setPhase("failed");
        setError(failure);
        return;
      }
      setPhase("verified");
    } catch (cause) {
      setPhase("failed");
      setError(cause instanceof Error ? cause.message : "Those rows did not verify.");
    }
  }

  async function pay() {
    if (sample) {
      setError("This preview dataset is not for sale.");
      return;
    }
    if (!signedIn || !connected) return;
    setError(null);
    setBusy(true);
    try {
      if (!onChain) await switchChainAsync({ chainId: MARKET_CHAIN_ID });
      const hash =
        pendingHash ??
        (await sendTransactionAsync({
          to: payout,
          value: BigInt(priceWei),
          chainId: MARKET_CHAIN_ID,
        }));
      setPendingHash(hash);
      const signature = await signMessageAsync({ message: unlockMessage(slug, hash) });
      const response = await fetch(`/api/marketplace/listings/${slug}/purchase`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ txHash: hash, signature }),
      });
      const payload = (await response.json()) as { error?: string; access?: ListingAccess };
      if (!response.ok || !payload.access) {
        setError(payload.error ?? "The payment could not be confirmed.");
        return;
      }
      setPendingHash(null);
      setUnlocked(payload.access);
      router.refresh();
    } catch (cause) {
      setError(explain(cause));
    } finally {
      setBusy(false);
    }
  }

  async function copy(value: string, which: "data" | "manifest") {
    await navigator.clipboard.writeText(value);
    setCopied(which);
    window.setTimeout(() => setCopied(null), 1600);
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      {unlocked ? (
        <div className="space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium text-success">
            <CheckIcon width={16} height={16} />
            File unlocked
          </p>
          <CidRow label="Data CID" value={unlocked.dataCid} copied={copied === "data"} onCopy={() => void copy(unlocked.dataCid, "data")} />
          <CidRow
            label="Manifest CID"
            value={unlocked.manifestCid}
            copied={copied === "manifest"}
            onCopy={() => void copy(unlocked.manifestCid, "manifest")}
          />
          <a className="btn btn-primary w-full" href={`/api/marketplace/listings/${slug}/file?part=data`}>
            Download data
          </a>
          <a className="btn btn-secondary w-full" href={`/api/marketplace/listings/${slug}/file?part=manifest`}>
            Download manifest
          </a>
        </div>
      ) : (
        <div>
          <p className="text-sm leading-6 text-muted">The file stays sealed until the rows check out and Monad confirms payment.</p>
          {phase === "failed" ? (
            <div className="mt-4">
              <p className="text-sm font-medium text-danger">Did not verify</p>
              <button type="button" className="btn btn-primary mt-3 w-full" onClick={() => void verify()}>
                Try again
              </button>
            </div>
          ) : phase === "verified" ? (
            <button type="button" className="btn btn-success mt-4 w-full" disabled>
              <CheckIcon width={16} height={16} />
              Verified
            </button>
          ) : phase === "ready" ? null : (
            <button
              type="button"
              className="btn btn-primary mt-4 w-full disabled:cursor-wait disabled:opacity-100"
              disabled={checking}
              aria-busy={checking}
              onClick={() => void verify()}
            >
              {checking ? <Spinner /> : null}
              {phase === "loading" ? "Checking on Monad" : phase === "playing" ? "Checking rows" : "Verify data"}
            </button>
          )}
          {sample ? null : (
            <p className="mt-3 text-xs leading-5 text-muted">
              click{" "}
              <a
                href={`/api/marketplace/listings/${slug}/file?part=manifest`}
                className="font-medium text-ink underline decoration-lilac-strong underline-offset-4 hover:text-purple-deep"
              >
                here
              </a>{" "}
              to download the manifest for manual verification
            </p>
          )}
          {checking || phase === "failed" || succeeded ? (
            <div className="mt-4">
              <p className={`font-mono text-xs ${succeeded ? "text-success" : "text-muted"}`} aria-live="polite">
                {formatRows(matched)} / {formatRows(rowCount)} match
                {phase === "loading" ? ` · checking row ${revealed.length + 1}` : ""}
              </p>
              {revealed.length > 0 || phase === "loading" ? (
                <ul ref={listRef} aria-label="Checked rows" className="mt-3 max-h-52 space-y-2 overflow-y-auto">
                  {revealed.map((row) => (
                    <li key={row.index} className="flex items-center gap-2 text-sm text-ink">
                      <CheckIcon width={16} height={16} className="shrink-0 text-success" />
                      <span className="font-mono text-xs">
                        Row {row.index} · {shortHash(row.paramsHash)}
                      </span>
                    </li>
                  ))}
                  {phase === "loading" ? (
                    <li className="flex items-center gap-2 text-sm text-muted">
                      <Spinner />
                      <span className="font-mono text-xs">Row {revealed.length + 1}</span>
                    </li>
                  ) : null}
                </ul>
              ) : null}
              {sample && succeeded ? <p className="mt-3 text-sm leading-6 text-muted">Preview data, so these checks are the layout, not live attestations.</p> : null}
            </div>
          ) : null}
          {phase === "ready" ? (
            !signedIn ? (
              <Link href={`/marketplace/login?next=/marketplace/${slug}`} className="btn btn-primary mt-4 w-full">
                Pay {formatMon(priceWei)} MON
              </Link>
            ) : sample ? (
              <button type="button" className="btn btn-primary mt-4 w-full" onClick={() => void pay()}>
                Pay {formatMon(priceWei)} MON
              </button>
            ) : !connected ? (
              <div className="mt-4">
                <p className="mb-3 text-sm leading-6 text-muted">Connect a wallet to send {formatMon(priceWei)} MON to the seller.</p>
                <ConnectWallet />
              </div>
            ) : (
              <button type="button" className="btn btn-primary mt-4 w-full" disabled={working} aria-busy={working} onClick={() => void pay()}>
                {working ? "Confirming payment" : pendingHash ? "Sign to unlock" : `Pay ${formatMon(priceWei)} MON`}
              </button>
            )
          ) : null}
        </div>
      )}
      {error ? (
        <p className="mt-4 text-sm leading-6 text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CidRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink">{value}</code>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-full text-muted hover:bg-lilac hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple"
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
          onClick={onCopy}
        >
          {copied ? <CheckIcon width={16} height={16} /> : <CopyIcon width={16} height={16} />}
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" className="animate-spin motion-reduce:animate-none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2.5" />
      <path d="M20 12a8 8 0 0 0-8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

async function readChecks(body: ReadableStream<Uint8Array>, onRow: (row: CheckRow) => void): Promise<string | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let seen = 0;
  let failure: string | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const data = chunk
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join("");
      if (!data) continue;
      const event = JSON.parse(data) as { type?: string; error?: string; index?: number; paramsHash?: string; requestHash?: string };
      if (event.type === "row" && event.index && event.paramsHash && event.requestHash) {
        seen += 1;
        onRow({ index: event.index, paramsHash: event.paramsHash, requestHash: event.requestHash });
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      } else if (event.type === "error") {
        failure = event.error ?? "Those rows did not verify.";
      }
    }
  }
  if (failure) return failure;
  return seen === 0 ? "Those rows did not verify." : null;
}

function shortHash(value: string): string {
  return value.length < 14 ? value : `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function unlockMessage(slug: string, txHash: string): string {
  return ["KineticVM marketplace", "Unlock", `listing: ${slug}`, `tx: ${txHash}`].join("\n");
}

function explain(cause: unknown): string {
  const message =
    cause && typeof cause === "object" && "shortMessage" in cause
      ? String((cause as { shortMessage: unknown }).shortMessage)
      : cause instanceof Error
        ? cause.message
        : "The wallet rejected the request.";
  if (/rejected|denied/i.test(message)) return "The wallet closed the request.";
  return message.slice(0, 220);
}
