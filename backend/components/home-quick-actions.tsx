"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { EmergencySosModal } from "./emergency-sos-modal";
import { LanguageSwitcher, useI18n } from "@/lib/i18n/language-context";

export function HomeQuickActions() {
  const [sosOpen, setSosOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <LanguageSwitcher />

        <button
          type="button"
          onClick={() => setSosOpen(true)}
          className="flex shrink-0 items-center gap-1 sm:gap-1.5 rounded-xl border border-rose-200 bg-rose-500 px-2 sm:px-3 py-1.5 sm:py-2 text-xs font-extrabold text-white shadow-sm shadow-rose-500/20 transition-transform hover:bg-rose-600 active:scale-95 touch-manipulation"
          title="Open Emergency Hotlines & Disaster Guidelines"
        >
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 animate-pulse" />
          <span className="whitespace-nowrap font-black">
            <span className="hidden min-[460px]:inline">{t("emergency_sos")}</span>
            <span className="min-[460px]:hidden">117</span>
          </span>
        </button>
      </div>

      <EmergencySosModal open={sosOpen} onClose={() => setSosOpen(false)} />
    </>
  );
}
