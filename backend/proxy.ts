import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  COOKIE_NAME,
  cookieOptions,
  homeFor,
  parseSession,
  signSession,
} from "./lib/dashboard-auth";

function redirectTo(request: NextRequest, pathname: string, search = "") {
  const dest = request.nextUrl.clone();
  dest.pathname = pathname;
  dest.search = search;
  return NextResponse.redirect(dest);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = parseSession(request.cookies.get(COOKIE_NAME)?.value);

  if (pathname === "/dashboard/login") {
    const intended = request.nextUrl.searchParams.get("role") === "relief" ? "relief" : "officer";
    const isSwitch = request.nextUrl.searchParams.get("switch") === "1";
    if (role === intended && !isSwitch) return redirectTo(request, homeFor(role));
    return NextResponse.next();
  }

  if (pathname === "/crew/login") {
    const isSwitch = request.nextUrl.searchParams.get("switch") === "1";
    if (role === "crew" && !isSwitch) return redirectTo(request, homeFor(role));
    return NextResponse.next();
  }

  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return redirectTo(request, role ? homeFor(role) : "/dashboard/login", role ? "" : "?role=officer");
  }

  // Protected operational route: Officer Command Control
  if (pathname.startsWith("/dashboard/officer")) {
    if (role !== "officer") {
      return redirectTo(request, "/dashboard/login", "?role=officer&switch=1");
    }
    return NextResponse.next();
  }

  // Protected operational route: Relief Logistics Desk
  if (pathname.startsWith("/dashboard/relief")) {
    if (role !== "relief") {
      return redirectTo(request, "/dashboard/login", "?role=relief&switch=1");
    }
    return NextResponse.next();
  }

  // Protected operational route: Admin telemetry & pipeline diagnostics
  if (pathname.startsWith("/dashboard/admin")) {
    if (role !== "officer") {
      return redirectTo(request, "/dashboard/login", "?role=officer&switch=1");
    }
    return NextResponse.next();
  }

  // Protected operational route: Field Crew Queue
  if (pathname === "/crew" || pathname.startsWith("/crew/")) {
    if (role !== "crew") {
      return redirectTo(request, "/crew/login", "?switch=1");
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/crew", "/crew/:path*"],
};
