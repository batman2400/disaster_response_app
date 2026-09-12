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
    if (!role) {
      return redirectTo(request, "/dashboard/login", "?role=officer");
    }
    if (role !== "officer") {
      const dest = request.nextUrl.clone();
      const response = NextResponse.redirect(dest);
      response.cookies.set(COOKIE_NAME, signSession("officer"), cookieOptions());
      return response;
    }
    return NextResponse.next();
  }

  // Protected operational route: Relief Logistics Desk
  if (pathname.startsWith("/dashboard/relief")) {
    if (!role) {
      return redirectTo(request, "/dashboard/login", "?role=relief");
    }
    if (role !== "relief") {
      const dest = request.nextUrl.clone();
      const response = NextResponse.redirect(dest);
      response.cookies.set(COOKIE_NAME, signSession("relief"), cookieOptions());
      return response;
    }
    return NextResponse.next();
  }

  // Protected operational route: Admin telemetry & pipeline diagnostics
  if (pathname.startsWith("/dashboard/admin")) {
    if (!role) {
      return redirectTo(request, "/dashboard/login", "?role=officer");
    }
    if (role !== "officer") {
      const dest = request.nextUrl.clone();
      const response = NextResponse.redirect(dest);
      response.cookies.set(COOKIE_NAME, signSession("officer"), cookieOptions());
      return response;
    }
    return NextResponse.next();
  }

  // Protected operational route: Field Crew Queue
  if (pathname === "/crew" || pathname.startsWith("/crew/")) {
    if (!role) {
      return redirectTo(request, "/crew/login");
    }
    if (role !== "crew") {
      const dest = request.nextUrl.clone();
      const response = NextResponse.redirect(dest);
      response.cookies.set(COOKIE_NAME, signSession("crew"), cookieOptions());
      return response;
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/crew", "/crew/:path*"],
};
