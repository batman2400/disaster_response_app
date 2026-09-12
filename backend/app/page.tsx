import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bed,
  Box,
  Building2,
  CheckCircle2,
  ChevronRight,
  Construction,
  ExternalLink,
  HardHat,
  Laptop,
  LifeBuoy,
  Map,
  MapPin,
  Package,
  PhoneCall,
  Shield,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Users,
  Waves,
  Zap,
} from "lucide-react";

import { PublicShell } from "@/components/public-shell";
import { EmergencyBroadcastBanner } from "@/components/emergency-broadcast-banner";
import { HomeQuickActions } from "@/components/home-quick-actions";
import { homeFor, readDashboardRole } from "@/lib/dashboard-auth";
import { listHazards, listShelters, listWards, loadBroadcastAlert } from "@/lib/db";
import { ROLE_THEME } from "@/lib/role-theme";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [signedIn, hazards, wards, shelters, broadcastAlert] = await Promise.all([
    readDashboardRole(),
    listHazards(),
    listWards(),
    listShelters(),
    loadBroadcastAlert(),
  ]);

  const sessionTheme = signedIn ? ROLE_THEME[signedIn] : null;

  // Live operational metrics
  const activeHazards = hazards.filter((h) => h.status !== "RESOLVED");
  const roadBlocksCount = activeHazards.filter((h) => h.is_road_blocked).length;
  const totalBeds = shelters.reduce((acc, s) => acc + (s.total_beds || 0), 0);
  const occupiedBeds = shelters.reduce((acc, s) => acc + (s.occupied_beds || 0), 0);
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);

  return (
    <PublicShell variant="wide">
      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Emergency Broadcast Announcement Banner */}
        <EmergencyBroadcastBanner initialAlert={broadcastAlert} />

        {/* Top Command Bar */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-md lg:p-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white shadow-md shadow-blue-500/20">
              <img
                src="/logo.png"
                alt="Fender"
                className="h-7 w-7 rounded-lg bg-white object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-brand">
                  NDRRMS · CMC
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  Build 2.0
                </span>
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900 lg:text-2xl">
                Fender Response
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Language Selector & Emergency SOS Button */}
            <HomeQuickActions />

            {/* Live Operational Indicator */}
            <div className="hidden xl:flex items-center gap-2 rounded-xl border border-emerald-200 bg-status-emerald-bg px-3.5 py-2">
              <div className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span className="absolute h-full w-full animate-ping rounded-full bg-status-emerald opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-status-emerald" />
              </div>
              <span className="text-xs font-bold text-emerald-900">
                System Live <span className="hidden md:inline">· Kelani Basin Active</span>
              </span>
            </div>

            {/* Quick Links */}
            <Link
              href="/map"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition-all hover:border-brand hover:bg-brand-light hover:text-brand"
            >
              <Map className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Live</span> Map
            </Link>

            <Link
              href="/supplies"
              className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-2 text-xs font-bold text-indigo-700 transition-all hover:bg-indigo-100 hover:text-indigo-900"
            >
              <Package className="h-3.5 w-3.5" />
              <span>Supplies</span>
            </Link>

            <Link
              href="/safe"
              className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2 text-xs font-bold text-sky-800 transition-all hover:bg-sky-100 hover:text-sky-950"
            >
              <Users className="h-3.5 w-3.5 text-sky-600" />
              <span>Family Safety</span>
            </Link>

            <Link
              href="/report/track"
              className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition-all hover:border-brand hover:bg-brand-light hover:text-brand"
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Track</span>
            </Link>

            <Link
              href="/report"
              className="flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-indigo active:scale-95"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Report Hazard
            </Link>

            {signedIn && sessionTheme ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                <span className="px-2 text-xs font-bold text-slate-600">
                  <span className={sessionTheme.chipText}>{sessionTheme.label}</span>
                </span>
                <Link
                  href={homeFor(signedIn)}
                  className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-slate-800"
                >
                  Open desk
                </Link>
                <form action="/api/dashboard/logout" method="post">
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                  >
                    Exit
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </header>

        {/* Hero Section & Mission Statement */}
        <div className="mb-8 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/40 p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-brand">
                <Sparkles className="h-3.5 w-3.5" />
                Colombo Municipal Council Flood Command
              </div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                Rapid Hazard Triage & Disaster Coordination
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600 lg:text-base">
                AI-verified flood incidents, real-time road accessibility routing, and shelter logistics
                orchestrating municipal response across the Kelani River Basin.
              </p>
            </div>

            {/* Quick Emergency Hotline Pill */}
            <div className="flex flex-col gap-2 rounded-2xl border border-rose-200/80 bg-rose-50/80 p-4 sm:flex-row sm:items-center lg:w-80 lg:flex-col lg:items-stretch">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white shadow-sm">
                  <PhoneCall className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-rose-800">
                    24/7 Disaster Helpline
                  </p>
                  <p className="text-sm font-black text-rose-900">Direct Emergency Line</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 sm:pt-0">
                <a
                  href="tel:117"
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-rose-700 active:scale-95"
                >
                  <ShieldAlert className="h-3.5 w-3.5" /> Call DMC 117
                </a>
                <a
                  href="tel:1990"
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-extrabold text-rose-700 hover:bg-rose-100/60 active:scale-95"
                >
                  Ambulance 1990
                </a>
              </div>
            </div>
          </div>

          {/* Real-time Operational Pulse Bar */}
          <div className="mt-6 grid grid-cols-2 gap-3 pt-6 border-t border-slate-200/60 sm:grid-cols-4 lg:gap-4">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Active Incidents
                </span>
                <Activity className="h-4 w-4 text-blue-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{activeHazards.length}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-blue-600">
                {hazards.filter((h) => h.status === "NEED_INFO").length} need confirmation
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Road Closures
                </span>
                <Construction className="h-4 w-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{roadBlocksCount}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-amber-600">
                Impassable / Blocked routes
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Shelter Beds Ready
                </span>
                <Bed className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{availableBeds}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-emerald-600">
                {shelters.length} evacuation centers open
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                  Kelani Basin
                </span>
                <Waves className="h-4 w-4 text-cyan-500" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{wards.length} Wards</p>
              <p className="mt-0.5 text-[11px] font-semibold text-cyan-600">
                Continuous IoT & Rain watch
              </p>
            </div>
          </div>
        </div>

        {/* Special Disaster Feature: Family Safety & Reunification Portal Banner */}
        <div className="mb-8 rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-50 via-blue-50/70 to-indigo-50/40 p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md shadow-sky-500/20">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-sky-800">
                    Emergency Public Portal
                  </span>
                  <span className="text-[11px] font-bold text-slate-500">Zero-barrier check-in</span>
                </div>
                <h3 className="mt-1 text-base font-extrabold text-slate-900 sm:text-lg">
                  "I'm Safe" Family Reunification & Vulnerability Registry
                </h3>
                <p className="mt-0.5 text-xs font-medium text-slate-600 max-w-xl">
                  Mark yourself and loved ones safe, search for missing relatives across evacuation centers, or register special vulnerability flags (infants, elderly, dialysis/medical needs).
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 pt-1 sm:pt-0">
              <Link
                href="/safe"
                className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-sky-700 active:scale-95"
              >
                <span>Check In / Search Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Section Header: Role Command Portals */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-900 lg:text-xl">
              Operational Portals & Workspaces
            </h3>
            <p className="text-xs font-medium text-slate-500">
              Select your role to access verified reporting, command desks, or relief logistics.
            </p>
          </div>
          <Link
            href="/map"
            className="hidden items-center gap-1.5 text-xs font-bold text-brand hover:text-brand-indigo sm:inline-flex"
          >
            <Map className="h-3.5 w-3.5" />
            Explore Full-Screen Map
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* 4-Column Desktop Role Grid */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Citizen Portal */}
          <div className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-brand hover:shadow-md">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-brand shadow-xs transition-colors group-hover:bg-brand group-hover:text-white">
                  <Smartphone className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                  Public
                </span>
              </div>
              <h4 className="text-base font-extrabold text-slate-900 lg:text-lg">Citizen Portal</h4>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">
                Report flash floods, fallen trees, and electrical hazards with instant photo AI triage. Check safe evacuation routes.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Link
                href="/report"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-brand-indigo"
              >
                Report Hazard
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/map"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                View Live Map
              </Link>
            </div>
          </div>

          {/* 2. Council Officer Console */}
          <div className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-indigo-500 hover:shadow-md">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-xs transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                  <Laptop className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                  Staff Desk
                </span>
              </div>
              <h4 className="text-base font-extrabold text-slate-900 lg:text-lg">Council Officer</h4>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">
                Command center triage. Review 5-check AI verdicts, inspect confidence ratings, override statuses, and manage dispatch.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Link
                href="/dashboard/login?role=officer"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-indigo-600"
              >
                Open Officer Desk
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-center text-[10px] font-bold text-slate-400">
                Hotkeys: Ctrl+K search · Space triage
              </span>
            </div>
          </div>

          {/* 3. Field Crew */}
          <div className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-cyan-500 hover:shadow-md">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 shadow-xs transition-colors group-hover:bg-cyan-600 group-hover:text-white">
                  <HardHat className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-bold text-cyan-700">
                  On-Ground
                </span>
              </div>
              <h4 className="text-base font-extrabold text-slate-900 lg:text-lg">Field Crew</h4>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">
                Assigned task resolution queue. Receive urgent clearance work orders, navigate, and submit after-fix photos for AI closure.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Link
                href="/crew/login"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-cyan-700"
              >
                Open Field Queue
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-center text-[10px] font-bold text-slate-400">
                Photo-gated ticket clearance
              </span>
            </div>
          </div>

          {/* 4. Relief & Shelters */}
          <div className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500 hover:shadow-md">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-xs transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                  <Box className="h-6 w-6" />
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                  Logistics
                </span>
              </div>
              <h4 className="text-base font-extrabold text-slate-900 lg:text-lg">Relief Desk</h4>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">
                Shelter logistics & occupancy coordination. Monitor bed inventory, manage ration supply chains, and fulfill citizen help requests.
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Link
                href="/dashboard/login?role=relief"
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700"
              >
                Open Relief Desk
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <span className="text-center text-[10px] font-bold text-slate-400">
                Real-time bed & supply tracking
              </span>
            </div>
          </div>
        </div>

        {/* Colombo Situation Snapshot (Laptop/Desktop 2-Column Command Section) */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Ward Risk & Sensor Overview */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="h-5 w-5 text-brand" />
                <h4 className="text-base font-extrabold text-slate-900">
                  Colombo River Basin & Ward Status
                </h4>
              </div>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                Live Sensor Network
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {wards.map((ward) => {
                const wardHazards = activeHazards.filter((h) => h.ward_id === ward.id);
                const isHighRisk =
                  ward.river_level_pct > 70 ||
                  ward.rainfall_mm > 35 ||
                  ward.status === "CRITICAL" ||
                  ward.status === "WATCH";
                return (
                  <div
                    key={ward.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition-all hover:border-slate-300 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-800">{ward.name}</span>
                        {isHighRisk ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                            High Watch
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                            Normal
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                        Rainfall: <span className="font-bold text-slate-700">{ward.rainfall_mm}mm</span> · River Gauge: <span className="font-bold text-slate-700">{ward.river_level_pct}%</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="block text-xs font-black text-slate-900">
                          {wardHazards.length} Incidents
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {wardHazards.filter((h) => h.is_road_blocked).length} blocked routes
                        </span>
                      </div>
                      <Link
                        href={`/map?ward=${ward.id}`}
                        className="flex h-8 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 text-[11px] font-bold text-slate-700 hover:border-brand hover:text-brand"
                      >
                        Inspect
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Map Teaser & Official Emergency Directory */}
          <div className="flex flex-col gap-4 lg:col-span-5">
            {/* Interactive Map Teaser Card */}
            <div className="relative overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-md">
              <div className="relative z-10">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md">
                  <Map className="h-3 w-3" /> Full-Screen GIS
                </div>
                <h4 className="text-lg font-black tracking-tight">Interactive Public Map</h4>
                <p className="mt-1 text-xs font-medium text-blue-100 leading-relaxed">
                  Real-time flood cluster pins, live road blocks, safe evacuation path overlays, and open shelter availability.
                </p>
                <Link
                  href="/map"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-blue-700 shadow-sm transition-transform hover:scale-[1.02] active:scale-95"
                >
                  Launch Live Tactical Map
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="pointer-events-none absolute -bottom-8 -right-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            </div>

            {/* Official Agency Hotlines */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Official Emergency Directory
                </span>
                <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                  Toll-Free 24/7
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href="tel:117"
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 transition-colors hover:border-rose-200 hover:bg-rose-50/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white font-black text-xs">
                    117
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate text-[11px] font-extrabold text-slate-800">DMC Sri Lanka</p>
                    <p className="truncate text-[10px] font-medium text-slate-400">Disaster Mgmt</p>
                  </div>
                </a>

                <a
                  href="tel:119"
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-xs">
                    119
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate text-[11px] font-extrabold text-slate-800">Police Emergency</p>
                    <p className="truncate text-[10px] font-medium text-slate-400">National Dispatch</p>
                  </div>
                </a>

                <a
                  href="tel:1990"
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 transition-colors hover:border-emerald-200 hover:bg-emerald-50/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-xs">
                    1990
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate text-[11px] font-extrabold text-slate-800">Suwa Seriya</p>
                    <p className="truncate text-[10px] font-medium text-slate-400">Free Ambulance</p>
                  </div>
                </a>

                <a
                  href="tel:0112684242"
                  className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 transition-colors hover:border-amber-200 hover:bg-amber-50/50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-white font-black text-[10px]">
                    CMC
                  </div>
                  <div className="overflow-hidden">
                    <p className="truncate text-[11px] font-extrabold text-slate-800">Colombo Municipal</p>
                    <p className="truncate text-[10px] font-medium text-slate-400">Flood Control</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Enterprise Footer */}
        <footer className="mt-8 border-t border-slate-200/80 pt-6 text-center text-xs font-medium text-slate-400">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-500 font-semibold">
              <span>National Disaster Relief Services (NDRRMS)</span>
              <span>·</span>
              <span>Colombo Municipal Council (CMC)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Real-time Sync Active
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-400">Build 2.0 (Production)</span>
            </div>
          </div>
        </footer>
      </div>
    </PublicShell>
  );
}

