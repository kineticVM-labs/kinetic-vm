import { parseEther } from "viem";

import { LICENSES, MACHINE_TYPES, type DatasetMeta, type LicenseId, type MachineType } from "@/lib/marketplace/catalog";
import { checksum } from "@/lib/marketplace/format";
import { MARKET_CHAIN_ID } from "@/lib/monad";

const CONTROL = /[\u0000-\u001F\u007F]/;

export function parseDatasetMeta(input: {
  agentId: string;
  title: string;
  summary: string;
  description: string;
  machineType: string;
  license: string;
  priceMon: string;
  payout: string;
}): { ok: true; value: DatasetMeta } | { ok: false; error: string } {
  const agentId = input.agentId.trim();
  if (!/^[0-9]{1,78}$/.test(agentId)) return { ok: false, error: "Enter the agent id." };
  const title = input.title.trim();
  const summary = input.summary.trim();
  const description = input.description.trim();
  const titleError = plainText(title, "Title", 80);
  if (titleError) return { ok: false, error: titleError };
  const summaryError = plainText(summary, "Summary", 180);
  if (summaryError) return { ok: false, error: summaryError };
  if (description.length < 20) return { ok: false, error: "The description needs at least 20 characters." };
  if (description.length > 8000) return { ok: false, error: "The description is too long." };
  if (CONTROL.test(description)) return { ok: false, error: "The description contains a hidden character." };
  if (!isMachine(input.machineType)) return { ok: false, error: "Choose a machine type." };
  if (!isLicense(input.license)) return { ok: false, error: "Choose a license." };
  const payout = checksum(input.payout.trim());
  if (!payout) return { ok: false, error: "The payout address is not a wallet address." };
  let priceWei: bigint;
  try {
    priceWei = parseEther(input.priceMon.trim());
  } catch {
    return { ok: false, error: "Enter a price in MON." };
  }
  if (priceWei <= 0n) return { ok: false, error: "The price has to be greater than zero." };
  return {
    ok: true,
    value: {
      chainId: MARKET_CHAIN_ID,
      agentId,
      title,
      summary,
      description,
      machineType: input.machineType,
      license: input.license,
      priceWei,
      payout,
    },
  };
}

export function payoutAllowed(owner: `0x${string}`, saved: `0x${string}` | null, requested: `0x${string}`): boolean {
  return requested.toLowerCase() === owner.toLowerCase() || (saved !== null && requested.toLowerCase() === saved.toLowerCase());
}

function plainText(value: string, label: string, max: number): string | null {
  if (value.length === 0) return `${label} is required.`;
  if (value.length > max) return `${label} must be ${max} characters or fewer.`;
  if (CONTROL.test(value)) return `${label} cannot contain a line break.`;
  return null;
}

function isMachine(value: string): value is MachineType {
  return MACHINE_TYPES.some((item) => item.id === value);
}

function isLicense(value: string): value is LicenseId {
  return LICENSES.some((item) => item.id === value);
}
