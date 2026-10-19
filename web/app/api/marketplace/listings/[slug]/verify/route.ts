import { confirmManifest, type CheckedRow } from "@/lib/marketplace/chain";
import { getListingFiles } from "@/lib/marketplace/db";
import { jsonError, jsonOk } from "@/lib/marketplace/http";
import { parseManifest } from "@/lib/marketplace/manifest";
import { ipfsUrl } from "@/lib/marketplace/pinata";
import { getSample } from "@/lib/marketplace/samples";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
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
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: VerifyEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      send({ type: "start", total: manifest.value.rows.length });
      try {
        const confirmed = await confirmManifest(
          agentId,
          manifest.value.rows,
          (row) => send({ type: "row", ...row }),
          request.signal,
        );
        if (request.signal.aborted) return;
        send(confirmed.ok ? { type: "done", total: manifest.value.rows.length } : { type: "error", error: confirmed.error });
      } catch {
        if (!request.signal.aborted) send({ type: "error", error: "Those rows did not verify." });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

type VerifyEvent =
  | { type: "start"; total: number }
  | ({ type: "row" } & CheckedRow)
  | { type: "done"; total: number }
  | { type: "error"; error: string };
