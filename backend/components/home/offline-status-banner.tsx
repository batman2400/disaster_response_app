"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { usePwa } from "@/components/pwa-provider";
import { syncAllOfflineReports } from "@/lib/offline-queue";

export function OfflineStatusBanner() {
  const { isOnline, pendingOfflineCount } = usePwa();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  async function handleSync() {
    if (!isOnline || syncing) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncAllOfflineReports();
      if (res.success > 0) {
        setSyncResult(`Synced ${res.success} offline report(s)!`);
        setTimeout(() => setSyncResult(null), 4000);
      } else if (res.failed > 0) {
        setSyncResult(`Failed to sync ${res.failed} report(s).`);
      }
    } catch {
      setSyncResult("Sync error. Will retry automatically.");
    } finally {
      setSyncing(false);
    }
  }

  // Auto-sync when returning online with pending reports
  useEffect(() => {
    if (isOnline && pendingOfflineCount > 0) {
      void handleSync();
    }
  }, [isOnline, pendingOfflineCount]);

  if (isOnline && pendingOfflineCount === 0 && !syncResult) {
    return null;
  }

  return (
    <div
      className={`mb-4 flex items-center justify-between gap-3 rounded-2xl p-3 text-xs font-semibold shadow-sm transition-all ${
        !isOnline
          ? "border border-amber-300 bg-amber-50 text-amber-900"
          : "border border-emerald-200 bg-emerald-50 text-emerald-900"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {!isOnline ? (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
            <WifiOff className="h-4 w-4" />
          </div>
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
            <Wifi className="h-4 w-4" />
          </div>
        )}
        <div>
          <p className="font-extrabold text-[12px]">
            {!isOnline
              ? "Offline Mode Active"
              : syncResult || `${pendingOfflineCount} Pending Offline Report(s)`}
          </p>
          <p className="text-[11px] opacity-85">
            {!isOnline
              ? "Cached maps and emergency hotlines are fully accessible. Reports will queue safely."
              : "Connection restored. Reports syncing to municipal response server."}
          </p>
        </div>
      </div>

      {pendingOfflineCount > 0 && isOnline ? (
        <button
          onClick={() => void handleSync()}
          disabled={syncing}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          <span>{syncing ? "Syncing…" : "Sync Now"}</span>
        </button>
      ) : null}
    </div>
  );
}
