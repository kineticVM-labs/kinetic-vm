import { formatEther, getAddress, isAddress } from "viem";

export function shortAddress(value: string): string {
  return value.length < 12 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function formatMon(wei: string | bigint): string {
  const amount = typeof wei === "bigint" ? wei : BigInt(wei);
  const text = formatEther(amount);
  if (!text.includes(".")) return text;
  const trimmed = text.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed === "" ? "0" : trimmed;
}

export function formatRows(count: number): string {
  return new Intl.NumberFormat("en-US").format(count);
}

export function checksum(value: string): `0x${string}` | null {
  if (!isAddress(value)) return null;
  return getAddress(value);
}

/** A path on this site. Rejects protocol-relative and backslash URLs. */
export function safeNext(value: string | null | undefined, fallback = "/marketplace"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("\n")) {
    return fallback;
  }
  return value;
}
