"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bed,
  ChevronDown,
  ChevronUp,
  Droplet,
  HeartPulse,
  LifeBuoy,
  PhoneCall,
  QrCode,
  Search,
  ShieldAlert,
  Smartphone,
  Users,
  Waves,
  Zap,
} from "lucide-react";
import { OfflineSosModal } from "@/components/offline-sos-modal";
import { useI18n, type I18nKey } from "@/lib/i18n/language-context";
import type { HazardRow, ShelterRow, WardRow } from "@/lib/types";

interface CitizenMobileViewProps {
  shelters: ShelterRow[];
  hazards: HazardRow[];
  wards: WardRow[];
}

export function CitizenMobileView({ shelters, hazards, wards }: CitizenMobileViewProps) {
  const { t } = useI18n();
  const [offlineSosOpen, setOfflineSosOpen] = useState(false);
  const [activeGuide, setActiveGuide] = useState<number | null>(null);

  // Compute live operational metrics
  const activeHazards = hazards.filter((h) => h.status !== "RESOLVED");
  const roadBlocks = activeHazards.filter((h) => h.is_road_blocked).length;
  const totalBeds = shelters.reduce((acc, s) => acc + (s.total_beds || 0), 0);
  const occupiedBeds = shelters.reduce((acc, s) => acc + (s.occupied_beds || 0), 0);
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);

  // Top high-risk ward
  const highRiskWards = wards.filter(
    (w) => w.river_level_pct > 70 || w.status === "CRITICAL" || w.status === "WATCH"
  );

  const GUIDES: { titleKey: I18nKey; bodyKey: I18nKey; icon: typeof Zap; color: string }[] = [
    {
      titleKey: "guide_electrical_title",
      bodyKey: "guide_electrical_body",
      icon: Zap,
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      titleKey: "guide_water_title",
      bodyKey: "guide_water_body",
      icon: Droplet,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      titleKey: "guide_grabbag_title",
      bodyKey: "guide_grabbag_body",
      icon: LifeBuoy,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      titleKey: "guide_wildlife_title",
      bodyKey: "guide_wildlife_body",
      icon: AlertTriangle,
      color: "text-rose-600 bg-rose-50 border-rose-200",
    },
  ];

  return (
    <div className="flex flex-col gap-5 animate-pop">
      {/* 1. Emergency 1-Tap Hotline Strip */}
      <div className="rounded-3xl border border-rose-200 bg-gradient-to-r from-rose-50 via-rose-100/60 to-red-50 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-600" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-800">
              {t("emergency_lifeline")}
            </span>
          </div>
          <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] font-bold text-rose-700">
            {t("toll_free")}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <a
            href="tel:117"
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-rose-600 px-3 py-2.5 text-xs font-black text-white shadow-sm transition-transform active:scale-95 touch-manipulation"
          >
            <ShieldAlert className="h-4 w-4" />
            <span>{t("call_dmc")}</span>
          </a>

          <a
            href="tel:1990"
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-300 bg-white px-3 py-2.5 text-xs font-extrabold text-rose-800 shadow-xs transition-transform active:scale-95 touch-manipulation"
          >
            <HeartPulse className="h-4 w-4 text-emerald-600" />
            <span>{t("ambulance")}</span>
          </a>

          <a
            href="tel:119"
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-100/60 px-3 py-2.5 text-xs font-extrabold text-rose-900 transition-transform active:scale-95 touch-manipulation"
          >
            <PhoneCall className="h-4 w-4 text-blue-600" />
            <span>{t("police")}</span>
          </a>

          <button
            type="button"
            onClick={() => setOfflineSosOpen(true)}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-xs font-extrabold text-indigo-800 transition-transform active:scale-95 touch-manipulation"
          >
            <QrCode className="h-4 w-4 text-indigo-600" />
            <span>{t("offline_qr_sos")}</span>
          </button>
        </div>
      </div>

      {/* 2. Citizen Submissions Tracking Bay */}
      <div className="flex items-center justify-between rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-brand">
            <Search className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-900">{t("track_incident_reports")}</h4>
            <p className="text-[11px] text-slate-500">{t("track_incident_hint")}</p>
          </div>
        </div>
        <Link
          href="/report/track"
          className="flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-extrabold text-brand transition-colors hover:bg-blue-100 active:scale-95 touch-manipulation"
        >
          <span>{t("track_now")}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 3. Frontline Action Grid (2x2 Mobile, 4-Col Desktop) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Report Hazard */}
        <Link
          href="/report"
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-700 p-4.5 text-white shadow-md transition-transform active:scale-[0.98] sm:p-5"
        >
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-100">
              {t("instant_triage")}
            </span>
            <h3 className="mt-1.5 text-base font-black tracking-tight sm:text-lg">
              {t("report_hazard")}
            </h3>
            <p className="mt-0.5 text-xs text-blue-100 leading-snug">
              {t("report_hazard_hint")}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-extrabold text-white">
            <span>{t("submit_now")}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Card 2: Safe Route & Live Map */}
        <Link
          href="/map"
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-4.5 shadow-xs transition-transform hover:border-brand active:scale-[0.98] sm:p-5"
        >
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
              <Waves className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-800">
              {t("blocked_routes", { count: roadBlocks })}
            </span>
            <h3 className="mt-1.5 text-base font-black tracking-tight text-slate-900 sm:text-lg">
              {t("safe_evac_map")}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 leading-snug">
              {t("safe_evac_hint")}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-extrabold text-brand">
            <span>{t("explore_map")}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Card 3: Find Nearest Shelter */}
        <Link
          href="/supplies"
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-4.5 shadow-xs transition-transform hover:border-emerald-500 active:scale-[0.98] sm:p-5"
        >
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Bed className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-800">
              {t("free_beds_count", { count: availableBeds })}
            </span>
            <h3 className="mt-1.5 text-base font-black tracking-tight text-slate-900 sm:text-lg">
              {t("open_shelters")}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 leading-snug">
              {t("shelters_ready", { count: shelters.length })}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-extrabold text-emerald-700">
            <span>{t("view_capacity")}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>

        {/* Card 4: Family Safety Check-In */}
        <Link
          href="/safe"
          className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-4.5 shadow-xs transition-transform hover:border-sky-500 active:scale-[0.98] sm:p-5"
        >
          <div>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
              <Users className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-sky-800">
              {t("reunification")}
            </span>
            <h3 className="mt-1.5 text-base font-black tracking-tight text-slate-900 sm:text-lg">
              {t("im_safe_portal")}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 leading-snug">
              {t("im_safe_hint")}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-extrabold text-sky-700">
            <span>{t("check_in")}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>

      {/* 3. Kelani River Basin Pulse Indicator */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Waves className="h-5 w-5 text-brand" />
            <h4 className="text-sm font-black text-slate-900">
              {t("kelani_live_pulse")}
            </h4>
          </div>
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
            {t("minor_flood_watch")}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-600">
          <span>{t("nagalagam_gauge")}</span>
          <span className="text-amber-600">{t("flood_threshold")}</span>
        </div>

        {/* Gauge bar */}
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500"
            style={{ width: "72%" }}
          />
        </div>

        <p className="mt-2 text-[11px] text-slate-500">
          {highRiskWards.length > 0
            ? t("pulse_monitor", { wards: highRiskWards.map((w) => w.name).join(", ") })
            : t("pulse_all_clear")}
        </p>
      </div>

      {/* 4. Offline First-Aid & Flood Readiness Guide (Accordion) */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900">
              {t("offline_first_aid")}
            </h4>
            <p className="text-[11px] text-slate-500">
              {t("offline_first_aid_hint")}
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            {t("cached")}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {GUIDES.map((item, idx) => {
            const Icon = item.icon;
            const isOpen = activeGuide === idx;
            return (
              <div
                key={idx}
                className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/70 transition-all"
              >
                <button
                  type="button"
                  onClick={() => setActiveGuide(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-3.5 text-left text-xs font-extrabold text-slate-800 touch-manipulation"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-xl border ${item.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span>{t(item.titleKey)}</span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                {isOpen ? (
                  <div className="px-4 pb-3.5 pt-1 text-[12px] leading-relaxed text-slate-600 border-t border-slate-200/50">
                    {t(item.bodyKey)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Offline SOS Modal */}
      <OfflineSosModal open={offlineSosOpen} onClose={() => setOfflineSosOpen(false)} />
    </div>
  );
}
