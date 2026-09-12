import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { COOKIE_NAME, homeFor, parseSession } from "./lib/dashboard-auth";

function redirectTo(request: NextRequest, pathname: string, search = "") {
  const dest = request.nextUrl.clone();
  dest.pathname = pathname;
  dest.search = search;
  return NextResponse.redirect(dest);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = parseSession(request.cookies.get(COOKIE_NAME)?.value);

  if (pathname === "/dashboard/login" || pathname === "/crew/login") {
    if (role) return redirectTo(request, homeFor(role));
    return NextResponse.next();
  }

  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return redirectTo(request, role ? homeFor(role) : "/dashboard/login", role ? "" : "?role=officer");
  }

  if (pathname.startsWith("/dashboard/officer") && role !== "officer") {
    return redirectTo(
      request,
      role ? homeFor(role) : "/dashboard/login",
      role ? "" : "?role=officer",
    );
  }

  if (pathname.startsWith("/dashboard/relief") && role !== "relief") {
    return redirectTo(
      request,
      role ? homeFor(role) : "/dashboard/login",
      role ? "" : "?role=relief",
    );
  }

  if (pathname.startsWith("/dashboard/admin") && role !== "officer") {
    return redirectTo(
      request,
      role ? homeFor(role) : "/dashboard/login",
      role ? "" : "?role=officer",
    );
  }

  if ((pathname === "/crew" || pathname.startsWith("/crew/")) && role !== "crew") {
    return redirectTo(request, role ? homeFor(role) : "/crew/login");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/crew", "/crew/:path*"],
};
