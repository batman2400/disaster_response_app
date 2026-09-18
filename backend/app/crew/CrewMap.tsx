"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Navigation, Truck } from "lucide-react";
import Link from "next/link";

import { categoryLabel, PIN_COLORS, wardShort } from "@/lib/format";
import { haversineKm } from "@/lib/geo";
import type { HazardRow } from "@/lib/types";

const COLOMBO_DEFAULT: [number, number] = [6.9271, 79.8612];
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

type LeafletMap = {
  setView: (latLng: [number, number], zoom?: number, opts?: Record<string, unknown>) => void;
  invalidateSize: () => void;
  remove: () => void;
};

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker;
  bindPopup: (content: string | HTMLElement, opts?: Record<string, unknown>) => LeafletMarker;
  openPopup: () => LeafletMarker;
  on: (event: string, fn: () => void) => void;
  remove: () => void;
};

type LeafletNS = {
  map: (el: HTMLElement, opts: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, opts: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
  circleMarker: (latLng: [number, number], opts: Record<string, unknown>) => LeafletMarker;
  divIcon: (opts: Record<string, unknown>) => unknown;
  marker: (latLng: [number, number], opts?: Record<string, unknown>) => LeafletMarker;
};

function getWindowL(): LeafletNS | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { L?: LeafletNS }).L;
}

function loadLeaflet(): Promise<LeafletNS> {
  const currentL = getWindowL();
  if (currentL) return Promise.resolve(currentL);
  return new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const existing = document.getElementById("leaflet-js") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => {
        const l = getWindowL();
        if (l) resolve(l);
        else reject(new Error("Leaflet missing"));
      });
      existing.addEventListener("error", () => reject(new Error("Leaflet failed")));
      return;
    }
    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => {
      const l = getWindowL();
      if (l) resolve(l);
      else reject(new Error("Leaflet missing"));
    };
    script.onerror = () => reject(new Error("Leaflet failed"));
    document.head.appendChild(script);
  });
}

export function CrewMap({
  hazards,
  userLocation,
  selectedId,
  onSelectTicket,
  onAssignTicket,
}: {
  hazards: HazardRow[];
  userLocation: [number, number] | null;
  selectedId: string | null;
  onSelectTicket?: (id: string) => void;
  onAssignTicket?: (ticket: HazardRow) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<HazardRow | null>(null);

  useEffect(() => {
    let active = true;

    loadLeaflet()
      .then((L) => {
        if (!active || !containerRef.current || mapRef.current) return;

        const center = userLocation || COLOMBO_DEFAULT;
        const map = L.map(containerRef.current, {
          center,
          zoom: 13,
          zoomControl: true,
          attributionControl: false,
        });

        L.tileLayer(TILES, {
          maxZoom: 19,
          subdomains: ["a", "b", "c"],
        }).addTo(map);

        mapRef.current = map;
        window.setTimeout(() => map.invalidateSize(), 200);
      })
      .catch((err) => console.error("Leaflet load error", err));

    return () => {
      active = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when hazards or userLocation changes
  useEffect(() => {
    const map = mapRef.current;
    const L = getWindowL();
    if (!map || !L) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // User location marker
    if (userLocation) {
      const userMarker = L.circleMarker(userLocation, {
        radius: 9,
        color: "#2563EB",
        weight: 3,
        fillColor: "#3B82F6",
        fillOpacity: 1,
      }).addTo(map);

      userMarker.bindPopup("<b>Field Crew Unit</b><br/>Your current position");
      markersRef.current.push(userMarker);
    }

    // Hazard markers
    hazards.forEach((hazard) => {
      const isDispatched = Boolean(hazard.dispatched_at);
      const isBlocked = hazard.is_road_blocked;
      const isSelected = selectedId === hazard.id;

      let color = isDispatched ? "#4F46E5" : PIN_COLORS[hazard.status] || "#64748B";
      if (isBlocked) color = "#DC2626";

      const radius = isSelected ? 12 : isDispatched ? 10 : 7;
      const weight = isSelected ? 4 : isDispatched ? 3 : 2;

      const marker = L.circleMarker([hazard.lat, hazard.lng], {
        radius,
        color: isSelected ? "#0F172A" : color,
        weight,
        fillColor: color,
        fillOpacity: isDispatched ? 0.9 : 0.75,
      }).addTo(map);

      marker.on("click", () => {
        setSelectedTicket(hazard);
        if (onSelectTicket) onSelectTicket(hazard.id);
      });

      markersRef.current.push(marker);
    });
  }, [hazards, userLocation, selectedId, onSelectTicket]);

  // Pan to selected ticket if changes
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const target = hazards.find((h) => h.id === selectedId);
    if (target) {
      mapRef.current.setView([target.lat, target.lng], 14, { animate: true });
      setSelectedTicket(target);
    }
  }, [selectedId, hazards]);

  const activeTicket = selectedTicket || hazards.find((h) => h.id === selectedId) || null;
  const distanceKm =
    userLocation && activeTicket
      ? haversineKm(userLocation, [activeTicket.lat, activeTicket.lng]).toFixed(1)
      : null;

  return (
    <div className="relative h-full w-full min-h-[440px] overflow-hidden rounded-3xl border border-slate-200 shadow-inner bg-slate-100">
      <div ref={containerRef} className="h-full w-full" />

      {/* Map Legend Overlay */}
      <div className="absolute top-3 left-3 z-[400] flex flex-wrap gap-1.5 rounded-2xl bg-white/90 p-2 text-[10px] font-bold text-slate-700 shadow-soft backdrop-blur-md">
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700">
          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
          Dispatched
        </span>
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-red-50 text-red-700">
          <span className="h-2 w-2 rounded-full bg-red-600" />
          Road Blocked
        </span>
        {userLocation && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-blue-50 text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Crew Unit
          </span>
        )}
      </div>

      {/* Selected Task Drawer / Popup */}
      {activeTicket && (
        <div className="absolute bottom-4 left-4 right-4 z-[400] mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-[10px] font-extrabold text-slate-400">
                  #{activeTicket.id.slice(0, 8).toUpperCase()}
                </span>
                {activeTicket.dispatched_at && (
                  <span className="flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700">
                    <Truck className="h-3 w-3" /> Dispatched
                  </span>
                )}
                {activeTicket.is_road_blocked && (
                  <span className="flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-extrabold text-red-700">
                    <AlertTriangle className="h-3 w-3" /> Road Blocked
                  </span>
                )}
                {distanceKm && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    📍 {distanceKm} km away
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-slate-900">{categoryLabel(activeTicket.category)}</h4>
              <p className="text-xs font-medium text-slate-500">
                {wardShort(activeTicket.ward_id)} · {activeTicket.description || "No description provided"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTicket(null)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-100">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activeTicket.lat},${activeTicket.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
            >
              <Navigation className="h-3.5 w-3.5 text-blue-600" />
              Navigate
            </a>
            {activeTicket.status !== "RESOLVED" && onAssignTicket ? (
              <button
                type="button"
                onClick={() => onAssignTicket(activeTicket)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100 shadow-sm"
              >
                <Truck className="h-3.5 w-3.5" />
                {activeTicket.assigned_crew_name ? "Reassign" : "Assign"}
              </button>
            ) : null}
            <Link
              href={`/crew/${activeTicket.id}`}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-bold text-white hover:bg-slate-800 shadow-sm"
            >
              Resolve Task
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
