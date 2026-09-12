import { redirect } from "next/navigation";

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
  redirect(role ? homeFor(role) : loginPathFor(allowed[0]));
}

export async function redirectIfSignedIn() {
  const role = await readDashboardRole();
  if (role) redirect(homeFor(role));
}
