"use client";

import { useState } from "react";
import { createPublicClient, decodeEventLog, http, parseEther, type Hash, type Log } from "viem";
import { useChainId, useConnect, useConnection, useConnectors, useDisconnect, useSendTransaction, useSwitchChain, useWriteContract, type Connector } from "wagmi";

import { DeskEyebrow, DeskShell } from "@/components/desk-shell";
import { CheckIcon } from "@/components/icons";
import { WalletPill } from "@/components/wallet-pill";
import { agentUri, parseClaim } from "@/lib/claim";
import { homeHref, links } from "@/lib/links";
import { chainName, explorerTx, IDENTITY, monadMainnet, monadTestnet } from "@/lib/monad";

const registryAbi = [
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "device", type: "address" },
      { name: "signature", type: "bytes" },
      { name: "deadline", type: "uint256" },
      { name: "agentURI", type: "string" },
      {
        name: "limits",
        type: "tuple",
        components: [
          { name: "perTxCap", type: "uint256" },
          { name: "dailyCap", type: "uint256" },
        ],
      },
    ],
    outputs: [{ name: "agentId", type: "uint256" }],
  },
  {
    type: "event",
    name: "Claimed",
    inputs: [
      { name: "agentId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "device", type: "address", indexed: true },
    ],
  },
] as const;

const erc721Abi = [
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
] as const;

type Step = "ready" | "claiming" | "approving" | "funding" | "done";

