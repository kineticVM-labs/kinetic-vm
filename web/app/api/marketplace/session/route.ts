import { closeSession, getSession } from "@/lib/marketplace/auth";
import { jsonError, jsonOk } from "@/lib/marketplace/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonOk({ signedIn: false });
  return jsonOk({
    signedIn: true,
    email: session.email,
    name: session.name,
    payout: session.payout,
    createdAt: session.createdAt,
  });
}

export async function POST() {
  return jsonError(400, "Sign in with email or Google at /marketplace/login.");
}

export async function DELETE() {
  return closeSession();
}
