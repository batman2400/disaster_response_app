import { NextResponse } from "next/server";

import {
  COOKIE_NAME,
  cookieOptions,
  homeFor,
  passwordFor,
  passwordsMatch,
  signSession,
  type DashRole,
} from "@/lib/dashboard-auth";

const ROLES: DashRole[] = ["officer", "relief", "crew"];

export async function POST(request: Request) {
  let body: { role?: string; password?: string };
  try {
    body = (await request.json()) as { role?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = ROLES.includes(body.role as DashRole) ? (body.role as DashRole) : null;
  if (!role) {
    return NextResponse.json({ error: "Choose a valid desk" }, { status: 400 });
  }

  if (!passwordsMatch(body.password, passwordFor(role))) {
    return NextResponse.json({ error: "Invalid password for that role" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, role, next: homeFor(role) });
  response.cookies.set(COOKIE_NAME, signSession(role), cookieOptions());
  return response;
}
