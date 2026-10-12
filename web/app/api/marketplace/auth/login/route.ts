import { getUser, findLogin } from "@/lib/marketplace/db";
import { openSession } from "@/lib/marketplace/auth";
import { jsonError } from "@/lib/marketplace/http";
import { normalizeEmail, verifyPassword } from "@/lib/marketplace/passwords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "The request is not valid.");
  }
  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  if (!email || password.length < 8 || password.length > 200) {
    return jsonError(401, "Email or password doesn't match.");
  }
  const login = await findLogin(email);
  const matches = await verifyPassword(password, login?.passwordHash ?? null);
  if (!login || !matches) return jsonError(401, "Email or password doesn't match.");
  const user = await getUser(login.id);
  if (!user) return jsonError(401, "Email or password doesn't match.");
  return await openSession(user);
}
