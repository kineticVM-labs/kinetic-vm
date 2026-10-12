import { MAX_FILE_BYTES } from "@/lib/marketplace/manifest";

export function jsonError(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "cache-control": "no-store" } });
}

export function jsonOk(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

export function formText(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export async function formFile(form: FormData, name: string): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; error: string }> {
  const value = form.get(name);
  if (!(value instanceof File)) return { ok: false, error: `Choose the ${name} file.` };
  if (value.size > MAX_FILE_BYTES) return { ok: false, error: `The ${name} file is larger than 20MB.` };
  return { ok: true, bytes: new Uint8Array(await value.arrayBuffer()) };
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function optionalImage(
  form: FormData,
): Promise<{ ok: true; file: { bytes: Uint8Array; type: string } | null } | { ok: false; error: string }> {
  const value = form.get("image");
  if (!(value instanceof File) || value.size === 0) return { ok: true, file: null };
  if (!IMAGE_TYPES.has(value.type)) return { ok: false, error: "The cover image needs to be a JPEG, PNG, or WebP." };
  if (value.size > MAX_IMAGE_BYTES) return { ok: false, error: "The cover image is larger than 4MB." };
  return { ok: true, file: { bytes: new Uint8Array(await value.arrayBuffer()), type: value.type } };
}

export function isSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}
