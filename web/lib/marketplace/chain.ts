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

const ZERO = "0x0000000000000000000000000000000000000000";

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

/**
 * Every manifest row must be a score-100 validation from the Kinetic attestor,
 * and the response hash must be the line's params hash.
 */
export async function confirmManifest(agentId: bigint, rows: ManifestRow[]): Promise<{ ok: true } | { ok: false; error: string }> {
  const validation = VALIDATION[MARKET_CHAIN_ID];
  const attestor = ATTESTOR[MARKET_CHAIN_ID];
  if (!validation || !attestor) return { ok: false, error: "The Kinetic attestor is not deployed on this chain." };
  let failure: string | null = null;
  let cursor = 0;
  async function worker() {
    for (;;) {
      if (failure) return;
      const index = cursor;
      cursor += 1;
      if (index >= rows.length) return;
      const row = rows[index];
      try {
        const status = await client.readContract({
          address: validation,
          abi: validationAbi,
          functionName: "getValidationStatus",
          args: [row.requestHash],
        });
        const [validator, foundAgent, response, responseHash, tag] = status;
        if (foundAgent !== agentId) {
          failure = `Row ${index + 1} belongs to a different agent.`;
          return;
        }
        if (!isAddressEqual(validator, attestor)) {
          failure = `Row ${index + 1} was not attested by the Kinetic attestor.`;
          return;
        }
        if (response !== 100) {
          failure = `Row ${index + 1} is not a verified attestation.`;
          return;
        }
        if (responseHash.toLowerCase() !== row.paramsHash.toLowerCase()) {
          failure = `Row ${index + 1} does not match the attestation hash.`;
          return;
        }
        if (tag && tag !== "kinetic-action") {
          failure = `Row ${index + 1} has an unexpected attestation tag.`;
          return;
        }
      } catch {
        failure = `Row ${index + 1} has no attestation on Monad.`;
      }
    }
  }
  const workers = Math.min(8, rows.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  if (failure) return { ok: false, error: failure };
  return { ok: true };
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
