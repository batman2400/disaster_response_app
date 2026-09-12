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
      <div className="flex items-center gap-2">
        <LanguageSwitcher />

        <button
          type="button"
          onClick={() => setSosOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-500 px-3 py-2 text-xs font-extrabold text-white shadow-sm shadow-rose-500/20 transition-transform hover:bg-rose-600 active:scale-95"
          title="Open Emergency Hotlines & Disaster Guidelines"
        >
          <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
          <span>{t("emergency_sos")}</span>
        </button>
      </div>

      <EmergencySosModal open={sosOpen} onClose={() => setSosOpen(false)} />
    </>
  );
}
