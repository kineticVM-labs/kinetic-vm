import { getPublicListing } from "@/lib/marketplace/db";
import { jsonError, jsonOk } from "@/lib/marketplace/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const listing = await getPublicListing(slug);
  if (!listing) return jsonError(404, "That dataset is not listed.");
  return jsonOk({ listing });
}
