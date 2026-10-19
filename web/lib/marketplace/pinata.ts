export function pinataConfigured(): boolean {
  return Boolean(process.env.PINATA_JWT);
}

export function ipfsUrl(cid: string): string {
  const configured = process.env.PINATA_GATEWAY?.trim().replace(/\/$/, "");
  const gateway = configured ? withScheme(configured) : "https://gateway.pinata.cloud";
  return `${gateway}/ipfs/${cid}`;
}

/** A gateway host without a scheme cannot be fetched. */
function withScheme(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export async function pinFile(name: string, bytes: Uint8Array, type: string): Promise<{ ok: true; cid: string } | { ok: false; error: string }> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) return { ok: false, error: "Pinata is not configured. Add PINATA_JWT before a dataset can be stored." };
  const form = new FormData();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  form.append("file", new File([copy], name, { type }));
  form.append("network", "public");
  form.append("name", name);
  let response: Response;
  try {
    response = await fetch("https://uploads.pinata.cloud/v3/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: form,
    });
  } catch {
    return { ok: false, error: "Pinata could not be reached." };
  }
  if (!response.ok) return { ok: false, error: "Pinata refused the upload." };
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: "Pinata returned an unreadable response." };
  }
  const cid = readCid(payload);
  if (!cid) return { ok: false, error: "Pinata did not return a CID." };
  return { ok: true, cid };
}

function readCid(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.cid === "string") return record.cid;
  if (record.data && typeof record.data === "object") {
    const data = record.data as Record<string, unknown>;
    if (typeof data.cid === "string") return data.cid;
  }
  return null;
}
