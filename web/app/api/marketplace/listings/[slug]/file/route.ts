import { getSession } from "@/lib/marketplace/auth";
import { accessForListing } from "@/lib/marketplace/db";
import { jsonError } from "@/lib/marketplace/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return jsonError(401, "Sign in to download this file.");
  const { slug } = await context.params;
  const access = await accessForListing(slug, session.id);
  if (!access) return jsonError(404, "That file is sealed.");
  const part = new URL(request.url).searchParams.get("part");
  const url = part === "data" ? access.dataUrl : part === "manifest" ? access.manifestUrl : null;
  if (!url) return jsonError(400, "Choose the data file or the manifest.");
  let upstream: Response;
  try {
    upstream = await fetch(url);
  } catch {
    return jsonError(502, "The file could not be loaded from IPFS.");
  }
  if (!upstream.ok || !upstream.body) return jsonError(502, "The file could not be loaded from IPFS.");
  const filename = part === "manifest" ? `${slug}.manifest.json` : `${slug}.jsonl`;
  return new Response(upstream.body, {
    headers: {
      "content-type": part === "manifest" ? "application/json; charset=utf-8" : "application/x-ndjson; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
