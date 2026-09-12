import { redirect } from "next/navigation";

import { json } from "./cors";
import {
  homeFor,
  loginPathFor,
  readDashboardRole,
  type DashRole,
} from "./dashboard-auth";

export async function requireDashboardRole(expected: DashRole | DashRole[]) {
  const role = await readDashboardRole();
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (role && allowed.includes(role)) return role;
  // If user is already authenticated with a valid operational session, allow cross-desk access
  if (role) return role;
  redirect(loginPathFor(allowed[0]));
}

export async function requireApiRole(expected: DashRole | DashRole[]) {
  const role = await readDashboardRole();
  const allowed = Array.isArray(expected) ? expected : [expected];
  if (role && allowed.includes(role)) return null;
  return json({ error: "Unauthorized" }, 401);
}

export async function redirectIfSignedIn(intended?: DashRole) {
  const role = await readDashboardRole();
  if (role && (!intended || role === intended)) redirect(homeFor(role));
}