export function ClaimDesk({
  query,
  host,
}: {
  query: Record<string, string | string[] | undefined>;
  host: string;
}) {
  const parsed = parseClaim(query);
  const connection = useConnection();
  const chainId = useChainId();
  const connectors = useConnectors();
  const { connectAsync, isPending: connecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const [step, setStep] = useState<Step>("ready");
  const [error, setError] = useState<string | null>(null);
  const [claimHash, setClaimHash] = useState<Hash | null>(null);
  const [approvalHash, setApprovalHash] = useState<Hash | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [busy, setBusy] = useState(false);
  const done = step === "done";

  const connected = connection.status === "connected" ? connection.address : undefined;
  const claim = parsed.ok ? parsed.value : null;
  const identity = claim ? IDENTITY[claim.chainId] : undefined;
  const ownerMatches = Boolean(claim && connected?.toLowerCase() === claim.owner.toLowerCase());
  const onChain = Boolean(claim && chainId === claim.chainId);
  const home = homeHref(host);

  async function connectWallet(connector: Connector) {
    if (connection.status === "connected" && connection.connector.id !== connector.id) await disconnectAsync();
    await connectAsync({ connector });
  }

  async function disconnectWallet() {
    await disconnectAsync();
  }

  async function approve() {
    if (!claim || !identity || (claim.chainId !== 10143 && claim.chainId !== 143)) return;
    setError(null);
    setStep("approving");
    setBusy(true);
    try {
      if (chainId !== claim.chainId) await switchChainAsync({ chainId: claim.chainId });
      const approval = await writeContractAsync({
        address: identity,
        abi: erc721Abi,
        functionName: "setApprovalForAll",
        chainId: claim.chainId,
        args: [claim.attestor, true],
      });
      setApprovalHash(approval);
      await fundGas();
    } catch (cause) {
      setStep("approving");
      setError(explain(cause));
    } finally {
      setBusy(false);
    }
  }

  async function fundGas() {
    if (!claim || (claim.chainId !== 10143 && claim.chainId !== 143)) return;
    setError(null);
    setStep("funding");
    try {
      const client = createPublicClient({
        chain: claim.chainId === 143 ? monadMainnet : monadTestnet,
        transport: http(),
      });
      const balance = await client.getBalance({ address: claim.device });
      if (balance < parseEther("1")) {
        const hash = await sendTransactionAsync({
          to: claim.device,
          value: parseEther("1"),
          chainId: claim.chainId,
        });
        const settled = await client.waitForTransactionReceipt({ hash });
        if (settled.status !== "success") {
          setError("The gas transfer reverted. You can try again.");
          return;
        }
      }
      setStep("done");
    } catch (cause) {
      setStep("funding");
      setError(explain(cause));
    }
  }

  async function run() {
    if (!claim || !identity || (claim.chainId !== 10143 && claim.chainId !== 143)) {
      setError("This chain has no KineticVM identity registry.");
      return;
    }
    if (claimed && step === "funding") {
      setBusy(true);
      try {
        await fundGas();
      } catch (cause) {
        setStep("funding");
        setError(explain(cause));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (claimed) {
      await approve();
      return;
    }
    setError(null);
    setBusy(true);
    try {
      if (chainId !== claim.chainId) await switchChainAsync({ chainId: claim.chainId });
      setStep("claiming");
      const hash = await writeContractAsync({
        address: claim.registry,
        abi: registryAbi,
        functionName: "claim",
        chainId: claim.chainId,
        args: [
          claim.device,
          claim.signature,
          claim.deadline,
          agentUri(claim.name, claim.device),
          { perTxCap: claim.perTxWei, dailyCap: claim.dailyWei },
        ],
      });
      setClaimHash(hash);
      const client = createPublicClient({
        chain: claim.chainId === 143 ? monadMainnet : monadTestnet,
        transport: http(),
      });
      const settled = await client.waitForTransactionReceipt({ hash });
      if (settled.status !== "success") {
        setStep("ready");
        setError("The claim reverted. The transaction is linked below. You can try again.");
        return;
      }
      setClaimed(true);
      setAgentId(agentFromReceipt(settled.logs));
      await approve();
    } catch (cause) {
      setStep("ready");
      setError(explain(cause));
    } finally {
      setBusy(false);
    }
  }

  const expired = !parsed.ok && parsed.problems.length === 1 && parsed.problems[0].includes("expired");

  return (
    <DeskShell
      home={home}
      tone={done ? "done" : error ? "failed" : "idle"}
      wallet={
        <WalletPill
          address={connected}
          connectors={connectors}
          currentId={connection.status === "connected" ? connection.connector.id : undefined}
          connecting={connecting}
          locked={busy || switching}
          onConnect={connectWallet}
          onDisconnect={disconnectWallet}
        />
      }
    >
      {claim ? (
        <ClaimBody
          name={claim.name}
          owner={short(claim.owner)}
          device={short(claim.device)}
          perTx={`${claim.perTx} MON`}
          daily={`${claim.daily} MON`}
          chain={`${chainName(claim.chainId)} · ${claim.chainId}`}
          deadline={formatDeadline(claim.deadline)}
          connected={Boolean(connected)}
          claimed={claimed || done}
          approved={step === "funding" || done}
          funded={done}
          busy={busy || switching || step === "claiming"}
          done={done}
          canClaim={ownerMatches && Boolean(identity)}
          label={
            step === "claiming"
              ? "Confirm the claim"
              : step === "approving"
                ? "Approve the attestor"
                : step === "funding"
                  ? "Confirm the gas"
                  : done
                    ? "Claimed"
                    : "Claim this device"
          }
          onClaim={() => void run()}
          note={
            done
              ? null
              : connected && !ownerMatches
                ? `This link belongs to ${short(claim.owner)}. The connected wallet is ${short(connected)}.`
                : connected && ownerMatches && !onChain
                  ? `This wallet is on chain ${chainId}. Claiming switches it to ${chainName(claim.chainId)}.`
                  : !connected
                    ? "Connect the owner wallet in the corner, then confirm."
                    : null
          }
          error={error}
          agentId={agentId}
          claimHash={claimHash}
          approvalHash={approvalHash}
          chainId={claim.chainId}
        />
      ) : (
        <Empty expired={expired} error={error} />
      )}
    </DeskShell>
  );
}

function Empty({ expired, error }: { expired: boolean; error: string | null }) {
  return (
    <div className="text-center">
      <DeskEyebrow>Claim</DeskEyebrow>
      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-ink">
        {expired ? "This link has expired" : "Waiting on the device"}
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-[15px] leading-7 text-fg">
        {expired
          ? "Start the device again. A fresh claim link will arrive on Telegram."
          : "Open the claim link the device sent on Telegram. The signature and the caps travel with that link."}
      </p>
      {error ? (
        <p className="claim-alert mt-6 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <a href={links.docs} className="btn btn-secondary mt-8">
        Read docs
      </a>
    </div>
  );
}

function ClaimBody({
  name,
  owner,
  device,
  perTx,
  daily,
  chain,
  deadline,
  connected,
  claimed,
  approved,
  funded,
  busy,
  done,
  canClaim,
  label,
  onClaim,
  note,
  error,
  agentId,
  claimHash,
  approvalHash,
  chainId,
}: {
  name: string;
  owner: string;
  device: string;
  perTx: string;
  daily: string;
  chain: string;
  deadline: string;
  connected: boolean;
  claimed: boolean;
  approved: boolean;
  funded: boolean;
  busy: boolean;
  done: boolean;
  canClaim: boolean;
  label: string;
  onClaim: () => void;
  note: string | null;
  error: string | null;
  agentId: string | null;
  claimHash: Hash | null;
  approvalHash: Hash | null;
  chainId: number;
}) {
  return (
    <>
      <DeskEyebrow>Claim</DeskEyebrow>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink">{name}</h1>
      <p className="mt-3 text-[15px] leading-7 text-fg">
        Three wallet requests. The last one sends 1 MON to the device for gas. The device key never leaves the machine.
      </p>
      <dl className="mt-8 divide-y divide-line rounded-2xl border border-line bg-paper px-4">
        <Fact label="Owner" value={owner} />
        <Fact label="Device" value={device} />
        <Fact label="Per transaction" value={perTx} />
        <Fact label="Daily cap" value={daily} />
        <Fact label="Chain" value={chain} />
        <Fact label="Expires" value={deadline} />
      </dl>
      <ol className="mt-6 flex items-center gap-2 text-xs">
        <Mark on={connected} label="Wallet" />
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        <Mark on={claimed} label="Claim" />
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        <Mark on={approved} label="Attestor" />
        <span className="h-px flex-1 bg-line" aria-hidden="true" />
        <Mark on={funded} label="Gas" />
      </ol>
      <button
        type="button"
        className={`btn btn-lg ${done ? "btn-success" : "btn-primary"} mt-8 w-full`}
        onClick={onClaim}
        disabled={!canClaim || busy || done}
      >
        {label}
      </button>
      {done ? (
        <p className="mt-4 text-sm leading-6 text-success">
          Claimed. The identity is in the owner wallet, the attestor can record what this device does, and the device holds 1 MON for gas.
        </p>
      ) : null}
      {note ? <p className="mt-4 text-sm leading-6 text-muted">{note}</p> : null}
      {error ? (
        <p className="claim-alert mt-4 text-sm leading-6" role="alert">
          {error}
        </p>
      ) : null}
      {agentId ? <p className="mt-4 font-mono text-sm text-ink">Agent #{agentId}</p> : null}
      <HashLink chainId={chainId} hash={claimHash} label="View claim on the explorer" prominent={done} />
      <HashLink chainId={chainId} hash={approvalHash} label="View approval on the explorer" prominent={done} />
    </>
  );
}

function agentFromReceipt(logs: Log[]): string | null {
  for (const log of logs) {
    try {
      const decoded = decodeEventLog({ abi: registryAbi, data: log.data, topics: log.topics });
      if (decoded.eventName === "Claimed") return decoded.args.agentId.toString();
    } catch {
      continue;
    }
  }
  return null;
}

function HashLink({
  chainId,
  hash,
  label,
  prominent,
}: {
  chainId: number;
  hash: Hash | null;
  label: string;
  prominent: boolean;
}) {
  if (!hash) return null;
  const href = explorerTx(chainId, hash);
  if (!href) return <p className="mt-3 text-sm text-muted">{label} {short(hash)}</p>;
  return (
    <p className="mt-3 text-sm">
      <a
        href={href}
        className={`underline decoration-current/30 underline-offset-4 hover:decoration-current ${
          prominent ? "font-medium text-success" : "text-purple-deep"
        }`}
      >
        {label}
      </a>
    </p>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-mono text-sm text-ink">{value}</dd>
    </div>
  );
}

function Mark({ on, label }: { on: boolean; label: string }) {
  return (
    <li className={`inline-flex items-center gap-1.5 ${on ? "font-medium text-ink" : "text-muted"}`}>
      <span
        className={`grid size-4 place-items-center rounded-full ${on ? "bg-purple text-white" : "border border-line bg-surface"}`}
        aria-hidden="true"
      >
        {on ? <CheckIcon width={10} height={10} strokeWidth={3} /> : null}
      </span>
      {label}
    </li>
  );
}

function formatDeadline(seconds: bigint) {
  const iso = new Date(Number(seconds) * 1000).toISOString();
  return `${iso.slice(0, 16).replace("T", " ")} UTC`;
}

function short(value: string) {
  return value.length < 12 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function explain(cause: unknown) {
  const message =
    cause && typeof cause === "object" && "shortMessage" in cause
      ? String((cause as { shortMessage: unknown }).shortMessage)
      : cause instanceof Error
        ? cause.message
        : "The wallet rejected the request.";
  if (/provider not found/i.test(message)) {
    return "No wallet found in this browser. Install one that can add Monad, then reload.";
  }
  return message.slice(0, 220);
}
