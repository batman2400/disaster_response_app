import { cookies } from "next/headers";
import type { Metadata } from "next";

import { COOKIE_NAME, parseSession } from "@/lib/dashboard-auth";

import "./dashboard.css";

export const metadata: Metadata = {
  title: "Staff dashboard · Fender",
};

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const jar = await cookies();
  const role = parseSession(jar.get(COOKIE_NAME)?.value);

  return (
    <div className="dash">
      {role ? (
        <header className="dash-header">
          <div className="dash-brand">
            <img className="dash-logo" src="/logo.png" alt="Fender" />
            <div>
              <p className="dash-kicker">FENDER</p>
              <h1>{role === "officer" ? "Council Officer" : "Relief Coordinator"}</h1>
            </div>
          </div>
          <nav className="dash-nav">
            <form action="/api/dashboard/logout" method="post">
              <button type="submit">Log out</button>
            </form>
          </nav>
        </header>
      ) : null}
      {children}
    </div>
  );
}
