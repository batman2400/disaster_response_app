"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Home, Map, Plus, Shield, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePwa } from "./pwa-provider";

export function MobileBottomNav({
  activeRole,
  onRoleClick,
}: {
  activeRole?: string;
  onRoleClick?: () => void;
}) {
  const pathname = usePathname();
  const { pendingOfflineCount } = usePwa();

  const isHome = pathname === "/";
  const isMap = pathname.startsWith("/map");
  const isReport = pathname.startsWith("/report");
  const isSafe = pathname.startsWith("/safe");

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 pb-safe backdrop-blur-xl md:hidden shadow-lg"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {/* Home */}
        <Link
          href="/"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors touch-manipulation",
            isHome ? "text-brand" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Home className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-bold">Home</span>
        </Link>

        {/* Live Map */}
        <Link
          href="/map"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors touch-manipulation",
            isMap ? "text-brand" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Map className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-bold">Safe Map</span>
        </Link>

        {/* Center Emergency Report Button (Elevated) */}
        <div className="relative -top-3 flex flex-1 items-center justify-center">
          <Link
            href="/report"
            aria-label="Report Flood Hazard"
            className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand to-brand-indigo text-white shadow-lg shadow-blue-500/35 transition-transform active:scale-95 touch-manipulation"
          >
            <Plus className="h-7 w-7 stroke-[2.5]" />
            {pendingOfflineCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white shadow">
                {pendingOfflineCount}
              </span>
            ) : null}
          </Link>
        </div>

        {/* Family Safe */}
        <Link
          href="/safe"
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors touch-manipulation",
            isSafe ? "text-brand" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Users className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-bold">Family</span>
        </Link>

        {/* Role switch / Desk */}
        <button
          type="button"
          onClick={onRoleClick}
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors touch-manipulation",
            activeRole && activeRole !== "citizen" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Shield className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-bold">
            {activeRole === "crew" ? "Crew" : activeRole === "relief" ? "Relief" : "Role"}
          </span>
        </button>
      </div>
    </nav>
  );
}
