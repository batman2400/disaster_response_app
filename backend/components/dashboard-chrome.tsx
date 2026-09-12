"use client";

import {
  Activity,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  CloudRain,
  ExternalLink,
  LifeBuoy,
  Loader2,
  LogOut,
  Map,
  MapPin,
  Shield,
  Truck,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import type { DashRole } from "@/lib/dashboard-auth";
import { ROLE_THEME } from "@/lib/role-theme";

const TITLES = {
  officer: { title: "Command Control", desk: "Council Officer Desk" },
  relief: { title: "Relief Desk", desk: "Shelter Logistics" },
  crew: { title: "Field Crew", desk: "Resolution Queue" },
} as const;

interface AlertItem {
  id: string;
  title: string;
  time: string;
  type: "critical" | "warning" | "info";
  detail: string;
}

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: "1",
    title: "Ward 02 River Gauge Exceeded 60%",
    time: "4m ago",
    type: "critical",
    detail: "Telemetry station Thimbirigasyaya indicates high river rise rate +8mm/hr.",
  },
  {
    id: "2",
    title: "Critical Flood Confirmed in Nagalagam St",
    time: "12m ago",
    type: "critical",
    detail: "High confidence AI score 0.95 with 2 clustered citizen reports.",
  },
  {
    id: "3",
    title: "Crew Alpha Dispatched to Ward 01",
    time: "25m ago",
    type: "info",
    detail: "Tree clearance unit deployed with hydraulic winch.",
  },
];

