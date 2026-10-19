import { createPublicClient, getAddress, http, isAddressEqual, type Address, type Hash, type TransactionReceipt } from "viem";

import { ATTESTOR, IDENTITY, KINETIC, MARKET_CHAIN_ID, VALIDATION, monadTestnet } from "@/lib/monad";
import type { ManifestRow } from "@/lib/marketplace/manifest";

const client = createPublicClient({
  chain: monadTestnet,
  transport: http(monadTestnet.rpcUrls.default.http[0]),
});

const identityAbi = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }],
  },
] as const;

const registryAbi = [
  {
    type: "function",
    name: "agentDevice",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "device", type: "address" }],
  },
] as const;

const validationAbi = [
  {
    type: "function",
    name: "getValidationStatus",
    stateMutability: "view",
    inputs: [{ name: "requestHash", type: "bytes32" }],
    outputs: [
      { name: "validatorAddress", type: "address" },
      { name: "agentId", type: "uint256" },
      { name: "response", type: "uint8" },
      { name: "responseHash", type: "bytes32" },
      { name: "tag", type: "string" },
      { name: "lastUpdate", type: "uint256" },
    ],
  },
] as const;

const ZERO = "0x0000000000000000000000000000000000000000" as const;
const READ_BATCH = 15;
const BATCH_PAUSE_MS = 400;
const READ_ATTEMPTS = 4;

export type AgentOwnership = {
  owner: Address;
  device: Address | null;
};

export async function readAgent(agentId: bigint): Promise<{ ok: true; value: AgentOwnership } | { ok: false; error: string }> {
  const identity = IDENTITY[MARKET_CHAIN_ID];
  const registry = KINETIC[MARKET_CHAIN_ID]?.registry;
  if (!identity || !registry) return { ok: false, error: "KineticVM is not deployed on this chain." };
  try {
    const owner = await client.readContract({
      address: identity,
      abi: identityAbi,
      functionName: "ownerOf",
      args: [agentId],
    });
    const device = await client.readContract({
      address: registry,
      abi: registryAbi,
      functionName: "agentDevice",
      args: [agentId],
    });
    return {
      ok: true,
      value: {
        owner: getAddress(owner),
        device: device.toLowerCase() === ZERO ? null : getAddress(device),
      },
    };
  } catch {
    return { ok: false, error: "That agent id is not an ERC-8004 identity on Monad testnet." };
  }
}

export async function walletOwnsAgent(wallet: Address, agentId: bigint): Promise<{ ok: true; value: AgentOwnership } | { ok: false; error: string }> {
  const agent = await readAgent(agentId);
  if (!agent.ok) return agent;
  if (!isAddressEqual(agent.value.owner, wallet)) {
    return { ok: false, error: `This wallet does not own agent ${agentId.toString()}.` };
  }
  return agent;
}

export type CheckedRow = {
  index: number;
  paramsHash: `0x${string}`;
  requestHash: `0x${string}`;
};

/**
 * Every manifest row must be a score-100 validation from the Kinetic attestor,
 * and the response hash must be the line's params hash.
 *
 * Reads go one at a time. The public testnet RPC drops a burst of parallel
 * calls, and that failure used to be reported as a missing attestation.
 * A short pause after every 15 reads keeps the pace down, and a dropped call
 * is retried before the row is treated as absent.
 */
export async function confirmManifest(
  agentId: bigint,
  rows: ManifestRow[],
  onRow?: (row: CheckedRow) => void | Promise<void>,
  signal?: AbortSignal,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const validation = VALIDATION[MARKET_CHAIN_ID];
  const attestor = ATTESTOR[MARKET_CHAIN_ID];
  if (!validation || !attestor) return { ok: false, error: "The Kinetic attestor is not deployed on this chain." };
  for (let index = 0; index < rows.length; index += 1) {
    if (signal?.aborted) return { ok: false, error: "The check was cancelled." };
    const row = rows[index];
    let status;
    try {
      status = await readValidation(validation, row.requestHash, signal);
    } catch (error) {
      if (signal?.aborted) return { ok: false, error: "The check was cancelled." };
      if (transientRpc(error)) return { ok: false, error: `Monad did not answer for row ${index + 1}. Try the check again.` };
      return { ok: false, error: `Row ${index + 1} has no attestation on Monad.` };
    }
    const problem = attestProblem(index, status, agentId, attestor, row.paramsHash);
    if (problem) return { ok: false, error: problem };
    await onRow?.({ index: index + 1, paramsHash: row.paramsHash, requestHash: row.requestHash });
    const finished = index + 1;
    if (finished % READ_BATCH === 0 && finished < rows.length) await sleep(BATCH_PAUSE_MS, signal);
  }
  return { ok: true };
}

