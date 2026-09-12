import { NextResponse } from "next/server";

import {
  COOKIE_NAME,
  cookieOptions,
  homeFor,
  loginPathFor,
  readDashboardRole,
  signSession,
  type DashRole,
} from "@/lib/dashboard-auth";

const ALLOWED_ROLES: DashRole[] = ["officer", "relief", "crew"];

export async function POST(request: Request) {
  const currentRole = await readDashboardRole();

  let body: { role?: string };
  try {
    body = (await request.json()) as { role?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const targetRole = ALLOWED_ROLES.includes(body.role as DashRole) ? (body.role as DashRole) : null;
  if (!targetRole) {
    return NextResponse.json({ error: "Invalid operational role requested" }, { status: 400 });
  }

  // If user is not signed in to any role, require login for the target role
  if (!currentRole) {
    return NextResponse.json(
      { ok: false, error: "Authentication required", next: loginPathFor(targetRole) },
      { status: 401 }
    );
  }

  // Set the new role session cookie
  const response = NextResponse.json({
    ok: true,
    previousRole: currentRole,
    role: targetRole,
    next: homeFor(targetRole),
  });

  response.cookies.set(COOKIE_NAME, signSession(targetRole), cookieOptions());
  return response;
}
