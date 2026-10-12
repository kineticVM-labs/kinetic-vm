import { isHash, type Hash } from "viem";

import { getSession, recoverSigner } from "@/lib/marketplace/auth";
import { confirmPayment } from "@/lib/marketplace/chain";
import { accessForListing, findPurchase, getSale, insertPurchase, txAlreadyUsed } from "@/lib/marketplace/db";
import { jsonError, jsonOk } from "@/lib/marketplace/http";
import { unlockMessage } from "@/lib/marketplace/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  if (!session) return jsonError(401, "Sign in before you pay.");
  const { slug } = await context.params;
  const sale = await getSale(slug);
  if (!sale) return jsonError(404, "That dataset is not listed.");
  const existing = await findPurchase(sale.id, session.id);
  if (existing) {
    return jsonOk({ access: await accessForListing(slug, session.id) });
  }
  let body: { txHash?: string; signature?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Send the payment transaction.");
  }
  if (!body.txHash || !isHash(body.txHash) || !body.signature) return jsonError(400, "That transaction hash is not valid.");
  if (await txAlreadyUsed(body.txHash)) return jsonError(400, "That transaction was already used.");
  const signer = await recoverSigner(unlockMessage(slug, body.txHash), body.signature);
  if (!signer) return jsonError(401, "The payment signature does not match the wallet that paid.");
  const paid = await confirmPayment({
    hash: body.txHash as Hash,
    buyer: signer,
    payout: sale.payout,
    priceWei: BigInt(sale.priceWei),
  });
  if (!paid.ok) return jsonError(400, paid.error);
  try {
    await insertPurchase(sale.id, session.id, body.txHash, BigInt(sale.priceWei));
  } catch {
    return jsonError(400, "That transaction was already used.");
  }
  return jsonOk({ access: await accessForListing(slug, session.id) });
}
