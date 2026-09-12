"use client";

import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, Bell, Info, Megaphone, ShieldAlert, X } from "lucide-react";
import type { BroadcastAlert } from "@/lib/db";
import { wardShort } from "@/lib/format";
import type { WardId } from "@/lib/types";

export function EmergencyBroadcastBanner({ initialAlert }: { initialAlert?: BroadcastAlert | null }) {
  const [alert, setAlert] = useState<BroadcastAlert | null>(initialAlert ?? null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchBroadcast() {
      try {
        const res = await fetch("/api/broadcast");
        if (res.ok) {
          const data = (await res.json()) as BroadcastAlert;
          if (!cancelled) {
            setAlert(data);
          }
        }
      } catch {
        // ignore
      }
    }

    if (!alert) {
      void fetchBroadcast();
    }

    const interval = setInterval(() => {
      void fetchBroadcast();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [alert]);

  if (!alert || !alert.active || !alert.message || dismissed) {
    return null;
  }

  const isCritical = alert.severity === "CRITICAL";
  const isWarning = alert.severity === "WARNING";

  const theme = isCritical
    ? {
        border: "border-rose-500/30 bg-rose-500 text-white shadow-lg shadow-rose-500/20",
        badge: "bg-white text-rose-700 font-extrabold",
        icon: ShieldAlert,
        tag: "CRITICAL BROADCAST",
      }
    : isWarning
      ? {
          border: "border-amber-400/40 bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20",
          badge: "bg-slate-900 text-amber-300 font-extrabold",
          icon: AlertTriangle,
          tag: "FLOOD ADVISORY",
        }
      : {
          border: "border-blue-300 bg-blue-600 text-white shadow-md shadow-blue-600/20",
          badge: "bg-white/20 text-white font-bold",
          icon: Megaphone,
          tag: "CIVIC NOTICE",
        };

  const Icon = theme.icon;

  return (
    <aside
      aria-label="Emergency Public Announcement"
      className={`relative z-40 mb-4 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition-all ${theme.border}`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-black/15">
          <Icon className="h-4 w-4 animate-pulse" />
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 overflow-hidden">
          <span className={`rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider ${theme.badge}`}>
            {theme.tag}
          </span>
          {alert.ward_id ? (
            <span className="text-[11px] font-bold opacity-85">
              [{wardShort(alert.ward_id as WardId)}]
            </span>
          ) : null}
          <p className="text-xs font-bold leading-snug sm:text-sm">
            {alert.message}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss Alert"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/10 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </aside>
  );
}
