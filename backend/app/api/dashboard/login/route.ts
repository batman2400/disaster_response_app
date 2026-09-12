import { NextResponse } from "next/server";

import {
  COOKIE_NAME,
  cookieOptions,
  passwordFor,
  passwordsMatch,
  signSession,
  type DashRole,
} from "@/lib/dashboard-auth";

export async function POST(request: Request) {
  let body: { role?: string; password?: string };
  try {
    body = (await request.json()) as { role?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = body.role === "officer" || body.role === "relief" ? (body.role as DashRole) : null;
  if (!role) {
    return NextResponse.json({ error: "Choose Officer or Relief" }, { status: 400 });
  }

  if (!passwordsMatch(body.password, passwordFor(role))) {
    return NextResponse.json({ error: "Invalid password for that role" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, role });
  response.cookies.set(COOKIE_NAME, signSession(role), cookieOptions());
  return response;
}
