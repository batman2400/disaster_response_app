"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CloudRain,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  ShieldAlert,
  Waves,
  X,
} from "lucide-react";
import { Modal } from "./ui/modal";
import { categoryLabel, timeAgo, wardShort } from "@/lib/format";
import type { HazardRow, ShelterRow, WardRow } from "@/lib/types";

interface SitRepExportModalProps {
  open: boolean;
  onClose: () => void;
  hazards: HazardRow[];
  wards: WardRow[];
  shelters?: ShelterRow[];
  dutyRole?: string;
}

export function SitRepExportModal({
  open,
  onClose,
  hazards,
  wards,
  shelters = [],
  dutyRole = "Council Officer",
}: SitRepExportModalProps) {
  const printContainerRef = useRef<HTMLDivElement>(null);
  const [loadedShelters, setLoadedShelters] = useState<ShelterRow[]>(shelters);

  useEffect(() => {
    if (shelters.length > 0) {
      setLoadedShelters(shelters);
    } else if (open) {
      void fetch("/api/shelters")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setLoadedShelters(data);
        })
        .catch(() => {});
    }
  }, [open, shelters]);

  const activeHazards = hazards.filter((h) => h.status !== "RESOLVED");
  const criticalHazards = activeHazards.filter(
    (h) => h.urgency === "CRITICAL" || h.status === "AREA_ALERT",
  );
  const roadBlocks = activeHazards.filter((h) => h.is_road_blocked);
  const resolvedCount = hazards.filter((h) => h.status === "RESOLVED").length;

  const totalBeds = loadedShelters.reduce((acc: number, s: ShelterRow) => acc + (s.total_beds || 0), 0);
  const occupiedBeds = loadedShelters.reduce((acc: number, s: ShelterRow) => acc + (s.occupied_beds || 0), 0);
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);
  const occupancyPct = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const reportCode = `SITREP-CLM-${now.toISOString().slice(0, 10).replace(/-/g, "")}-${now.getHours()}${now.getMinutes()}`;

  function handleDownloadCsv() {
    const headers = [
      "Incident_ID",
      "Category",
      "Ward",
      "Status",
      "Urgency",
      "Confidence_Score",
      "Road_Blocked",
      "Confirmations",
      "Created_At",
      "Resolved_At",
      "Latitude",
      "Longitude",
      "Officer_Note",
      "Description",
    ];

    const rows = hazards.map((h) => [
      `"${h.id}"`,
      `"${h.category}"`,
      `"${h.ward_id}"`,
      `"${h.status}"`,
      `"${h.urgency}"`,
      h.confidence_score.toFixed(2),
      h.is_road_blocked ? "YES" : "NO",
      h.confirmations_count,
      `"${h.created_at}"`,
      h.resolved_at ? `"${h.resolved_at}"` : '""',
      h.lat.toFixed(6),
      h.lng.toFixed(6),
      `"${(h.officer_note || "").replace(/"/g, '""')}"`,
      `"${(h.description || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fender-sitrep-colombo-${now.toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex max-h-[90vh] flex-col overflow-hidden">
        {/* Modal Top Actions */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Colombo Disaster Situation Report (SitRep)
              </h3>
              <p className="font-mono text-xs font-bold text-slate-400">{reportCode}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-brand hover:text-brand"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              Download CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-brand-indigo active:scale-95"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200/70 text-slate-600 hover:bg-slate-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Report Preview Body (Also used for print) */}
        <div
          ref={printContainerRef}
          className="flex-1 overflow-y-auto no-scrollbar p-6 bg-white sitrep-print-root space-y-6"
        >
          {/* Official Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black tracking-widest uppercase text-brand">
                  DEMOCRATIC SOCIALIST REPUBLIC OF SRI LANKA
                </span>
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">
                COLOMBO MUNICIPAL COUNCIL · DISASTER RESPONSE SITREP
              </h1>
              <p className="text-xs font-bold text-slate-500">
                National Disaster Relief Services Centre (NDRSC) · Kelani River Basin Command
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block rounded bg-rose-100 px-2 py-0.5 text-[10px] font-black uppercase text-rose-800">
                Official Operational Report
              </span>
              <p className="mt-1 font-mono text-xs font-extrabold text-slate-900">
                {dateStr} · {timeStr} HRS
              </p>
              <p className="text-[11px] font-medium text-slate-500">Compiled by: {dutyRole}</p>
            </div>
          </div>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Incidents
              </span>
              <p className="font-mono text-2xl font-black text-slate-900">{activeHazards.length}</p>
              <span className="text-[11px] font-semibold text-slate-500">
                {resolvedCount} resolved to date
              </span>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                Critical Hotspots
              </span>
              <p className="font-mono text-2xl font-black text-rose-700">{criticalHazards.length}</p>
              <span className="text-[11px] font-semibold text-rose-600">Urgent dispatch required</span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                Road Blockages
              </span>
              <p className="font-mono text-2xl font-black text-amber-900">{roadBlocks.length}</p>
              <span className="text-[11px] font-semibold text-amber-700">Arterial routes impaired</span>
            </div>

            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                Shelter Occupancy
              </span>
              <p className="font-mono text-2xl font-black text-indigo-900">{occupancyPct}%</p>
              <span className="text-[11px] font-semibold text-indigo-600">
                {availableBeds} free of {totalBeds} beds
              </span>
            </div>
          </div>

          {/* Section 1: Hydrometric Ward Telemetry */}
          <div>
            <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Waves className="h-3.5 w-3.5 text-blue-600" />
              1. Basin Hydrometric Status by Municipal Ward
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-extrabold text-slate-600">
                  <tr>
                    <th className="p-2.5">Ward ID & Location</th>
                    <th className="p-2.5">24h Rainfall</th>
                    <th className="p-2.5">Kelani River Level</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {wards.map((w) => (
                    <tr key={w.id}>
                      <td className="p-2.5 font-bold">{w.name} ({w.id})</td>
                      <td className="p-2.5 font-mono">{w.rainfall_mm.toFixed(1)} mm</td>
                      <td className="p-2.5 font-mono">{w.river_level_pct.toFixed(0)}% Capacity</td>
                      <td className="p-2.5">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            w.status === "CRITICAL"
                              ? "bg-rose-100 text-rose-800"
                              : w.status === "WATCH"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Priority Active Hazard Register */}
          <div>
            <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
              2. Priority Incident Register (Open Triage)
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-extrabold text-slate-600">
                  <tr>
                    <th className="p-2.5">Ref ID</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Ward</th>
                    <th className="p-2.5">Urgency</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Blockage</th>
                    <th className="p-2.5">AI Conf</th>
                    <th className="p-2.5">Reported</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {activeHazards.slice(0, 10).map((h) => (
                    <tr key={h.id}>
                      <td className="p-2.5 font-mono font-bold text-slate-600">
                        #{h.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="p-2.5 font-bold">{categoryLabel(h.category)}</td>
                      <td className="p-2.5">{wardShort(h.ward_id)}</td>
                      <td className="p-2.5">
                        <span
                          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            h.urgency === "CRITICAL"
                              ? "bg-rose-100 text-rose-800"
                              : h.urgency === "MEDIUM"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {h.urgency}
                        </span>
                      </td>
                      <td className="p-2.5 text-[11px] font-bold">{h.status}</td>
                      <td className="p-2.5">
                        {h.is_road_blocked ? (
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                            ROAD BLOCKED
                          </span>
                        ) : (
                          <span className="text-slate-400">Passable</span>
                        )}
                      </td>
                      <td className="p-2.5 font-mono">{(h.confidence_score * 100).toFixed(0)}%</td>
                      <td className="p-2.5 text-slate-500">{timeAgo(h.created_at)}</td>
                    </tr>
                  ))}
                  {activeHazards.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-slate-400 font-bold">
                        No active open incidents.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Relief Shelters Readiness */}
          {loadedShelters.length > 0 ? (
            <div>
              <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                3. Evacuation Shelters & Relief Bed Readiness
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 font-extrabold text-slate-600">
                    <tr>
                      <th className="p-2.5">Shelter Name</th>
                      <th className="p-2.5">Ward</th>
                      <th className="p-2.5">Total Beds</th>
                      <th className="p-2.5">Occupied</th>
                      <th className="p-2.5">Available Beds</th>
                      <th className="p-2.5">Supplies Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {loadedShelters.map((s: ShelterRow) => (
                      <tr key={s.id}>
                        <td className="p-2.5 font-bold">{s.name}</td>
                        <td className="p-2.5">{wardShort(s.ward_id)}</td>
                        <td className="p-2.5 font-mono">{s.total_beds}</td>
                        <td className="p-2.5 font-mono">{s.occupied_beds}</td>
                        <td className="p-2.5 font-mono font-bold text-emerald-700">
                          {Math.max(0, s.total_beds - s.occupied_beds)} free
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              s.supplies_status === "ADEQUATE"
                                ? "bg-emerald-50 text-emerald-700"
                                : s.supplies_status === "LOW"
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {s.supplies_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Operational Declaration */}
          <div className="border-t border-slate-200 pt-4 text-slate-500 text-[11px] leading-relaxed">
            <p>
              This Situation Report is an automated operational briefing compiled from citizen field reports, AI vision triage, meteorological river telemetry, and municipal emergency staff logs. Disseminate to authorized CMC and tri-forces rescue personnel only.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