async function readValidation(validation: Address, requestHash: Hash, signal?: AbortSignal) {
  let last: unknown;
  for (let attempt = 0; attempt < READ_ATTEMPTS; attempt += 1) {
    if (signal?.aborted) throw new Error("The check was cancelled.");
    try {
      return await client.readContract({
        address: validation,
        abi: validationAbi,
        functionName: "getValidationStatus",
        args: [requestHash],
      });
    } catch (error) {
      last = error;
      if (!transientRpc(error) || attempt === READ_ATTEMPTS - 1) throw error;
      await sleep(BATCH_PAUSE_MS * (attempt + 1), signal);
    }
  }
  throw last;
}

function attestProblem(
  index: number,
  status: readonly [Address, bigint, number, Hash, string, bigint],
  agentId: bigint,
  attestor: Address,
  paramsHash: string,
): string | null {
  const [validator, foundAgent, response, responseHash, tag] = status;
  const row = index + 1;
  if (isAddressEqual(validator, ZERO)) return `Row ${row} has no attestation on Monad.`;
  if (foundAgent !== agentId) return `Row ${row} belongs to a different agent.`;
  if (!isAddressEqual(validator, attestor)) return `Row ${row} was not attested by the Kinetic attestor.`;
  if (response !== 100) return `Row ${row} is not a verified attestation.`;
  if (responseHash.toLowerCase() !== paramsHash.toLowerCase()) return `Row ${row} does not match the attestation hash.`;
  if (tag && tag !== "kinetic-action") return `Row ${row} has an unexpected attestation tag.`;
  return null;
}

function transientRpc(error: unknown): boolean {
  const text = errorText(error);
  if (/rpc request failed|http request failed|timeout|fetch failed|econn|429|502|503|504|rate limit/i.test(text)) return true;
  if (/reverted/i.test(text)) return false;
  return true;
}

function errorText(error: unknown): string {
  if (!error || typeof error !== "object") return String(error);
  const record = error as { shortMessage?: unknown; message?: unknown; cause?: unknown };
  const own = [record.shortMessage, record.message].filter((part) => typeof part === "string").join(" ");
  return record.cause ? `${own} ${errorText(record.cause)}` : own;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", finish);
      resolve();
    }, ms);
    const finish = () => {
      clearTimeout(timer);
      resolve();
    };
    if (signal?.aborted) {
      finish();
      return;
    }
    signal?.addEventListener("abort", finish, { once: true });
  });
}

export async function confirmPayment(input: {
  hash: Hash;
  buyer: Address;
  payout: Address;
  priceWei: bigint;
}): Promise<{ ok: true; receipt: TransactionReceipt } | { ok: false; error: string }> {
  let transaction;
  try {
    transaction = await client.getTransaction({ hash: input.hash });
  } catch {
    return { ok: false, error: "That transaction is not on Monad testnet." };
  }
  if (!transaction.to || !isAddressEqual(transaction.to, input.payout)) {
    return { ok: false, error: "This transaction was not sent to the seller." };
  }
  if (!isAddressEqual(transaction.from, input.buyer)) {
    return { ok: false, error: "This transaction was sent from a different wallet." };
  }
  if (transaction.value < input.priceWei) {
    return { ok: false, error: "This transaction paid less than the listing price." };
  }
  try {
    const receipt = await client.waitForTransactionReceipt({ hash: input.hash, timeout: 20_000 });
    if (receipt.status !== "success") return { ok: false, error: "The payment transaction reverted." };
    return { ok: true, receipt };
  } catch {
    return { ok: false, error: "The payment is not confirmed yet. Wait a moment and submit the same transaction again." };
  }
}
