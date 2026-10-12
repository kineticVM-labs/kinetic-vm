import { isAddressEqual } from "viem";

import { getSession, recoverSigner } from "@/lib/marketplace/auth";
import { readAgent } from "@/lib/marketplace/chain";
import { consumeChallenge, issueAgentKey, listAgentKeys, revokeStaleKeys } from "@/lib/marketplace/db";
import { jsonError, jsonOk } from "@/lib/marketplace/http";
import { MARKET_CHAIN_ID } from "@/lib/monad";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type KeyPayload = { userId: string; wallet: `0x${string}`; agentId: string; chainId: number };

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError(401, "Sign in first.");
  return jsonOk({ keys: await listAgentKeys(session.id) });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError(401, "Sign in first.");
  let body: { challengeId?: string; signature?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "The request is not valid.");
  }
  if (!body.challengeId || !body.signature) return jsonError(400, "Sign the key request.");
  const challenge = await consumeChallenge<KeyPayload>(body.challengeId, "key");
  if (!challenge) return jsonError(400, "That key request expired. Start again.");
  const signer = await recoverSigner(challenge.message, body.signature);
  if (
    !signer ||
    challenge.payload.userId !== session.id ||
    challenge.payload.chainId !== MARKET_CHAIN_ID ||
    !isAddressEqual(signer, challenge.payload.wallet)
  ) {
    return jsonError(401, "The signature does not match that wallet.");
  }
  let agentId: bigint;
  try {
    agentId = BigInt(challenge.payload.agentId);
  } catch {
    return jsonError(400, "Enter the agent id.");
  }
  const agent = await readAgent(agentId);
  if (!agent.ok) return jsonError(404, agent.error);
  await revokeStaleKeys(MARKET_CHAIN_ID, challenge.payload.agentId, agent.value.owner);
  if (!isAddressEqual(agent.value.owner, challenge.payload.wallet)) {
    return jsonError(403, `That wallet does not hold agent ${challenge.payload.agentId}.`);
  }
  const issued = await issueAgentKey(session.id, challenge.payload.wallet, MARKET_CHAIN_ID, challenge.payload.agentId);
  return jsonOk(
    {
      key: issued.secret,
      id: issued.row.id,
      agentId: issued.row.agentId,
      prefix: issued.row.prefix,
      device: agent.value.device,
    },
    201,
  );
}
