import { readAgent } from "@/lib/marketplace/chain";
import { jsonError, jsonOk } from "@/lib/marketplace/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ agentId: string }> }) {
  const { agentId: raw } = await context.params;
  if (!/^[0-9]{1,78}$/.test(raw)) return jsonError(400, "Enter the agent id.");
  const agent = await readAgent(BigInt(raw));
  if (!agent.ok) return jsonError(404, agent.error);
  return jsonOk({
    agentId: raw,
    owner: agent.value.owner,
    device: agent.value.device,
  });
}
