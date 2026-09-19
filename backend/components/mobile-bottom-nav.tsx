"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Map, Plus, Shield, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/language-context";
import { usePwa } from "./pwa-provider";

export function MobileBottomNav({
  activeRole,
  onRoleClick,
}: {
  activeRole?: string;
  onRoleClick?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { pendingOfflineCount } = usePwa();

  const isHome = pathname === "/";
  const isMap = pathname.startsWith("/map");
  const isSafe = pathname.startsWith("/safe");

  // Bulletproof navigation handler
  const handleHomeClick = (e: React.MouseEvent) => {
    if (isHome) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Ensure navigation always completes even if client transitions hang
      setTimeout(() => {
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }, 300);
    }
  };

  const handleRoleClick = (e: React.MouseEvent) => {
    if (onRoleClick) {
      onRoleClick();
    } else {
      router.push("/");
      setTimeout(() => {
        if (window.location.pathname !== "/") {
          window.location.href = "/";
        }
      }, 300);
    }
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/90 bg-white/95 pb-safe backdrop-blur-xl md:hidden shadow-lg pointer-events-auto"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {/* Home */}
        <Link
          href="/"
          prefetch={true}
          onClick={handleHomeClick}
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors touch-manipulation active:scale-95",
            isHome ? "text-brand" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Home className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-extrabold">{t("nav_home")}</span>
        </Link>

        {/* Live Map */}
        <Link
          href="/map"
          prefetch={true}
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors touch-manipulation active:scale-95",
            isMap ? "text-brand" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Map className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-extrabold">{t("nav_safe_map")}</span>
        </Link>

        {/* Center Emergency Report Button (Elevated) */}
        <div className="relative -top-3 flex flex-1 items-center justify-center">
          <Link
            href="/report"
            prefetch={true}
            aria-label="Report Flood Hazard"
            className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand to-brand-indigo text-white shadow-lg shadow-blue-500/35 transition-transform active:scale-90 touch-manipulation"
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
          prefetch={true}
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors touch-manipulation active:scale-95",
            isSafe ? "text-brand" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Users className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-extrabold">{t("nav_family")}</span>
        </Link>

        {/* Role switch / Desk */}
        <button
          type="button"
          onClick={handleRoleClick}
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-1 transition-colors touch-manipulation active:scale-95",
            activeRole && activeRole !== "citizen" ? "text-indigo-600" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Shield className="h-5 w-5" />
          <span className="mt-1 text-[10px] font-extrabold">
            {activeRole === "crew" ? t("nav_crew") : activeRole === "relief" ? t("nav_relief") : t("nav_role")}
          </span>
        </button>
      </div>
    </nav>
  );
}
