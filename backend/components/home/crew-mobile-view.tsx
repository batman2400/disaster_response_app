"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Construction,
  ExternalLink,
  HardHat,
  MapPin,
  Navigation,
  QrCode,
  Radio,
  Shield,
  Smartphone,
  Truck,
  Zap,
} from "lucide-react";
import { MuleScannerModal } from "@/components/mule-scanner-modal";
import type { HazardRow, WardRow } from "@/lib/types";
import { timeAgo, wardShort } from "@/lib/format";

interface CrewMobileViewProps {
  hazards: HazardRow[];
  wards: WardRow[];
}

export function CrewMobileView({ hazards, wards }: CrewMobileViewProps) {
  const [scannerOpen, setScannerOpen] = useState(false);

  const activeHazards = hazards.filter((h) => h.status !== "RESOLVED");
  const criticalHazards = activeHazards.filter(
    (h) => h.urgency === "CRITICAL" || h.is_road_blocked
  );

  return (
    <div className="flex flex-col gap-5 animate-pop">
      {/* 1. Crew Status & Unit Banner */}
      <div className="rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50 p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-md shadow-cyan-500/20">
              <HardHat className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-800">
                  On-Ground Team
                </span>
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                Kelani Municipal Clearance Unit
              </h3>
            </div>
          </div>

          <Link
            href="/crew"
            className="flex items-center gap-1 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition-transform hover:bg-cyan-700 active:scale-95 touch-manipulation"
          >
            <span>Open Desk</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-cyan-200/60 pt-3 text-center">
          <div className="rounded-xl bg-white/70 p-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Assigned</p>
            <p className="text-lg font-black text-slate-900">{activeHazards.length}</p>
          </div>
          <div className="rounded-xl bg-white/70 p-2">
            <p className="text-[10px] font-bold text-rose-500 uppercase">Urgent</p>
            <p className="text-lg font-black text-rose-600">{criticalHazards.length}</p>
          </div>
          <div className="rounded-xl bg-white/70 p-2">
            <p className="text-[10px] font-bold text-amber-500 uppercase">Roadblocks</p>
            <p className="text-lg font-black text-amber-600">
              {activeHazards.filter((h) => h.is_road_blocked).length}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Rapid Field Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="flex flex-col items-start justify-between rounded-3xl border border-indigo-200 bg-white p-4.5 text-left shadow-xs transition-transform hover:border-indigo-500 active:scale-95 touch-manipulation"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <QrCode className="h-5 w-5" />
          </div>
          <div className="mt-3">
            <h4 className="text-sm font-black text-slate-900">Scan SOS Beacon</h4>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Data Mule: harvest citizen offline beacons.
            </p>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
            <span>Launch Scanner</span>
            <ArrowRight className="h-3 w-3" />
          </span>
        </button>

        <Link
          href="/report"
          className="flex flex-col items-start justify-between rounded-3xl border border-amber-200 bg-white p-4.5 text-left shadow-xs transition-transform hover:border-amber-500 active:scale-95 touch-manipulation"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Construction className="h-5 w-5" />
          </div>
          <div className="mt-3">
            <h4 className="text-sm font-black text-slate-900">Log Road Obstacle</h4>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Update impassable routes for safe routing.
            </p>
          </div>
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-700">
            <span>Report Debris</span>
            <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      </div>

      {/* 3. Priority Dispatch Workorders */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardHat className="h-4 w-4 text-cyan-600" />
            <h4 className="text-sm font-black text-slate-900">Priority Work Orders</h4>
          </div>
          <Link
            href="/crew"
            className="text-xs font-bold text-cyan-700 hover:text-cyan-900"
          >
            View All ({activeHazards.length})
          </Link>
        </div>

        {criticalHazards.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No critical clearance tickets in this sector.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {criticalHazards.slice(0, 4).map((h) => (
              <div
                key={h.id}
                className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 transition-all hover:border-slate-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 uppercase">
                        {wardShort(h.ward_id)}
                      </span>
                      {h.is_road_blocked ? (
                        <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                          Road Blocked
                        </span>
                      ) : null}
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold ${
                          h.urgency === "CRITICAL"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {h.urgency}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-900">
                      {h.category} - {h.description?.slice(0, 75) || "Active hazard"}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                    {timeAgo(h.created_at)}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/50">
                  <Link
                    href={`/map?hazard=${h.id}`}
                    className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-brand touch-manipulation"
                  >
                    <Navigation className="h-3 w-3 text-blue-500" />
                    <span>Navigate</span>
                  </Link>
                  <Link
                    href="/crew"
                    className="flex items-center gap-1 rounded-xl bg-cyan-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs hover:bg-cyan-700 touch-manipulation"
                  >
                    <Camera className="h-3 w-3" />
                    <span>Resolve / Photo</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mule Scanner Modal */}
      <MuleScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} />
    </div>
  );
}
