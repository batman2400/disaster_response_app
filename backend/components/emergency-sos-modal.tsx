"use client";

import {
  AlertCircle,
  AlertTriangle,
  Ambulance,
  BookOpen,
  CheckCircle2,
  Droplet,
  Flame,
  Hospital,
  PhoneCall,
  ShieldAlert,
  Sparkles,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Modal } from "./ui/modal";
import { useI18n, type I18nKey } from "@/lib/i18n/language-context";

const HOTLINES: {
  number: string;
  display?: string;
  nameKey: I18nKey;
  descKey: I18nKey;
  icon: typeof ShieldAlert;
  badge: string;
  callBtn: string;
  priority?: boolean;
}[] = [
  {
    number: "117",
    nameKey: "hotline_dmc_name",
    descKey: "hotline_dmc_desc",
    icon: ShieldAlert,
    badge: "bg-rose-50 text-rose-600 border-rose-200",
    callBtn: "bg-rose-600 hover:bg-rose-700 text-white",
    priority: true,
  },
  {
    number: "1990",
    nameKey: "hotline_1990_name",
    descKey: "hotline_1990_desc",
    icon: Ambulance,
    badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
    callBtn: "bg-emerald-600 hover:bg-emerald-700 text-white",
    priority: true,
  },
  {
    number: "119",
    nameKey: "hotline_119_name",
    descKey: "hotline_119_desc",
    icon: PhoneCall,
    badge: "bg-blue-50 text-blue-600 border-blue-200",
    callBtn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    number: "110",
    nameKey: "hotline_110_name",
    descKey: "hotline_110_desc",
    icon: Flame,
    badge: "bg-amber-50 text-amber-600 border-amber-200",
    callBtn: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  {
    number: "1987",
    nameKey: "hotline_1987_name",
    descKey: "hotline_1987_desc",
    icon: Zap,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    callBtn: "bg-slate-900 hover:bg-black text-white",
  },
  {
    number: "0112670002",
    display: "011-2670002",
    nameKey: "hotline_cmc_name",
    descKey: "hotline_cmc_desc",
    icon: PhoneCall,
    badge: "bg-indigo-50 text-indigo-600 border-indigo-200",
    callBtn: "bg-indigo-600 hover:bg-indigo-700 text-white",
  },
  {
    number: "0112691095",
    display: "011-2691095",
    nameKey: "hotline_redcross_name",
    descKey: "hotline_redcross_desc",
    icon: ShieldAlert,
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    callBtn: "bg-rose-700 hover:bg-rose-800 text-white",
  },
  {
    number: "0112696211",
    display: "011-2696211",
    nameKey: "hotline_nhsl_name",
    descKey: "hotline_nhsl_desc",
    icon: Hospital,
    badge: "bg-teal-50 text-teal-700 border-teal-200",
    callBtn: "bg-teal-700 hover:bg-teal-800 text-white",
  },
];

const SURVIVAL_GUIDELINES: { icon: typeof Zap; titleKey: I18nKey; pointKeys: I18nKey[] }[] = [
  {
    icon: Zap,
    titleKey: "survival_electrical_title",
    pointKeys: ["survival_electrical_1", "survival_electrical_2", "survival_electrical_3"],
  },
  {
    icon: Droplet,
    titleKey: "survival_water_title",
    pointKeys: ["survival_water_1", "survival_water_2", "survival_water_3"],
  },
  {
    icon: AlertTriangle,
    titleKey: "survival_vehicle_title",
    pointKeys: ["survival_vehicle_1", "survival_vehicle_2", "survival_vehicle_3"],
  },
  {
    icon: CheckCircle2,
    titleKey: "survival_gobag_title",
    pointKeys: ["survival_gobag_1", "survival_gobag_2", "survival_gobag_3"],
  },
];

export function EmergencySosModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"hotlines" | "guide">("hotlines");

  return (
    <Modal open={open} onClose={onClose} className="sm:max-w-xl">
      <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
        {/* Header (shrink-0) */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/30">
              <ShieldAlert className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">{t("sos_hub_title")}</h3>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                  {t("sos_active_247")}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                {t("sos_hub_subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher (shrink-0) */}
        <div className="shrink-0 flex border-b border-slate-100 bg-slate-50/70 px-4 sm:px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("hotlines")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "hotlines"
                ? "border-rose-500 text-rose-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <PhoneCall className="h-3.5 w-3.5" />
            {t("verified_hotlines")}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("guide")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
              activeTab === "guide"
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {t("flood_survival_protocol")}
          </button>
        </div>

        {/* Tab Content (flex-1 min-h-0) */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 sm:p-6">
          {activeTab === "hotlines" ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 text-xs font-semibold leading-relaxed text-rose-900">
                <strong className="font-extrabold">{t("life_threat_warning")}</strong>
              </div>

              {HOTLINES.map((hotline) => {
                const Icon = hotline.icon;
                return (
                  <div
                    key={hotline.number}
                    className={`flex items-center justify-between gap-4 rounded-2xl border bg-white p-4 shadow-soft transition-all hover:border-slate-300 ${
                      hotline.priority ? "border-rose-100/90 ring-1 ring-rose-500/10" : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${hotline.badge}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-slate-900">
                            {hotline.display ?? hotline.number}
                          </span>
                          {hotline.priority ? (
                            <span className="rounded bg-rose-500 px-1.5 py-0.2 text-[9px] font-extrabold uppercase text-white">
                              {t("sos_priority")}
                            </span>
                          ) : null}
                        </div>
                        <h4 className="text-xs font-bold text-slate-800">{t(hotline.nameKey)}</h4>
                        <p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-500">{t(hotline.descKey)}</p>
                      </div>
                    </div>

                    <a
                      href={`tel:${hotline.number}`}
                      className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold shadow-sm transition-transform active:scale-95 ${hotline.callBtn}`}
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                      {t("call")}
                    </a>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs font-semibold leading-relaxed text-blue-900">
                {t("sos_ndrsc_note")}
              </div>

              {SURVIVAL_GUIDELINES.map((guide) => {
                const Icon = guide.icon;
                return (
                  <div key={guide.titleKey} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
                    <div className="mb-2.5 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h4 className="text-xs font-extrabold text-slate-900">{t(guide.titleKey)}</h4>
                    </div>
                    <ul className="space-y-1.5 pl-2">
                      {guide.pointKeys.map((pt) => (
                        <li key={pt} className="flex items-start gap-2 text-xs font-medium text-slate-600">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                          <span>{t(pt)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer (shrink-0) */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {t("sos_legal_footer")}
          </p>
        </div>
      </div>
    </Modal>
  );
}
