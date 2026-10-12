"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useConnection, useSignMessage } from "wagmi";

import { CheckIcon, CopyIcon } from "@/components/icons";
import { DashboardEmpty, DashboardHeading } from "@/components/marketplace/dashboard-blocks";
import { ConnectWallet } from "@/components/marketplace/connect-wallet";
import { shortAddress } from "@/lib/marketplace/format";

const revokeClass =
  "inline-flex min-h-10 items-center rounded-full border border-danger-line bg-danger-soft px-3 text-sm font-medium text-danger hover:border-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple";

export type KeyItem = {
  id: string;
  agentId: string;
  wallet: string;
  prefix: string;
  created: string;
  lastUsed: string | null;
};

export function KeysPanel({ keys }: { keys: KeyItem[] }) {
  const router = useRouter();
  const connection = useConnection();
  const { signMessageAsync } = useSignMessage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [agentId, setAgentId] = useState("");
  const [lookup, setLookup] = useState<{ owner: string; device: string | null; wallet: string } | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const connected = connection.status === "connected" ? connection.address : undefined;
  const [trackedWallet, setTrackedWallet] = useState(connected);
  if (trackedWallet !== connected) {
    setTrackedWallet(connected);
    setLookup(null);
    if (!secret) setError(null);
  }
  const holds = Boolean(lookup && connected && lookup.wallet.toLowerCase() === connected.toLowerCase() && lookup.owner.toLowerCase() === connected.toLowerCase());

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function start() {
    setError(null);
    setOpen(true);
  }

  async function checkOwner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLookup(null);
    setSecret(null);
    const id = agentId.trim();
    if (!connected) {
      setError("Connect the wallet that holds the agent.");
      return;
    }
    if (!/^[0-9]+$/.test(id)) {
      setError("Enter the agent id.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/marketplace/agents/${id}`);
      const payload = (await response.json()) as { error?: string; owner?: string; device?: string | null };
      if (!response.ok || !payload.owner) throw new Error(payload.error ?? "That agent could not be read.");
      if (payload.owner.toLowerCase() !== connected.toLowerCase()) {
        setError(`This wallet does not hold agent ${id}. The NFT owner is ${shortAddress(payload.owner)}.`);
        return;
      }
      setLookup({ owner: payload.owner, device: payload.device ?? null, wallet: connected });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That agent could not be read.");
    } finally {
      setBusy(false);
    }
  }

  async function issue() {
    if (!connected || !holds) return;
    setError(null);
    setBusy(true);
    try {
      const challenge = await fetch("/api/marketplace/challenges", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "key", agentId: agentId.trim(), wallet: connected }),
      });
      const started = (await challenge.json()) as { error?: string; id?: string; message?: string };
      if (!challenge.ok || !started.id || !started.message) throw new Error(started.error ?? "The key request could not start.");
      const signature = await signMessageAsync({ message: started.message });
      const response = await fetch("/api/marketplace/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId: started.id, signature }),
      });
      const payload = (await response.json()) as { error?: string; key?: string };
      if (!response.ok || !payload.key) throw new Error(payload.error ?? "The key was not issued.");
      setSecret(payload.key);
      setCopied(false);
      router.refresh();
    } catch (cause) {
      const message =
        cause && typeof cause === "object" && "shortMessage" in cause
          ? String((cause as { shortMessage: unknown }).shortMessage)
          : cause instanceof Error
            ? cause.message
            : "The key was not issued.";
      setError(/rejected|denied/i.test(message) ? "The wallet closed the signature." : message.slice(0, 240));
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/marketplace/keys/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error ?? "The key could not be revoked.");
      setBusy(false);
      return;
    }
    setConfirming(null);
    router.refresh();
    setBusy(false);
  }

  return (
    <div>
      <DashboardHeading
        title="API keys"
        detail="One live key per agent. Connect the wallet that holds the NFT. That wallet signs once."
        action={
          keys.length > 0 ? (
            <button type="button" className="btn btn-primary" onClick={start}>
              Generate key
            </button>
          ) : null
        }
      />

      {keys.length === 0 ? (
        <DashboardEmpty
          title="You don't have any keys yet"
          detail="Connect the wallet that holds the agent, then enter its id. The device uses the key to list datasets."
          action={
            <button type="button" className="btn btn-primary" onClick={start}>
              Generate key
            </button>
          }
        />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th scope="col" className="px-5 py-3 font-medium">
                  Agent
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Wallet
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Key
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Created
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Last used
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-b border-line last:border-0">
                  <th scope="row" className="px-5 py-3 font-medium text-ink">
                    {key.agentId}
                  </th>
                  <td className="px-5 py-3 font-mono text-xs text-muted">{shortAddress(key.wallet)}</td>
                  <td className="px-5 py-3 font-mono text-xs text-ink">{key.prefix}…</td>
                  <td className="px-5 py-3 text-muted">{key.created}</td>
                  <td className="px-5 py-3 text-muted">{key.lastUsed ?? "Not used yet"}</td>
                  <td className="px-5 py-3 text-right">
                    {confirming === key.id ? (
                      <span className="inline-flex items-center justify-end gap-2">
                        <button type="button" className="min-h-10 px-2 text-sm text-muted hover:text-ink" disabled={busy} onClick={() => setConfirming(null)}>
                          Cancel
                        </button>
                        <button type="button" className={revokeClass} disabled={busy} onClick={() => void revoke(key.id)}>
                          Revoke key
                        </button>
                      </span>
                    ) : (
                      <button type="button" className={revokeClass} disabled={busy} onClick={() => setConfirming(key.id)}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && !open ? (
        <p className="mt-4 text-sm leading-6 text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-labelledby="generate-key-title"
        className="m-auto max-h-[min(40rem,calc(100%-2rem))] w-[min(32rem,calc(100%-2rem))] overflow-visible rounded-2xl border border-line bg-surface p-6 text-fg shadow-[0_24px_80px_-24px_rgba(32,0,82,0.45)] backdrop:bg-night/50"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="generate-key-title" className="text-lg font-semibold tracking-[-0.02em] text-ink">
            {secret ? "Key created" : "Generate key"}
          </h2>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-muted hover:bg-lilac hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple"
            aria-label="Close"
            onClick={() => dialogRef.current?.close()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {secret ? (
          <div className="mt-4">
            <p className="text-sm leading-6 text-fg">Copy this key now. It will not be shown again.</p>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-success-line bg-success-soft px-3 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink">{secret}</code>
              <button
                type="button"
                className="grid size-10 shrink-0 place-items-center rounded-full text-ink hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple"
                aria-label={copied ? "Key copied" : "Copy API key"}
                onClick={() => {
                  void navigator.clipboard.writeText(secret);
                  setCopied(true);
                }}
              >
                {copied ? <CheckIcon width={16} height={16} /> : <CopyIcon width={16} height={16} />}
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={(event) => void checkOwner(event)}>
            <p className="text-sm leading-6 text-muted">Connect the wallet that holds the agent. We check that it owns the NFT, then it signs once.</p>
            <ConnectWallet />
            <div>
              <label htmlFor="agentId" className="text-sm font-medium text-ink">
                Agent id
              </label>
              <input
                id="agentId"
                value={agentId}
                onChange={(event) => {
                  setAgentId(event.target.value);
                  setLookup(null);
                  setSecret(null);
                }}
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                className="field mt-2"
                placeholder="42"
              />
            </div>
            <button type="submit" className="btn btn-secondary" disabled={busy || !connected}>
              {busy && !lookup ? "Checking NFT" : "Verify NFT"}
            </button>
            {lookup && holds ? (
              <div className="rounded-2xl border border-line bg-paper p-4 text-sm leading-6">
                <p className="flex items-center gap-2 text-ink">
                  <CheckIcon width={16} height={16} className="text-success" />
                  {shortAddress(lookup.owner)} holds agent {agentId.trim()}
                </p>
                <p className="mt-1 text-muted">{lookup.device ? `Device ${shortAddress(lookup.device)}` : "No device is bound right now."}</p>
                <button type="button" className="btn btn-primary mt-4" disabled={busy} aria-busy={busy} onClick={() => void issue()}>
                  {busy ? "Waiting for wallet" : "Sign and issue key"}
                </button>
              </div>
            ) : null}
            {error ? (
              <p className="text-sm leading-6 text-danger" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        )}
      </dialog>
    </div>
  );
}
