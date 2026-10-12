import { getSession } from "@/lib/marketplace/auth";
import { updateUser } from "@/lib/marketplace/db";
import { checksum } from "@/lib/marketplace/format";
import { jsonError, jsonOk } from "@/lib/marketplace/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTROL = /[\u0000-\u001F\u007F]/;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError(401, "Sign in first.");
  let body: { name?: string; payout?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "The request is not valid.");
  }
  const name = (body.name ?? "").trim();
  if (name.length > 40) return jsonError(400, "The name must be 40 characters or fewer.");
  if (CONTROL.test(name)) return jsonError(400, "The name contains a hidden character.");
  const payoutText = (body.payout ?? "").trim();
  const payout = payoutText === "" ? null : checksum(payoutText);
  if (payoutText !== "" && !payout) return jsonError(400, "The payout address is not a wallet address.");
  const user = await updateUser(session.id, { name: name === "" ? null : name, payout });
  return jsonOk({ name: user.name, payout: user.payout });
}
