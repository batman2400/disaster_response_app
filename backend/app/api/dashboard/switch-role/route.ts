import { NextResponse } from "next/server";

import {
  COOKIE_NAME,
  cookieOptions,
  homeFor,
  parseSession,
  passwordFor,
  passwordsMatch,
  signSession,
  type DashRole,
} from "@/lib/dashboard-auth";

const ALLOWED_ROLES: DashRole[] = ["officer", "relief", "crew"];

export async function POST(request: Request) {
  let body: { role?: string; password?: string };
  try {
    body = (await request.json()) as { role?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const targetRole = ALLOWED_ROLES.includes(body.role as DashRole) ? (body.role as DashRole) : null;
  if (!targetRole) {
    return NextResponse.json({ error: "Invalid operational role requested" }, { status: 400 });
  }

  // Strictly require the desk password for the requested target role
  if (!body.password || typeof body.password !== "string") {
    return NextResponse.json(
      { error: "Password is required to switch operational desks" },
      { status: 400 },
    );
  }

  const expectedPassword = passwordFor(targetRole);
  if (!passwordsMatch(body.password, expectedPassword)) {
    return NextResponse.json(
      { error: "Invalid password for that role" },
      { status: 401 },
    );
  }

  let currentRole: DashRole | null = null;
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
    if (match) {
      currentRole = parseSession(decodeURIComponent(match[1]));
    }
  } catch {
    currentRole = null;
  }

  // Set the new role session cookie upon successful password verification
  const response = NextResponse.json({
    ok: true,
    previousRole: currentRole,
    role: targetRole,
    next: homeFor(targetRole),
  });

  response.cookies.set(COOKIE_NAME, signSession(targetRole), cookieOptions());
  return response;
}
