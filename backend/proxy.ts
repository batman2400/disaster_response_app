import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { COOKIE_NAME, parseSession } from "./lib/dashboard-auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = parseSession(request.cookies.get(COOKIE_NAME)?.value);

  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    const dest = request.nextUrl.clone();
    dest.pathname =
      role === "relief" ? "/dashboard/relief" : role === "officer" ? "/dashboard/officer" : "/dashboard/login";
    return NextResponse.redirect(dest);
  }

  if (pathname.startsWith("/dashboard/officer") && role !== "officer") {
    const dest = request.nextUrl.clone();
    dest.pathname = role === "relief" ? "/dashboard/relief" : "/dashboard/login";
    return NextResponse.redirect(dest);
  }

  if (pathname.startsWith("/dashboard/relief") && role !== "relief") {
    const dest = request.nextUrl.clone();
    dest.pathname = role === "officer" ? "/dashboard/officer" : "/dashboard/login";
    return NextResponse.redirect(dest);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*"],
};
