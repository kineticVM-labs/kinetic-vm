import { getSession } from "@/lib/marketplace/auth";
import { revokeAgentKey } from "@/lib/marketplace/db";
import { jsonError, jsonOk } from "@/lib/marketplace/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return jsonError(401, "Sign in first.");
  const { id } = await context.params;
  if (!(await revokeAgentKey(session.id, id))) return jsonError(404, "That key is already revoked.");
  return jsonOk({ ok: true });
}
