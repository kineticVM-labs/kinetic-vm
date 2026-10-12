import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isHex, recoverMessageAddress, type Address, type Hex } from "viem";

import { createSession, deleteSession, readSession, type UserRow } from "@/lib/marketplace/db";

const COOKIE = "kvm_session";

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export async function getSession(): Promise<UserRow | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;
  return readSession(id);
}

export async function sessionId(): Promise<string | undefined> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value;
}

export async function recoverSigner(message: string, signature: string): Promise<Address | null> {
  if (!isHex(signature) || signature.length !== 132) return null;
  try {
    return await recoverMessageAddress({ message, signature: signature as Hex });
  } catch {
    return null;
  }
}

export async function attachSession(response: NextResponse, userId: string): Promise<NextResponse> {
  const session = await createSession(userId);
  response.cookies.set(COOKIE, session.id, {
    ...cookieBase(),
    expires: new Date(session.expiresAt),
  });
  return response;
}

export async function openSession(user: UserRow): Promise<NextResponse> {
  const response = NextResponse.json({ email: user.email, name: user.name });
  return attachSession(response, user.id);
}

export async function closeSession(): Promise<NextResponse> {
  const id = await sessionId();
  if (id) await deleteSession(id);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, "", { ...cookieBase(), maxAge: 0 });
  return response;
}
