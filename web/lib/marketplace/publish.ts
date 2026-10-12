import { isAddressEqual, type Address } from "viem";

import { readAgent } from "@/lib/marketplace/chain";
import type { DatasetMeta } from "@/lib/marketplace/catalog";
import { insertListing, revokeStaleKeys } from "@/lib/marketplace/db";
import { assessDataset, MAX_FILE_BYTES } from "@/lib/marketplace/manifest";
import { payoutAllowed } from "@/lib/marketplace/meta";
import { ipfsUrl, pinFile } from "@/lib/marketplace/pinata";

export async function publishDataset(input: {
  userId: string;
  /** Set for a device key. That wallet must still hold the agent NFT. */
  wallet: Address | null;
  savedPayout: Address | null;
  meta: DatasetMeta;
  manifestText: string;
  dataText: string;
  image: { bytes: Uint8Array; type: string } | null;
  source: "owner" | "agent";
}): Promise<{ ok: true; slug: string } | { ok: false; error: string; status: number }> {
  if (input.wallet && !payoutAllowed(input.wallet, input.savedPayout, input.meta.payout)) {
    return { ok: false, status: 400, error: "Payouts go to the agent wallet, or to the address saved in settings." };
  }
  const assessed = assessDataset(input.manifestText, input.dataText);
  if (!assessed.ok) return { ok: false, status: 400, error: assessed.error };
  if (assessed.value.manifest.agentId !== input.meta.agentId) {
    return { ok: false, status: 400, error: "The manifest is for a different agent." };
  }
  if (assessed.value.manifest.chainId !== input.meta.chainId) {
    return { ok: false, status: 400, error: "The manifest is for a different chain." };
  }

  if (input.wallet) {
    let agentId: bigint;
    try {
      agentId = BigInt(input.meta.agentId);
    } catch {
      return { ok: false, status: 400, error: "Enter the agent id." };
    }
    const agent = await readAgent(agentId);
    if (!agent.ok) return { ok: false, status: 400, error: agent.error };
    await revokeStaleKeys(input.meta.chainId, input.meta.agentId, agent.value.owner);
    if (!isAddressEqual(agent.value.owner, input.wallet)) {
      return { ok: false, status: 403, error: `This wallet does not own agent ${input.meta.agentId}.` };
    }
  }

  const stamp = `${Date.now().toString(36)}-${input.meta.agentId}`;
  const manifestPin = await pinFile(`${stamp}.manifest.json`, Buffer.from(input.manifestText), "application/json");
  if (!manifestPin.ok) return { ok: false, status: 503, error: manifestPin.error };
  const dataPin = await pinFile(`${stamp}.jsonl`, Buffer.from(input.dataText), "application/x-ndjson");
  if (!dataPin.ok) return { ok: false, status: 503, error: dataPin.error };
  let imageUrl: string | null = null;
  if (input.image) {
    const extension = input.image.type === "image/png" ? "png" : input.image.type === "image/webp" ? "webp" : "jpg";
    const imagePin = await pinFile(`${stamp}.cover.${extension}`, input.image.bytes, input.image.type);
    if (!imagePin.ok) return { ok: false, status: 503, error: imagePin.error };
    imageUrl = ipfsUrl(imagePin.cid);
  }

  const listing = await insertListing({
    userId: input.userId,
    meta: input.meta,
    schema: assessed.value.schema,
    rowCount: assessed.value.rowCount,
    manifestCid: manifestPin.cid,
    dataCid: dataPin.cid,
    imageUrl,
    source: input.source,
  });
  return { ok: true, slug: listing.slug };
}

export function decodeText(bytes: Uint8Array, label: string): { ok: true; text: string } | { ok: false; error: string } {
  if (bytes.byteLength === 0) return { ok: false, error: `The ${label} file is empty.` };
  if (bytes.byteLength > MAX_FILE_BYTES) return { ok: false, error: `The ${label} file is larger than 20MB.` };
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return { ok: false, error: `The ${label} file is not UTF-8 text.` };
  }
}
