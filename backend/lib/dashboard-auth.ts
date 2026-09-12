import { createHmac, timingSafeEqual } from "crypto";

export const COOKIE_NAME = "dash_session";
export const SESSION_MAX_AGE = 60 * 60 * 12;

export type DashRole = "officer" | "relief";

export function getDashboardSecret() {
  return process.env.DASHBOARD_SECRET || "dev-dashboard-secret";
}

function hmac(payload: string) {
  return createHmac("sha256", getDashboardSecret()).update(payload).digest("hex");
}

export function signSession(role: DashRole, exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE) {
  const payload = `${role}.${exp}`;
  return `${payload}.${hmac(payload)}`;
}

export function parseSession(value: string | undefined | null): DashRole | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [role, expStr, sig] = parts;
  if (role !== "officer" && role !== "relief") return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Math.floor(Date.now() / 1000) > exp) return null;
  const expected = hmac(`${role}.${exp}`);
  try {
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return role;
}

export function passwordFor(role: DashRole) {
  return role === "officer"
    ? process.env.DASHBOARD_OFFICER_PASSWORD
    : process.env.DASHBOARD_RELIEF_PASSWORD;
}

export function passwordsMatch(provided: unknown, expected: string | undefined) {
  if (typeof provided !== "string" || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
