import { ipfsUrl } from "@/lib/marketplace/pinata";
import { confirmManifest } from "@/lib/marketplace/chain";
import { getListingFiles } from "@/lib/marketplace/db";
import { jsonError, jsonOk } from "@/lib/marketplace/http";
import { parseManifest } from "@/lib/marketplace/manifest";
import { getSample } from "@/lib/marketplace/samples";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const sample = getSample(slug);
  if (sample) {
    return jsonOk({ preview: true, total: sample.rowCount, rows: sample.checks });
  }
  const files = await getListingFiles(slug);
  if (!files) return jsonError(404, "That dataset is not listed.");
  if (files.chainId !== 10143) return jsonError(400, "This listing is not on Monad testnet.");

  let text: string;
  try {
    const response = await fetch(ipfsUrl(files.manifestCid), { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return jsonError(502, "The manifest could not be read.");
    text = await response.text();
  } catch {
    return jsonError(502, "The manifest could not be read.");
  }
  const manifest = parseManifest(text);
  if (!manifest.ok) return jsonError(400, manifest.error);
  if (manifest.value.agentId !== files.agentId) return jsonError(400, "The manifest is for a different agent.");

  let agentId: bigint;
  try {
    agentId = BigInt(files.agentId);
  } catch {
    return jsonError(400, "This listing has no agent id.");
  }
  const confirmed = await confirmManifest(agentId, manifest.value.rows);
  if (!confirmed.ok) return jsonError(400, confirmed.error);
  return jsonOk({
    preview: false,
    total: manifest.value.rows.length,
    rows: manifest.value.rows.slice(0, 8).map((row, index) => ({ index: index + 1, ...row })),
  });
}
