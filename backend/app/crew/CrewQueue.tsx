"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Flame,
  List,
  LogOut,
  Map as MapIcon,
  MapPin,
  Navigation,
  Radio,
  Search,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";

import { PublicShell } from "@/components/public-shell";
import { Badge, StatusBadge, UrgencyBadge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { categoryLabel, timeAgo, wardShort } from "@/lib/format";
import { haversineKm } from "@/lib/geo";
import { latestDispatchNote } from "@/lib/officer-log";
import { ROLE_THEME } from "@/lib/role-theme";
import type { HazardRow, WardId } from "@/lib/types";
import { mapHazardRow, useLiveRows } from "@/lib/use-live";

import { CrewMap } from "./CrewMap";

type FilterTab = "dispatched" | "all" | "blocked" | "critical" | "resolved";
type SortOption = "priority" | "nearest" | "newest";

function sortCrewQueue(rows: HazardRow[], userLoc?: [number, number] | null, sortMode: SortOption = "priority") {
  return [...rows].sort((a, b) => {
    if (sortMode === "nearest" && userLoc) {
      const distA = haversineKm(userLoc, [a.lat, a.lng]);
      const distB = haversineKm(userLoc, [b.lat, b.lng]);
      return distA - distB;
    }

    if (sortMode === "newest") {
      return Date.parse(b.created_at) - Date.parse(a.created_at);
    }

    // Default "priority" sort: Dispatched first, then road blocked, then urgency, then created_at
    const aDispatched = a.dispatched_at ? Date.parse(a.dispatched_at) : 0;
    const bDispatched = b.dispatched_at ? Date.parse(b.dispatched_at) : 0;
    if (Boolean(a.dispatched_at) !== Boolean(b.dispatched_at)) {
      return a.dispatched_at ? -1 : 1;
    }
    if (aDispatched !== bDispatched) return bDispatched - aDispatched;

    if (a.is_road_blocked !== b.is_road_blocked) {
      return a.is_road_blocked ? -1 : 1;
    }

    const urgencyRank: Record<string, number> = { CRITICAL: 0, MEDIUM: 1, LOW: 2 };
    const aRank = urgencyRank[a.urgency] ?? 3;
    const bRank = urgencyRank[b.urgency] ?? 3;
    if (aRank !== bRank) return aRank - bRank;

    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

export function CrewQueue({ initialHazards }: { initialHazards: HazardRow[] }) {
  const { rows: hazards, live } = useLiveRows<HazardRow>({
    table: "hazards",
    initial: sortCrewQueue(initialHazards),
    mapRow: mapHazardRow,
    sort: (rows) => sortCrewQueue(rows),
    fallbackFetch: () => fetch("/api/hazards").then((res) => res.json() as Promise<HazardRow[]>),
  });

  const [activeTab, setActiveTab] = useState<FilterTab>("dispatched");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWard, setSelectedWard] = useState<string>("all");
  const [sortMode, setSortMode] = useState<SortOption>("priority");
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationStatus, setLocationStatus] = useState<"pending" | "ready" | "denied">("pending");
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Request field crew geolocation for distance and routing
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          setLocationStatus("ready");
        },
        () => {
          setLocationStatus("denied");
          // Fallback demo location in central Colombo if denied
          setUserLocation([6.9271, 79.8612]);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocationStatus("denied");
    }
  }, []);

  const openHazards = useMemo(() => hazards.filter((row) => row.status !== "RESOLVED"), [hazards]);
  const resolvedHazards = useMemo(() => hazards.filter((row) => row.status === "RESOLVED"), [hazards]);

  const dispatchedCount = useMemo(() => openHazards.filter((row) => Boolean(row.dispatched_at)).length, [openHazards]);
  const blockedCount = useMemo(() => openHazards.filter((row) => row.is_road_blocked).length, [openHazards]);
  const criticalCount = useMemo(
    () => openHazards.filter((row) => row.urgency === "CRITICAL").length,
    [openHazards]
  );

  // If there are no dispatched tasks, default tab to all open
  useEffect(() => {
    if (dispatchedCount === 0 && activeTab === "dispatched") {
      setActiveTab("all");
    }
  }, [dispatchedCount, activeTab]);

  // Tab filtering
  const tabFiltered = useMemo(() => {
    switch (activeTab) {
      case "dispatched":
        return openHazards.filter((row) => Boolean(row.dispatched_at));
      case "blocked":
        return openHazards.filter((row) => row.is_road_blocked);
      case "critical":
        return openHazards.filter((row) => row.urgency === "CRITICAL");
      case "resolved":
        return resolvedHazards;
      case "all":
      default:
        return openHazards;
    }
  }, [activeTab, openHazards, resolvedHazards]);

  // Search and ward filtering
  const displayedHazards = useMemo(() => {
    let result = tabFiltered;

    if (selectedWard !== "all") {
      result = result.filter((row) => row.ward_id === selectedWard);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((row) => {
        const cat = categoryLabel(row.category).toLowerCase();
        const ward = wardShort(row.ward_id).toLowerCase();
        const desc = (row.description || "").toLowerCase();
        const id = row.id.toLowerCase();
        return cat.includes(q) || ward.includes(q) || desc.includes(q) || id.includes(q);
      });
    }

    return sortCrewQueue(result, userLocation, sortMode);
  }, [tabFiltered, selectedWard, searchQuery, userLocation, sortMode]);

  const theme = ROLE_THEME.crew;
  const Icon = theme.icon;

  return (
    <PublicShell>
      {/* Top Banner & Navigation Header */}
      <div className={cn("border-t-4 px-5 pb-3 pt-6 lg:px-8 lg:pt-8", theme.accent)}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              title="Return to Home Portal"
              className="flex h-10 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>

            <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md", theme.iconBg, theme.glow)}>
              <Icon className="h-5 w-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <p className={cn("text-[10px] font-extrabold uppercase tracking-widest", theme.chipText)}>
                  {theme.label} Command
                </p>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                  <span className={cn("h-1.5 w-1.5 rounded-full bg-emerald-500", live && "animate-ping")} />
                  {live ? "Live Sync" : "Syncing"}
                </span>
              </div>
              <h1 className="text-lg font-extrabold text-slate-900 lg:text-2xl">Field Response Queue</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle: List vs Tactical Map */}
            <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-100 p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all",
                  viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all",
                  viewMode === "map" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <MapIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>

            <form action="/api/dashboard/logout" method="post">
              <button
                type="submit"
                title="Log out"
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-800 active:scale-95"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Triage Status Pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("dispatched")}
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-extrabold transition-all active:scale-95 shadow-sm",
              activeTab === "dispatched"
                ? "border-indigo-600 bg-indigo-600 text-white shadow-indigo-200"
                : "border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/70"
            )}
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Dispatched Priority</span>
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px]",
                activeTab === "dispatched" ? "bg-white text-indigo-700" : "bg-indigo-200 text-indigo-900"
              )}
            >
              {dispatchedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("blocked")}
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-extrabold transition-all active:scale-95 shadow-sm",
              activeTab === "blocked"
                ? "border-rose-600 bg-rose-600 text-white shadow-rose-200"
                : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Roads Blocked</span>
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px]",
                activeTab === "blocked" ? "bg-white text-rose-700" : "bg-rose-200 text-rose-900"
              )}
            >
              {blockedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("critical")}
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-extrabold transition-all active:scale-95 shadow-sm",
              activeTab === "critical"
                ? "border-amber-600 bg-amber-600 text-white shadow-amber-200"
                : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>High Risk</span>
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px]",
                activeTab === "critical" ? "bg-white text-amber-700" : "bg-amber-200 text-amber-900"
              )}
            >
              {criticalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-extrabold transition-all active:scale-95 shadow-sm",
              activeTab === "all"
                ? "border-slate-800 bg-slate-800 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <span>All Open Tasks</span>
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px]",
                activeTab === "all" ? "bg-white text-slate-900" : "bg-slate-100 text-slate-700"
              )}
            >
              {openHazards.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("resolved")}
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-extrabold transition-all active:scale-95 shadow-sm",
              activeTab === "resolved"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Resolved Today</span>
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px]",
                activeTab === "resolved" ? "bg-white text-emerald-700" : "bg-slate-100 text-slate-700"
              )}
            >
              {resolvedHazards.length}
            </span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by street, ward, hazard, or #ID..."
              className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-9 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Wards (Colombo)</option>
              <option value="ward_01">Ward 01 - Colombo North</option>
              <option value="ward_02">Ward 02 - Colombo South</option>
              <option value="ward_03">Ward 03 - Colombo Central</option>
            </select>

            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortOption)}
              className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="priority">Sort: Priority First</option>
              <option value="nearest">Sort: Nearest to Me</option>
              <option value="newest">Sort: Most Recent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area: List View or Map View */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-12 pt-3 lg:px-8">
        {viewMode === "map" ? (
          <div className="h-[600px] w-full">
            <CrewMap
              hazards={displayedHazards}
              userLocation={userLocation}
              selectedId={focusedId}
              onSelectTicket={(id) => setFocusedId(id)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {displayedHazards.map((ticket) => {
              const isDispatched = Boolean(ticket.dispatched_at);
              const isBlocked = ticket.is_road_blocked;
              const distanceKm = userLocation
                ? haversineKm(userLocation, [ticket.lat, ticket.lng]).toFixed(1)
                : null;
              const note = latestDispatchNote(ticket);

              return (
                <div
                  key={ticket.id}
                  className={cn(
                    "relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-white p-5 shadow-soft transition-all duration-200 hover:shadow-md",
                    isDispatched
                      ? "border-indigo-300 ring-2 ring-indigo-100/80 bg-gradient-to-b from-indigo-50/20 to-white"
                      : "border-slate-200/90",
                    isBlocked && "border-l-4 border-l-rose-500"
                  )}
                >
                  {/* Top Bar on Card */}
                  <div>
                    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10px] font-extrabold text-slate-400">
                          #{ticket.id.slice(0, 8).toUpperCase()}
                        </span>
                        <StatusBadge status={ticket.status} />
                        <UrgencyBadge urgency={ticket.urgency} />

                        {isDispatched && (
                          <Badge className="bg-indigo-600 text-white font-extrabold shadow-sm">
                            <Truck className="mr-1 h-3 w-3" />
                            DISPATCHED
                          </Badge>
                        )}

                        {isBlocked && (
                          <Badge className="bg-rose-500 text-white font-extrabold shadow-sm">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            ROAD BLOCKED
                          </Badge>
                        )}
                      </div>

                      {distanceKm && (
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          <MapPin className="h-3 w-3 text-slate-400" />
                          {distanceKm} km away
                        </span>
                      )}
                    </div>

                    {/* Card Body: Thumbnail + Info */}
                    <div className="flex items-start gap-4">
                      {ticket.photo_url ? (
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                          <img
                            src={ticket.photo_url}
                            alt="Scene evidence"
                            className="h-full w-full object-cover transition-transform duration-200 hover:scale-110"
                          />
                        </div>
                      ) : (
                        <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-400">
                          <Radio className="h-5 w-5 mb-1 text-slate-300" />
                          <span className="text-[9px] font-bold uppercase tracking-wider">No Photo</span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                          {categoryLabel(ticket.category)}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          📍 {wardShort(ticket.ward_id)} · {timeAgo(ticket.created_at)}
                        </p>
                        {ticket.description && (
                          <p className="mt-1 text-xs font-medium text-slate-600 line-clamp-2">
                            {ticket.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Officer Dispatch Instruction Callout */}
                    {isDispatched && (
                      <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 p-2.5">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-800">
                          Officer Order:
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-indigo-950">
                          {note || "Dispatch requested — proceed to clear site and photograph resolution."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Quick Action Buttons */}
                  <div className="mt-4 flex items-center gap-2 pt-3 border-t border-slate-100">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${ticket.lat},${ticket.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open Google Maps Turn-by-Turn"
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-extrabold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95"
                    >
                      <Navigation className="h-3.5 w-3.5 text-blue-600" />
                      <span>Navigate</span>
                    </a>

                    <Link
                      href={`/crew/${ticket.id}`}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-2.5 text-xs font-extrabold text-white shadow-md transition-all hover:bg-slate-800 active:scale-95"
                    >
                      <span>{ticket.status === "RESOLVED" ? "View Completed Case" : "Resolve Task"}</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}

            {displayedHazards.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-slate-300 mb-2" />
                <h4 className="text-sm font-extrabold text-slate-700">No tasks match your criteria</h4>
                <p className="mt-1 text-xs font-medium text-slate-400 max-w-sm">
                  {activeTab === "dispatched"
                    ? "There are currently no active dispatches assigned to field crews. Check 'All Open Tasks' to view neighborhood reports."
                    : "Try adjusting your search keywords, ward filter, or active triage tab."}
                </p>
                {activeTab === "dispatched" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-indigo-700 shadow-sm"
                  >
                    View All Open Tasks ({openHazards.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
