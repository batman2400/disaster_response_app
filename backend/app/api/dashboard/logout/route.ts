import { NextResponse } from "next/server";

import { COOKIE_NAME, cookieOptions } from "@/lib/dashboard-auth";

export async function POST(request: Request) {
  const dest = new URL("/", request.url);
  const response = NextResponse.redirect(dest, 303);
  response.cookies.set(COOKIE_NAME, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}
