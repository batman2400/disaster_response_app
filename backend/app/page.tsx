import Link from "next/link";
import { Box, ChevronRight, HardHat, Laptop, Map, Smartphone } from "lucide-react";

import { PublicShell } from "@/components/public-shell";
import { homeFor, readDashboardRole } from "@/lib/dashboard-auth";
import { ROLE_THEME } from "@/lib/role-theme";

const roles = [
  {
    href: "/report",
    title: "Citizen",
    blurb: "Report hazards & view live maps",
    icon: Smartphone,
  },
  {
    href: "/dashboard/login?role=officer",
    title: "Council Officer",
    blurb: "Triage reports & manage dispatch",
    icon: Laptop,
  },
  {
    href: "/crew/login",
    title: "Field Crew",
    blurb: "Receive tasks & submit closures",
    icon: HardHat,
  },
  {
    href: "/dashboard/login?role=relief",
    title: "Relief Desk",
    blurb: "Manage shelters & supplies",
    icon: Box,
  },
] as const;

export default async function Home() {
  const signedIn = await readDashboardRole();
  const sessionTheme = signedIn ? ROLE_THEME[signedIn] : null;

  return (
    <PublicShell>
      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-10 pt-10 lg:px-12 lg:py-12">
        <div className="lg:mb-10 lg:flex lg:items-start lg:justify-between lg:gap-10">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-blue-500/30">
              <img src="/logo.png" alt="Fender" className="h-8 w-8 rounded-lg bg-white object-contain" />
            </div>
            <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-slate-900 lg:text-5xl">Fender</h1>
            <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-500 lg:text-base">
              Colombo Flood & Hazard Response — report, triage, and clear incidents in real time.
            </p>
          </div>

          <div className="mt-6 flex items-start gap-4 rounded-2xl border border-emerald-100 bg-status-emerald-bg p-4 lg:mt-0 lg:w-80 lg:shrink-0">
            <div className="relative mt-1 flex h-3 w-3 items-center justify-center">
              <span className="absolute h-full w-full animate-ping rounded-full bg-status-emerald opacity-40" />
              <span className="relative h-2 w-2 rounded-full bg-status-emerald" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-900">System Live</h3>
              <p className="mt-0.5 text-xs font-medium text-emerald-700">
                Connected to production. Real-time updates active.
              </p>
            </div>
          </div>
        </div>

        {signedIn && sessionTheme ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-slate-600">
              Signed in as <span className={sessionTheme.chipText}>{sessionTheme.label}</span>
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={homeFor(signedIn)}
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
              >
                Open desk
              </Link>
              <form action="/api/dashboard/logout" method="post">
                <button
                  type="submit"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        ) : null}

        <div className="mt-8 mb-4 flex items-end justify-between lg:mt-0">
          <h2 className="text-lg font-bold text-slate-900 lg:text-xl">Select User Role</h2>
          <Link
            href="/map"
            className="hidden items-center gap-2 text-sm font-bold text-brand hover:text-brand-indigo lg:inline-flex"
          >
            <Map className="h-4 w-4" />
            Open public map
          </Link>
        </div>

        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Link
                key={role.title}
                href={role.href}
                className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-brand hover:shadow-md active:scale-[0.98] lg:p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-colors group-hover:bg-brand-light group-hover:text-brand lg:h-14 lg:w-14">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-slate-900 lg:text-lg">{role.title}</h3>
                  <p className="mt-1 text-xs font-medium text-slate-500 lg:text-sm">{role.blurb}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-brand" />
              </Link>
            );
          })}
        </div>

        <Link
          href="/map"
          className="mt-6 block text-center text-sm font-bold text-brand hover:text-brand-indigo lg:hidden"
        >
          Open public map
        </Link>
        <p className="mt-6 mb-6 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
          NDRRMS · Colombo · Build 2.0
        </p>
      </div>
    </PublicShell>
  );
}
