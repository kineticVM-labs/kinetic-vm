import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { attachSession } from "@/lib/marketplace/auth";
import { upsertGoogleUser } from "@/lib/marketplace/db";
import { safeNext } from "@/lib/marketplace/format";
import { normalizeEmail } from "@/lib/marketplace/passwords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (code: string) => NextResponse.redirect(new URL(`/marketplace/login?error=${code}`, url.origin));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("google_oauth_state")?.value;
  const next = safeNext(jar.get("google_oauth_next")?.value);
  if (!code || !state || !expected || state !== expected) return fail("google-failed");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail("google");

  let accessToken = "";
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${url.origin}/api/marketplace/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenResponse.ok || !token.access_token) return fail("google-failed");
    accessToken = token.access_token;
  } catch {
    return fail("google-failed");
  }

  let profile: { sub?: string; email?: string; email_verified?: boolean; name?: string };
  try {
    const info = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    profile = (await info.json()) as typeof profile;
    if (!info.ok) return fail("google-failed");
  } catch {
    return fail("google-failed");
  }

  const email = normalizeEmail(profile.email ?? "");
  if (!profile.sub || !email || profile.email_verified === false) return fail("google-failed");
  const name = typeof profile.name === "string" ? profile.name.trim().slice(0, 40) : "";
  const user = await upsertGoogleUser({ sub: profile.sub, email, name: name === "" ? null : name });
  const response = NextResponse.redirect(new URL(next, url.origin));
  await attachSession(response, user.id);
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set("google_oauth_state", "", { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 0 });
  response.cookies.set("google_oauth_next", "", { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 0 });
  return response;
}
