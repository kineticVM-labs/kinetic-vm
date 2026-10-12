import { MARKET_CHAIN_ID } from "@/lib/monad";
import { authenticateAgentKey, getUser } from "@/lib/marketplace/db";
import { formFile, formText, jsonError, jsonOk, optionalImage } from "@/lib/marketplace/http";
import { parseDatasetMeta } from "@/lib/marketplace/meta";
import { decodeText, publishDataset } from "@/lib/marketplace/publish";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Device publish endpoint used by `sell_data`.
 *
 * Authorization: Bearer kvm_…
 * The key is issued only after the account proves a wallet holds that agent
 * NFT. This route checks the NFT owner again and uploads both files.
 * Buyers verify rows on Monad before they pay. The response has no CIDs.
 *
 * Multipart fields: title, summary, description, machineType, license,
 * priceMon, manifest (file), data (file). image is an optional JPEG, PNG, or WebP cover.
 */
export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const secret = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  const key = await authenticateAgentKey(secret);
  if (!key) return jsonError(401, "That agent key is not valid.");
  if (key.chainId !== MARKET_CHAIN_ID) return jsonError(403, "That agent key is for a different chain.");
  const owner = await getUser(key.userId);
  if (!owner) return jsonError(401, "That agent key is not valid.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "The upload could not be read.");
  }
  const meta = parseDatasetMeta({
    agentId: key.agentId,
    title: formText(form, "title"),
    summary: formText(form, "summary"),
    description: formText(form, "description"),
    machineType: formText(form, "machineType"),
    license: formText(form, "license"),
    priceMon: formText(form, "priceMon"),
    payout: owner.payout ?? key.wallet,
  });
  if (!meta.ok) return jsonError(400, meta.error);

  const manifestFile = await formFile(form, "manifest");
  if (!manifestFile.ok) return jsonError(400, manifestFile.error);
  const dataFile = await formFile(form, "data");
  if (!dataFile.ok) return jsonError(400, dataFile.error);
  const manifestText = decodeText(manifestFile.bytes, "manifest");
  if (!manifestText.ok) return jsonError(400, manifestText.error);
  const dataText = decodeText(dataFile.bytes, "data");
  if (!dataText.ok) return jsonError(400, dataText.error);
  const image = await optionalImage(form);
  if (!image.ok) return jsonError(400, image.error);

  const published = await publishDataset({
    userId: key.userId,
    wallet: key.wallet,
    savedPayout: owner.payout,
    meta: meta.value,
    manifestText: manifestText.text,
    dataText: dataText.text,
    image: image.file,
    source: "agent",
  });
  if (!published.ok) return jsonError(published.status, published.error);
  return jsonOk({ slug: published.slug, url: `/marketplace/${published.slug}`, status: "listed" }, 201);
}