export function DashboardChrome({ role }: { role: DashRole }) {
  const copy = TITLES[role];
  const theme = ROLE_THEME[role];
  const Icon = theme.icon;

  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [showPipelineHealth, setShowPipelineHealth] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [switchingRole, setSwitchingRole] = useState<DashRole | null>(null);

  const handleSwitchRole = async (targetRole: DashRole, fallbackHref: string) => {
    if (targetRole === role) {
      setShowRoles(false);
      return;
    }
    setSwitchingRole(targetRole);
    setShowRoles(false);
    try {
      const res = await fetch("/api/dashboard/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });
      if (res.ok) {
        const data = (await res.json()) as { next?: string };
        window.location.href = data.next || fallbackHref;
        return;
      }
    } catch {
      // Continue to fallback
    }
    window.location.href = fallbackHref;
  };

  const notifRef = useRef<HTMLDivElement>(null);
  const rolesRef = useRef<HTMLDivElement>(null);
  const pipelineRef = useRef<HTMLDivElement>(null);

  // Play synthetic emergency chime when sound enabled
  const playAlertChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // AudioContext not allowed before user gesture
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) playAlertChime();
  };

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (rolesRef.current && !rolesRef.current.contains(event.target as Node)) {
        setShowRoles(false);
      }
      if (pipelineRef.current && !pipelineRef.current.contains(event.target as Node)) {
        setShowPipelineHealth(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header
      className={cn(
        "relative z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 border-t-4 bg-white px-4 shadow-sm sm:px-6",
        theme.accent,
      )}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Link
          href="/"
          title="Return to Home Portal"
          className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95 sm:px-3"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md",
            theme.iconBg,
            theme.glow,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-base font-extrabold leading-tight text-slate-900 sm:text-lg">{copy.title}</h1>
            <span
              className={cn(
                "hidden shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide sm:inline-flex",
                theme.chipBg,
                theme.chipText,
              )}
            >
              {theme.label}
            </span>
          </div>
          <p className="hidden text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:block">{copy.desk}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          href="/map"
          target="_blank"
          rel="noopener noreferrer"
          title="Open Live Public Hazard Map in New Tab"
          className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-brand hover:bg-slate-50 hover:text-brand sm:px-3"
        >
          <Map className="h-4 w-4 text-brand" />
          <span className="hidden md:inline">Public map</span>
          <ExternalLink className="h-3 w-3 text-slate-400" />
        </Link>

        {/* Pipeline Health Status Popover */}
        <div className="relative hidden xl:block" ref={pipelineRef}>
          <button
            type="button"
            onClick={() => setShowPipelineHealth(!showPipelineHealth)}
            title="Click to view AI pipeline telemetry"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
          >
            <div className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute h-full w-full animate-ping rounded-full bg-status-emerald opacity-50" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-status-emerald" />
            </div>
            <span>Pipeline Active</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showPipelineHealth ? (
            <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-fade-in">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-brand" />
                  <span className="text-xs font-extrabold text-slate-900">System Telemetry</span>
                </div>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  HEALTHY
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>AI Inference Engine</span>
                  <span className="font-mono font-bold text-slate-900">Gemini 2.5 Flash</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Verification Latency</span>
                  <span className="font-mono font-bold text-slate-900">~3,432 ms</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Spatial PostGIS Match</span>
                  <span className="font-mono font-bold text-emerald-600">Connected</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Hydro/Weather Feed</span>
                  <span className="font-mono font-bold text-emerald-600">Live (5m poll)</span>
                </div>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-2 text-center">
                <Link
                  href="/dashboard/admin/pipeline"
                  className="text-[11px] font-bold text-brand hover:underline"
                >
                  Open Global Pipeline Diagnostics →
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        {role === "officer" ? (
          <Link
            href="/dashboard/admin/weather"
            title="Open Historical Simulation Replay"
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 hover:text-brand sm:px-3"
          >
            <CloudRain className="h-4 w-4 text-blue-500" />
            <span className="hidden xl:inline">Weather replay</span>
          </Link>
        ) : null}

        {/* Interactive Notification Bell Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Emergency Incident Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-brand active:scale-95"
          >
            <Bell className="h-4 w-4" />
            {alerts.length > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-status-crimson text-[9px] font-bold text-white shadow-sm animate-pulse">
                {alerts.length}
              </span>
            ) : null}
          </button>

          {showNotifications ? (
            <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl animate-fade-in">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-900">Incident Alerts</span>
                  <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700">
                    {alerts.length} New
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleSound}
                  title={soundEnabled ? "Mute alert audio" : "Enable alert chime"}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                >
                  {soundEnabled ? (
                    <>
                      <Volume2 className="h-3 w-3 text-emerald-600" />
                      <span className="text-emerald-600">Audio On</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-3 w-3 text-slate-400" />
                      <span>Muted</span>
                    </>
                  )}
                </button>
              </div>

              <div className="max-h-72 space-y-2.5 overflow-y-auto custom-scrollbar">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-left transition-colors hover:bg-slate-100/80"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-[10px] font-extrabold uppercase",
                          alert.type === "critical" ? "text-status-crimson" : "text-brand",
                        )}
                      >
                        {alert.type}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">{alert.time}</span>
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-slate-900">{alert.title}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">{alert.detail}</p>
                  </div>
                ))}
                {alerts.length === 0 ? (
                  <p className="py-4 text-center text-xs font-semibold text-slate-400">No unread alerts</p>
                ) : null}
              </div>

              {alerts.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setAlerts([])}
                  className="mt-3 w-full rounded-xl border border-slate-200 py-1.5 text-center text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  Mark All Read
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Interactive Role Switcher Dropdown */}
        <div className="relative" ref={rolesRef}>
          <button
            type="button"
            disabled={Boolean(switchingRole)}
            onClick={() => setShowRoles(!showRoles)}
            title="Switch operational role"
            className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-60 sm:px-3"
          >
            {switchingRole ? (
              <Loader2 className="h-4 w-4 animate-spin text-brand" />
            ) : (
              <Shield className="h-4 w-4 text-brand" />
            )}
            <span className="hidden sm:inline">
              {switchingRole ? "Switching..." : "Switch role"}
            </span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {showRoles ? (
            <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-fade-in">
              <p className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Operational Desks
              </p>
              <button
                type="button"
                disabled={Boolean(switchingRole)}
                onClick={() => handleSwitchRole("officer", "/dashboard/officer")}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors",
                  role === "officer" ? "bg-brand-light text-brand" : "text-slate-700 hover:bg-slate-50",
                )}
              >
                <Shield className="h-4 w-4 shrink-0" />
                <span className="flex-1">Command Control</span>
                {switchingRole === "officer" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
                ) : role === "officer" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand" />
                ) : null}
              </button>
              <button
                type="button"
                disabled={Boolean(switchingRole)}
                onClick={() => handleSwitchRole("relief", "/dashboard/relief")}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors",
                  role === "relief" ? "bg-amber-50 text-amber-600" : "text-slate-700 hover:bg-slate-50",
                )}
              >
                <LifeBuoy className="h-4 w-4 shrink-0" />
                <span className="flex-1">Relief Logistics</span>
                {switchingRole === "relief" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                ) : role === "relief" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                ) : null}
              </button>
              <button
                type="button"
                disabled={Boolean(switchingRole)}
                onClick={() => handleSwitchRole("crew", "/crew")}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors",
                  role === "crew" ? "bg-indigo-50 text-indigo-600" : "text-slate-700 hover:bg-slate-50",
                )}
              >
                <Truck className="h-4 w-4 shrink-0 text-indigo-500" />
                <span className="flex-1">Field Crew Queue</span>
                {switchingRole === "crew" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                ) : role === "crew" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                ) : null}
              </button>
              <div className="my-1 border-t border-slate-100" />
              <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Citizen Services
              </p>
              <Link
                href="/map"
                onClick={() => setShowRoles(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Map className="h-4 w-4 text-emerald-500" />
                <span>Public Hazard Map</span>
              </Link>
              <Link
                href="/report"
                onClick={() => setShowRoles(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <MapPin className="h-4 w-4 text-rose-500" />
                <span>Report Incident</span>
              </Link>
            </div>
          ) : null}
        </div>

        <form action="/api/dashboard/logout" method="post">
          <button
            type="submit"
            title="Log out from Council Desk"
            className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-600 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95 sm:px-3"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
