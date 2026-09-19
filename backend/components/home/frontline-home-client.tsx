"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Laptop,
  LifeBuoy,
  MapPin,
  PhoneCall,
  Shield,
  ShieldAlert,
  Waves,
} from "lucide-react";
import { RoleSegmentedSwitch, type FrontlineRole } from "./role-segmented-switch";
import { CitizenMobileView } from "./citizen-mobile-view";
import { CrewMobileView } from "./crew-mobile-view";
import { ReliefMobileView } from "./relief-mobile-view";
import { OfflineStatusBanner } from "./offline-status-banner";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { EmergencyBroadcastBanner } from "@/components/emergency-broadcast-banner";
import { HomeQuickActions } from "@/components/home-quick-actions";
import { usePwa } from "@/components/pwa-provider";
import { useI18n } from "@/lib/i18n/language-context";
import type { BroadcastAlert } from "@/lib/db";
import type { DashRole } from "@/lib/dashboard-auth";
import type { HazardRow, ShelterRow, WardRow } from "@/lib/types";
import { mapHazardRow, sortHazards, useLiveRows } from "@/lib/use-live";

interface FrontlineHomeClientProps {
  hazards: HazardRow[];
  wards: WardRow[];
  shelters: ShelterRow[];
  broadcastAlert: BroadcastAlert | null;
  signedInRole?: DashRole | null;
}

export function FrontlineHomeClient({
  hazards,
  wards,
  shelters,
  broadcastAlert,
  signedInRole,
}: FrontlineHomeClientProps) {
  const { isOnline } = usePwa();
  const { t } = useI18n();
  const { rows: liveHazards } = useLiveRows({
    table: "hazards",
    initial: hazards,
    mapRow: mapHazardRow,
    fallbackFetch: async () => {
      const res = await fetch("/api/hazards", { cache: "no-store" });
      if (!res.ok) return hazards;
      return (await res.json()) as HazardRow[];
    },
    sort: sortHazards,
  });

  // Role state: defaults to signedInRole or citizen
  const [activeRole, setActiveRole] = useState<FrontlineRole>(() => {
    if (signedInRole === "crew") return "crew";
    if (signedInRole === "relief") return "relief";
    return "citizen";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fender_frontline_role") as FrontlineRole | null;
      if (saved && (saved === "citizen" || saved === "crew" || saved === "relief")) {
        setActiveRole(saved);
      }
    }
  }, []);

  const handleRoleChange = (role: FrontlineRole) => {
    setActiveRole(role);
    if (typeof window !== "undefined") {
      localStorage.setItem("fender_frontline_role", role);
    }
  };

  const cycleRole = () => {
    const sequence: FrontlineRole[] = ["citizen", "crew", "relief"];
    const nextIdx = (sequence.indexOf(activeRole) + 1) % sequence.length;
    handleRoleChange(sequence[nextIdx]);
  };

  return (
    <div className="flex flex-1 flex-col pb-safe-nav">
      {/* 1. Emergency Broadcast Announcement Bar */}
      <EmergencyBroadcastBanner initialAlert={broadcastAlert} />

      {/* 2. Top Minimalist App Header */}
      <header className="mb-4 flex items-center justify-between gap-1.5 sm:gap-3 rounded-3xl border border-slate-200/80 bg-white/95 p-2.5 sm:p-4 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-blue-500/20">
            <img
              src="/logo.png"
              alt="Fender"
              className="h-5 w-5 sm:h-6 sm:w-6 rounded-lg bg-white object-contain"
            />
          </div>
          <div className="min-w-0 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-brand truncate">
                NDRRMS · CMC
              </span>
              <span
                className={`flex h-1.5 w-1.5 shrink-0 rounded-full ${
                  isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
            </div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 sm:text-lg flex items-center gap-1 whitespace-nowrap">
              <span>{t("brand_short")}</span>
              <span className="hidden min-[480px]:inline text-xs sm:text-sm font-extrabold text-slate-500">
                {t("brand_sub")}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Language Switcher & Emergency SOS */}
          <HomeQuickActions />

          {/* Track Reports Link - responsive text & padding to prevent curved screen cropping */}
          <Link
            href="/report/track"
            title={t("track_reports")}
            className="flex shrink-0 items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2 py-1.5 sm:px-2.5 sm:py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 transition-colors shadow-2xs"
          >
            <Activity className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="hidden sm:inline">{t("track_reports")}</span>
          </Link>

          {/* Council Desk Link (Desktop discrete link) */}
          <Link
            href="/dashboard/login?role=officer"
            title={t("command_console")}
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 shrink-0"
          >
            <Laptop className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span className="hidden md:inline">{t("command_console")}</span>
          </Link>
        </div>
      </header>

      {/* 3. Offline / Sync Status Banner */}
      <OfflineStatusBanner />

      {/* 4. Frontline Role Switcher (Citizens | Field Crew | Relief Desk) */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            {t("operations_view")}
          </span>
          <span className="text-[11px] font-extrabold text-brand">
            {activeRole === "citizen"
              ? t("view_public_evac")
              : activeRole === "crew"
              ? t("view_crew_queue")
              : t("view_relief_desk")}
          </span>
        </div>
        <RoleSegmentedSwitch activeRole={activeRole} onChange={handleRoleChange} />
      </div>

      {/* 5. Dynamic Role Cockpit */}
      <main className="flex-1">
        {activeRole === "citizen" ? (
          <CitizenMobileView shelters={shelters} hazards={liveHazards} wards={wards} />
        ) : activeRole === "crew" ? (
          <CrewMobileView hazards={liveHazards} wards={wards} />
        ) : (
          <ReliefMobileView shelters={shelters} />
        )}
      </main>

      {/* 6. Desktop / Tablet Expanded Quick Links */}
      <div className="mt-8 hidden rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs lg:block">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900">
              {t("ops_network_title")}
            </h4>
            <p className="text-xs text-slate-500">
              {t("ops_network_hint")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/map"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand"
            >
              <span>{t("fullscreen_gis")}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <Link
              href="/dashboard/login?role=officer"
              className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800"
            >
              <Laptop className="h-3.5 w-3.5 text-blue-400" />
              <span>{t("officer_command_desk")}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 7. Footer */}
      <footer className="mt-8 border-t border-slate-200/80 pt-5 text-center text-xs text-slate-400">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span>{t("ndrrms_full")}</span>
            <span>·</span>
            <span>{t("cmc_full")}</span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <Link
              href="/dashboard/login?role=officer"
              className="font-bold text-slate-500 hover:text-brand"
            >
              {t("staff_portal")}
            </Link>
            <span>·</span>
            <span className="font-semibold text-emerald-600">{t("pwa_offline_enabled")}</span>
          </div>
        </div>
      </footer>

      {/* 8. Ergonomic Mobile Bottom Nav Dock */}
      <MobileBottomNav activeRole={activeRole} onRoleClick={cycleRole} />
    </div>
  );
}
