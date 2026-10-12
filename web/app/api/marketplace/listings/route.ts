import { getSession } from "@/lib/marketplace/auth";
import { updateUser } from "@/lib/marketplace/db";
import { formFile, formText, jsonError, jsonOk, optionalImage } from "@/lib/marketplace/http";
import { parseDatasetMeta } from "@/lib/marketplace/meta";
import { decodeText, publishDataset } from "@/lib/marketplace/publish";
import { listCatalog } from "@/lib/marketplace/samples";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const machine = url.searchParams.get("machine") ?? "";
  const sort = url.searchParams.get("sort") ?? "new";
  const q = url.searchParams.get("q") ?? "";
  const allowedMachine = ["", "vending", "arm", "drone", "amr", "sensor", "humanoid", "other"].includes(machine) ? machine : "";
  const allowedSort = sort === "price" || sort === "rows" ? sort : "new";
  return jsonOk({ listings: await listCatalog({ q, machine: allowedMachine, sort: allowedSort }) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError(401, "Sign in first.");
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "The upload could not be read.");
  }
  const meta = parseDatasetMeta({
    agentId: formText(form, "agentId"),
    title: formText(form, "title"),
    summary: formText(form, "summary"),
    description: formText(form, "description"),
    machineType: formText(form, "machineType"),
    license: formText(form, "license"),
    priceMon: formText(form, "priceMon"),
    payout: formText(form, "payout"),
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

  await updateUser(session.id, { name: session.name, payout: meta.value.payout });
  const published = await publishDataset({
    userId: session.id,
    wallet: null,
    savedPayout: meta.value.payout,
    meta: meta.value,
    manifestText: manifestText.text,
    dataText: dataText.text,
    image: image.file,
    source: "owner",
  });
  if (!published.ok) return jsonError(published.status, published.error);
  return jsonOk({ slug: published.slug }, 201);
}
