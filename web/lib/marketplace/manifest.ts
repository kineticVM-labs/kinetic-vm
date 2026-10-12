import { keccak256, toBytes } from "viem";

/** Listings are checked on Monad testnet, where the Kinetic attestor is deployed. */
const LISTING_CHAIN_ID = 10143;

/**
 * A listing is two files.
 *
 * The data file is JSONL. One line is one operation, the exact UTF-8 bytes
 * `monad_attest` signed. `keccak256` of that line is the onchain `paramsHash`,
 * stored as the validation `responseHash`.
 *
 * The manifest lists every line's `paramsHash` and the attestor `requestHash`
 * so the marketplace can call `getValidationStatus` without seeing a second
 * attestation. Buyers do not receive either file until they pay.
 */
export const MAX_ROWS = 5000;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
const HASH = /^0x[0-9a-fA-F]{64}$/;

export type ManifestRow = {
  paramsHash: `0x${string}`;
  requestHash: `0x${string}`;
};

export type Manifest = {
  version: 1;
  chainId: number;
  agentId: string;
  rows: ManifestRow[];
};

export type AssessedDataset = {
  manifest: Manifest;
  schema: string[];
  rowCount: number;
};

export function lineHash(line: string): `0x${string}` {
  return keccak256(toBytes(line));
}

export function assessDataset(manifestText: string, dataText: string): { ok: true; value: AssessedDataset } | { ok: false; error: string } {
  const manifest = parseManifest(manifestText);
  if (!manifest.ok) return manifest;
  const lines = splitJsonl(dataText);
  if (!lines.ok) return lines;
  if (lines.value.length !== manifest.value.rows.length) {
    return {
      ok: false,
      error: `The data file has ${lines.value.length} lines and the manifest has ${manifest.value.rows.length} rows.`,
    };
  }
  for (let index = 0; index < lines.value.length; index += 1) {
    const line = lines.value[index];
    if (line.length > 256 * 1024) {
      return { ok: false, error: `Row ${index + 1} is too long.` };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      return { ok: false, error: `Row ${index + 1} is not JSON.` };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: `Row ${index + 1} must be a JSON object.` };
    }
    const keys = Object.keys(parsed as Record<string, unknown>);
    if (keys.length === 0) return { ok: false, error: `Row ${index + 1} has no fields.` };
    const actual = lineHash(line).toLowerCase();
    const expected = manifest.value.rows[index].paramsHash.toLowerCase();
    if (actual !== expected) {
      return {
        ok: false,
        error: `Row ${index + 1} hashes to ${shortHash(actual)} but the manifest says ${shortHash(expected)}.`,
      };
    }
  }
  const first = JSON.parse(lines.value[0]) as Record<string, unknown>;
  return {
    ok: true,
    value: {
      manifest: manifest.value,
      schema: Object.keys(first).sort(),
      rowCount: lines.value.length,
    },
  };
}

export function parseManifest(text: string): { ok: true; value: Manifest } | { ok: false; error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "The manifest is not JSON." };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "The manifest must be a JSON object." };
  }
  const record = parsed as Record<string, unknown>;
  if (record.version !== 1) return { ok: false, error: "The manifest version must be 1." };
  if (record.chainId !== LISTING_CHAIN_ID) {
    return { ok: false, error: "Listings go on Monad testnet, where the Kinetic attestor is deployed." };
  }
  if (typeof record.agentId !== "string" || !/^[0-9]{1,78}$/.test(record.agentId)) {
    return { ok: false, error: "The manifest needs an agent id." };
  }
  if (!Array.isArray(record.rows) || record.rows.length === 0) {
    return { ok: false, error: "The manifest has no rows." };
  }
  if (record.rows.length > MAX_ROWS) {
    return { ok: false, error: `A listing can hold ${MAX_ROWS.toLocaleString("en-US")} rows in this version.` };
  }
  const seen = new Set<string>();
  const rows: ManifestRow[] = [];
  for (let index = 0; index < record.rows.length; index += 1) {
    const row = record.rows[index];
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return { ok: false, error: `Manifest row ${index + 1} must be an object.` };
    }
    const item = row as Record<string, unknown>;
    if (typeof item.paramsHash !== "string" || !HASH.test(item.paramsHash)) {
      return { ok: false, error: `Manifest row ${index + 1} needs a paramsHash.` };
    }
    if (typeof item.requestHash !== "string" || !HASH.test(item.requestHash)) {
      return { ok: false, error: `Manifest row ${index + 1} needs a requestHash.` };
    }
    const requestHash = item.requestHash.toLowerCase() as `0x${string}`;
    if (seen.has(requestHash)) return { ok: false, error: `Manifest row ${index + 1} repeats a request hash.` };
    seen.add(requestHash);
    rows.push({
      paramsHash: item.paramsHash.toLowerCase() as `0x${string}`,
      requestHash,
    });
  }
  return { ok: true, value: { version: 1, chainId: LISTING_CHAIN_ID, agentId: record.agentId, rows } };
}

function splitJsonl(text: string): { ok: true; value: string[] } | { ok: false; error: string } {
  let body = text;
  if (body.charCodeAt(0) === 0xfeff) body = body.slice(1);
  if (body.endsWith("\n")) body = body.slice(0, -1);
  if (body.endsWith("\r")) body = body.slice(0, -1);
  if (body.length === 0) return { ok: false, error: "The data file is empty." };
  const lines = body.split("\n").map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line));
  if (lines.some((line) => line.length === 0)) {
    return { ok: false, error: "The data file has a blank line." };
  }
  return { ok: true, value: lines };
}

function shortHash(value: string): string {
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}
