import { getAddress, isAddress } from "viem";

import { getSession } from "@/lib/marketplace/auth";
import { challengeId, createChallenge } from "@/lib/marketplace/db";
import { jsonError, jsonOk } from "@/lib/marketplace/http";
import { agentKeyMessage } from "@/lib/marketplace/messages";
import { MARKET_CHAIN_ID } from "@/lib/monad";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return jsonError(400, "The request is not valid.");
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError(400, "The request is not valid.");
  }
  if (body.kind !== "key") return jsonError(400, "Choose a challenge kind.");
  const session = await getSession();
  if (!session) return jsonError(401, "Sign in first.");
  const agentId = text(body, "agentId").trim();
  if (!/^[0-9]{1,78}$/.test(agentId)) return jsonError(400, "Enter the agent id.");
  const walletText = text(body, "wallet").trim();
  if (!isAddress(walletText)) return jsonError(400, "Enter the wallet that holds the agent.");
  const wallet = getAddress(walletText);
  const id = challengeId();
  const message = agentKeyMessage(wallet, MARKET_CHAIN_ID, agentId, id);
  await createChallenge(id, "key", message, { userId: session.id, wallet, agentId, chainId: MARKET_CHAIN_ID });
  return jsonOk({ id, message });
}

function text(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? body[key] : "";
}
