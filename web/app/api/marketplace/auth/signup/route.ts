import { openSession } from "@/lib/marketplace/auth";
import { createPasswordUser } from "@/lib/marketplace/db";
import { jsonError } from "@/lib/marketplace/http";
import { hashPassword, normalizeEmail } from "@/lib/marketplace/passwords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTROL = /[\u0000-\u001F\u007F]/;

export async function POST(request: Request) {
  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "The request is not valid.");
  }
  const email = normalizeEmail(body.email ?? "");
  if (!email) return jsonError(400, "Enter a valid email address.");
  const password = body.password ?? "";
  if (password.length < 8) return jsonError(400, "Use at least 8 characters.");
  if (password.length > 200) return jsonError(400, "That password is too long.");
  const name = (body.name ?? "").trim();
  if (name.length > 40) return jsonError(400, "The name must be 40 characters or fewer.");
  if (CONTROL.test(name)) return jsonError(400, "The name contains a hidden character.");
  try {
    const user = await createPasswordUser({
      email,
      passwordHash: await hashPassword(password),
      name: name === "" ? null : name,
    });
    return await openSession(user);
  } catch {
    return jsonError(409, "An account with that email already exists.");
  }
}
