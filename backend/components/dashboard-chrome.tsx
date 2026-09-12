import { ArrowLeft, Bell, Bug, CloudRain, LogOut, Map } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import type { DashRole } from "@/lib/dashboard-auth";
import { ROLE_THEME } from "@/lib/role-theme";

const TITLES = {
  officer: { title: "Command Control", desk: "Council Officer Desk" },
  relief: { title: "Relief Desk", desk: "Shelter Logistics" },
  crew: { title: "Field Crew", desk: "Resolution Queue" },
} as const;

export function DashboardChrome({ role }: { role: Exclude<DashRole, "crew"> }) {
  const copy = TITLES[role];
  const theme = ROLE_THEME[role];
  const Icon = theme.icon;

  return (
    <header
      className={cn(
        "z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 border-t-4 bg-white px-4 shadow-sm sm:px-6",
        theme.accent,
      )}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Link
          href="/"
          title="Return to Home Portal"
          className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95 sm:px-3"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md",
            theme.iconBg,
            theme.glow,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-extrabold leading-tight text-slate-900 sm:text-lg">{copy.title}</h1>
            <span
              className={cn(
                "hidden shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide sm:inline-flex",
                theme.chipBg,
                theme.chipText,
              )}
            >
              {theme.label}
            </span>
          </div>
          <p className="hidden text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:block">{copy.desk}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          href="/map"
          title="View Live Public Hazard & Evacuation Map"
          className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-brand sm:px-3"
        >
          <Map className="h-4 w-4" />
          <span className="hidden md:inline">Public map</span>
        </Link>
        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 xl:flex">
          <div className="relative flex h-2 w-2 items-center justify-center">
            <span className="absolute h-full w-full animate-ping rounded-full bg-status-emerald opacity-50" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-status-emerald" />
          </div>
          <span className="text-xs font-bold text-slate-600">Pipeline Active</span>
        </div>
        {role === "officer" ? (
          <>
            <Link
              href="/dashboard/admin/weather"
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 sm:px-3"
            >
              <CloudRain className="h-4 w-4" />
              <span className="hidden xl:inline">Weather replay</span>
            </Link>
            <Link
              href="/dashboard/admin/pipeline"
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 sm:px-3"
            >
              <Bug className="h-4 w-4" />
              <span className="hidden xl:inline">Pipeline audit</span>
            </Link>
          </>
        ) : null}
        <span className="hidden h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 sm:flex">
          <Bell className="h-4 w-4" />
        </span>
        <Link
          href="/"
          className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 sm:px-3"
        >
          <span className="hidden sm:inline">Switch role</span>
          <span className="sm:hidden">Roles</span>
        </Link>
        <form action="/api/dashboard/logout" method="post">
          <button
            type="submit"
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 sm:px-3"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
