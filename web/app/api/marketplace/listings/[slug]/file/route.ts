import { getSession } from "@/lib/marketplace/auth";
import { accessForListing, getListingFiles } from "@/lib/marketplace/db";
import { jsonError } from "@/lib/marketplace/http";
import { ipfsUrl } from "@/lib/marketplace/pinata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const part = new URL(request.url).searchParams.get("part");
  if (part === "manifest") {
    const files = await getListingFiles(slug);
    if (!files) return jsonError(404, "That manifest is not listed.");
    return proxyFile(ipfsUrl(files.manifestCid), "manifest", slug);
  }
  const session = await getSession();
  if (!session) return jsonError(401, "Sign in to download this file.");
  const access = await accessForListing(slug, session.id);
  if (!access) return jsonError(404, "That file is sealed.");
  if (part !== "data") return jsonError(400, "Choose the data file or the manifest.");
  return proxyFile(access.dataUrl, "data", slug);
}

async function proxyFile(url: string, part: "data" | "manifest", slug: string): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch {
    return jsonError(502, "The file could not be loaded from IPFS.");
  }
  if (!upstream.ok || !upstream.body) return jsonError(502, "The file could not be loaded from IPFS.");
  const safe = /^[a-z0-9-]{1,80}$/.test(slug) ? slug : "dataset";
  const filename = part === "manifest" ? `${safe}.manifest.json` : `${safe}.jsonl`;
  return new Response(upstream.body, {
    headers: {
      "content-type": part === "manifest" ? "application/json; charset=utf-8" : "application/x-ndjson; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
