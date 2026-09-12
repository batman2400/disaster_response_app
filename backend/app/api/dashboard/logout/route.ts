import { NextResponse } from "next/server";

import { COOKIE_NAME } from "@/lib/dashboard-auth";

export async function POST(request: Request) {
  const dest = new URL("/dashboard/login", request.url);
  const response = NextResponse.redirect(dest, 303);
  response.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return response;
}
