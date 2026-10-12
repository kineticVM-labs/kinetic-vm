import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-kinetic-path", request.nextUrl.pathname);
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const claimHost = host === "claim.kineticvm.xyz" || host.startsWith("claim.");
  const depositHost = host === "vault-deposit.kineticvm.xyz" || host.startsWith("vault-deposit.");
  const marketHost = host === "marketplace.kineticvm.xyz" || host.startsWith("marketplace.");
  if ((claimHost || depositHost || marketHost) && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    if (claimHost) url.pathname = "/claim";
    else if (depositHost) url.pathname = "/deposit";
    else url.pathname = "/marketplace";
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
