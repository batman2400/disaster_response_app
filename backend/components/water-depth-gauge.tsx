"use client";

import { AlertTriangle, Anchor, CheckCircle2, Gauge, ShieldAlert, Waves } from "lucide-react";
import type { DepthConfidence, VehiclePassability } from "@/lib/types";

interface WaterDepthGaugeProps {
  depthCm: number | null | undefined;
  passability?: VehiclePassability | null;
  confidence?: DepthConfidence | null;
  referenceAnchor?: string | null;
  compact?: boolean;
}

export function WaterDepthGauge({
  depthCm,
  passability = "NOT_APPLICABLE",
  confidence = "MEDIUM",
  referenceAnchor,
  compact = false,
}: WaterDepthGaugeProps) {
  if (depthCm === null || depthCm === undefined || depthCm <= 0) {
    if (!passability || passability === "NOT_APPLICABLE") return null;
  }

  const depth = Math.max(0, depthCm ?? 0);
  const inches = Math.round(depth / 2.54);
  const gaugePercent = Math.min(100, Math.max(8, (depth / 100) * 100));

  const passabilityMeta: Record<
    VehiclePassability,
    { label: string; badge: string; border: string; text: string; bg: string; icon: typeof CheckCircle2 }
  > = {
    WALKABLE: {
      label: "Passable (All Vehicles)",
      badge: "bg-emerald-500/10 text-emerald-600 border-emerald-300",
      border: "border-emerald-200",
      text: "text-emerald-700",
      bg: "bg-emerald-500",
      icon: CheckCircle2,
    },
    CAUTION_SUV_ONLY: {
      label: "Caution: 4WD / SUVs Only",
      badge: "bg-amber-500/10 text-amber-600 border-amber-300",
      border: "border-amber-200",
      text: "text-amber-700",
      bg: "bg-amber-500",
      icon: AlertTriangle,
    },
    IMPASSABLE: {
      label: "Impassable to Standard Traffic",
      badge: "bg-rose-500/10 text-rose-600 border-rose-300",
      border: "border-rose-200",
      text: "text-rose-700",
      bg: "bg-rose-500",
      icon: ShieldAlert,
    },
    EXTREME_BOAT_ONLY: {
      label: "Extreme: Rescue Boat Required",
      badge: "bg-purple-500/10 text-purple-600 border-purple-300",
      border: "border-purple-200",
      text: "text-purple-700",
      bg: "bg-purple-600",
      icon: Waves,
    },
    NOT_APPLICABLE: {
      label: "Normal Surface Conditions",
      badge: "bg-slate-100 text-slate-600 border-slate-200",
      border: "border-slate-200",
      text: "text-slate-600",
      bg: "bg-slate-400",
      icon: CheckCircle2,
    },
  };

  const meta = passabilityMeta[passability || "NOT_APPLICABLE"];
  const PassIcon = meta.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 ${meta.badge}`}>
        <Waves className="h-3.5 w-3.5 shrink-0" />
        <span className="font-mono text-xs font-black">{depth}cm</span>
        <span className="text-[11px] font-bold">({inches}")</span>
        <span className="text-[10px] font-extrabold uppercase tracking-wider">· {meta.label}</span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border ${meta.border} bg-white shadow-soft`}>
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <Gauge className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800">AI Visual Water Depth Gauge</h4>
            <p className="text-[10px] font-bold text-slate-400">Gemini Vision Depth Telemetry</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[9px] font-extrabold uppercase text-slate-600">
            {confidence} Confidence
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
          {/* Visual Vertical Ruler */}
          <div className="flex sm:col-span-4 items-center gap-3">
            <div className="relative flex h-36 w-12 flex-col justify-end overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner">
              {/* Animated water fill */}
              <div
                className={`w-full transition-all duration-700 ${meta.bg} opacity-80`}
                style={{ height: `${gaugePercent}%` }}
              >
                <div className="h-1 w-full bg-white/40" />
              </div>

              {/* Ruler Tick marks */}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-1 text-[8px] font-mono font-bold text-slate-400">
                <span className="border-b border-slate-300/80 pr-1 text-right">100cm</span>
                <span className="border-b border-slate-300/80 pr-1 text-right">75cm</span>
                <span className="border-b border-slate-300/80 pr-1 text-right">50cm</span>
                <span className="border-b border-slate-300/80 pr-1 text-right">25cm</span>
                <span className="pr-1 text-right">0cm</span>
              </div>
            </div>

            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-3xl font-black text-slate-900">{depth}</span>
                <span className="text-xs font-extrabold uppercase text-slate-500">cm</span>
              </div>
              <div className="text-xs font-semibold text-slate-400">
                approx. <span className="font-mono font-bold text-slate-700">{inches} inches</span>
              </div>
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-extrabold ${meta.badge}`}>
                  <PassIcon className="h-3 w-3" />
                  {meta.label}
                </span>
              </div>
            </div>
          </div>

          {/* Vehicle & Equipment Passability Matrix */}
          <div className="sm:col-span-8 flex flex-col justify-between gap-2 border-t border-slate-100 pt-3 sm:border-t-0 sm:border-l sm:pl-4 sm:pt-0">
            {referenceAnchor ? (
              <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-2 text-slate-600">
                <Anchor className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <p className="text-[11px] font-medium leading-tight">
                  <strong className="text-slate-800">Visual Anchor:</strong> {referenceAnchor}
                </p>
              </div>
            ) : null}

            {/* Vehicle Matrix */}
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-1.5">
                <span className="font-medium text-slate-600">🚶 Pedestrians</span>
                <span className={`font-mono font-extrabold ${depth > 20 ? "text-rose-600" : "text-emerald-600"}`}>
                  {depth <= 15 ? "Safe" : depth <= 35 ? "Dangerous" : "Impassable"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-1.5">
                <span className="font-medium text-slate-600">🚗 Sedans / Three-Wheelers</span>
                <span className={`font-mono font-extrabold ${depth > 25 ? "text-rose-600" : "text-emerald-600"}`}>
                  {depth <= 20 ? "Passable" : "Engine Lock Risk"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-1.5">
                <span className="font-medium text-slate-600">🚙 SUVs / 4WD / Ambulances</span>
                <span className={`font-mono font-extrabold ${depth > 45 ? "text-rose-600" : depth > 25 ? "text-amber-600" : "text-emerald-600"}`}>
                  {depth <= 35 ? "Passable" : depth <= 50 ? "Caution" : "Impassable"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-2.5 py-1.5">
                <span className="font-medium text-slate-600">🚤 Rescue Watercraft</span>
                <span className={`font-mono font-extrabold ${depth >= 45 ? "text-purple-600" : "text-slate-400"}`}>
                  {depth >= 50 ? "Required" : depth >= 35 ? "Deployable" : "Not Required"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
