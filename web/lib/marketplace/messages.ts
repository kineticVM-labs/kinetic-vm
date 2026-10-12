import { createHash } from "node:crypto";

import type { Address } from "viem";

import type { LicenseId, MachineType } from "@/lib/marketplace/catalog";

export function sha256Hex(bytes: Uint8Array | string): string {
  const hash = createHash("sha256");
  hash.update(bytes);
  return hash.digest("hex");
}

export function sessionMessage(wallet: Address, nonce: string): string {
  return ["KineticVM marketplace", "Sign in", `wallet: ${wallet}`, `nonce: ${nonce}`].join("\n");
}

export function unlockMessage(slug: string, txHash: string): string {
  return ["KineticVM marketplace", "Unlock", `listing: ${slug}`, `tx: ${txHash}`].join("\n");
}

export function agentKeyMessage(wallet: Address, chainId: number, agentId: string, nonce: string): string {
  return ["KineticVM marketplace", "Issue agent key", `wallet: ${wallet}`, `chain: ${chainId}`, `agent: ${agentId}`, `nonce: ${nonce}`].join("\n");
}

export function listingMessage(input: {
  wallet: Address;
  chainId: number;
  agentId: string;
  payout: Address;
  title: string;
  priceLabel: string;
  license: LicenseId;
  machineType: MachineType;
  summarySha256: string;
  descriptionSha256: string;
  manifestSha256: string;
  dataSha256: string;
  nonce: string;
}): string {
  return [
    "KineticVM marketplace",
    "List dataset",
    `wallet: ${input.wallet}`,
    `chain: ${input.chainId}`,
    `agent: ${input.agentId}`,
    `payout: ${input.payout}`,
    `title: ${input.title}`,
    `price: ${input.priceLabel}`,
    `license: ${input.license}`,
    `machine: ${input.machineType}`,
    `summary: ${input.summarySha256}`,
    `description: ${input.descriptionSha256}`,
    `manifest: ${input.manifestSha256}`,
    `data: ${input.dataSha256}`,
    `nonce: ${input.nonce}`,
  ].join("\n");
}
