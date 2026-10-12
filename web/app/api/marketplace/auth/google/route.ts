import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { safeNext } from "@/lib/marketplace/format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL(`/marketplace/login?error=google&next=${encodeURIComponent(next)}`, url.origin));
  }
  const state = randomBytes(16).toString("hex");
  const redirectUri = `${url.origin}/api/marketplace/auth/google/callback`;
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", clientId);
  auth.searchParams.set("redirect_uri", redirectUri);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", "openid email profile");
  auth.searchParams.set("state", state);
  auth.searchParams.set("prompt", "select_account");
  const response = NextResponse.redirect(auth);
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set("google_oauth_state", state, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 600 });
  response.cookies.set("google_oauth_next", next, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 600 });
  return response;
}
