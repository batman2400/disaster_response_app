"use client";

import { useEffect, useRef, useState } from "react";

import { wardName } from "@/lib/format";
import { SAFE_ROUTES, type ShelterWithCoords } from "@/lib/safe-routes";
import type { HazardRow } from "@/lib/types";

const COLOMBO: [number, number] = [6.9271, 79.8612];
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyLeaflet = any;

function loadLeaflet(): Promise<AnyLeaflet> {
  if (typeof window !== "undefined" && (window as unknown as { L?: AnyLeaflet }).L) {
    return Promise.resolve((window as unknown as { L: AnyLeaflet }).L);
  }
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
        const L = (window as unknown as { L?: AnyLeaflet }).L;
        if (L) resolve(L);
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
      const L = (window as unknown as { L?: AnyLeaflet }).L;
      if (L) resolve(L);
      else reject(new Error("Leaflet missing"));
    };
    script.onerror = () => reject(new Error("Leaflet failed"));
    document.body.appendChild(script);
  });
}


function getShelterColor(shelter: ShelterWithCoords): string {
  const free = shelter.total_beds - shelter.occupied_beds;
  const ratio = shelter.total_beds > 0 ? free / shelter.total_beds : 0;
  if (free <= 5 || shelter.supplies_status === "CRITICAL") return "#ef4444"; // Crimson (Critical)
  if (ratio < 0.25 || shelter.supplies_status === "LOW") return "#f59e0b"; // Amber (Warning)
  return "#10b981"; // Emerald (Safe)
}

export function ReliefMap({
  shelters,
  selectedShelterId,
  onSelectShelter,
  helpRequests = [],
  focusCoords,
  className,
}: {
  shelters: ShelterWithCoords[];
  selectedShelterId?: string | null;
  onSelectShelter?: (shelterId: string) => void;
  helpRequests?: HazardRow[];
  focusCoords?: [number, number] | null;
  className?: string;
}) {
  const [mode, setMode] = useState<"loading" | "map" | "list">("loading");
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AnyLeaflet | null>(null);
  const shelterMarkersRef = useRef(new Map<string, AnyLeaflet>());
  const requestMarkersRef = useRef(new Map<string, AnyLeaflet>());
  const polylinesRef = useRef<AnyLeaflet[]>([]);

  const sheltersRef = useRef(shelters);
  const selectedRef = useRef(selectedShelterId);
  const onSelectRef = useRef(onSelectShelter);
  const requestsRef = useRef(helpRequests);

  sheltersRef.current = shelters;
  selectedRef.current = selectedShelterId;
  onSelectRef.current = onSelectShelter;
  requestsRef.current = helpRequests;

  function syncAll(L: AnyLeaflet, map: AnyLeaflet) {
    const currentShelters = sheltersRef.current;
    const keepShelters = new Set(currentShelters.map((s) => s.id));

    // Remove dead shelter markers
    for (const [id, marker] of shelterMarkersRef.current) {
      if (!keepShelters.has(id)) {
        marker.remove();
        shelterMarkersRef.current.delete(id);
      }
    }

    // Sync shelters
    for (const shelter of currentShelters) {
      const isSelected = shelter.id === selectedRef.current;
      const free = shelter.total_beds - shelter.occupied_beds;
      const color = getShelterColor(shelter);
      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; min-width: 170px; padding: 2px;">
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">${shelter.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">${wardName(shelter.ward_id)}</div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 4px;">
            <span>Available Beds:</span>
            <span style="color: ${color}">${free} / ${shelter.total_beds}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 8px;">
            <span>Supplies:</span>
            <span style="color: ${shelter.supplies_status === "CRITICAL" ? "#ef4444" : shelter.supplies_status === "LOW" ? "#f59e0b" : "#10b981"}">${shelter.supplies_status}</span>
          </div>
        </div>
      `;

      let marker = shelterMarkersRef.current.get(shelter.id);
      if (!marker) {
        marker = L.circleMarker([shelter.lat, shelter.lng], {
          radius: isSelected ? 14 : 11,
          color: "#ffffff",
          weight: 3,
          fillColor: color,
          fillOpacity: 0.95,
        }).addTo(map);

        marker.bindPopup(popupHtml);
        const id = shelter.id;
        marker.on("click", () => {
          onSelectRef.current?.(id);
        });
        shelterMarkersRef.current.set(shelter.id, marker);
      } else {
        marker.setLatLng([shelter.lat, shelter.lng]);
        marker.setStyle({
          radius: isSelected ? 14 : 11,
          weight: isSelected ? 4 : 3,
          color: isSelected ? "#0f172a" : "#ffffff",
          fillColor: color,
        });
        marker.bindPopup(popupHtml);
      }
    }

    // Sync active help request pins
    const currentRequests = requestsRef.current;
    const keepRequests = new Set(currentRequests.map((r) => r.id));
    for (const [id, marker] of requestMarkersRef.current) {
      if (!keepRequests.has(id)) {
        marker.remove();
        requestMarkersRef.current.delete(id);
      }
    }

    for (const req of currentRequests) {
      let marker = requestMarkersRef.current.get(req.id);
      const reqPopup = `
        <div style="font-family: system-ui, sans-serif; min-width: 150px;">
          <div style="font-weight: 800; font-size: 12px; color: #e11d48;">Help Request</div>
          <div style="font-size: 11px; color: #334155; margin-top: 2px;">${req.description || "Evacuation needed"}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">${wardName(req.ward_id)}</div>
        </div>
      `;

      if (!marker) {
        marker = L.circleMarker([req.lat, req.lng], {
          radius: 8,
          color: "#ffffff",
          weight: 2,
          fillColor: "#f43f5e",
          fillOpacity: 0.95,
        }).addTo(map);
        marker.bindPopup(reqPopup);
        requestMarkersRef.current.set(req.id, marker);
      } else {
        marker.setLatLng([req.lat, req.lng]);
        marker.bindPopup(reqPopup);
      }
    }

    // Safe routes lines
    for (const line of polylinesRef.current) {
      line.remove();
    }
    polylinesRef.current = [];
    if (L.polyline) {
      Object.values(SAFE_ROUTES).forEach((route) => {
        if (route.length >= 2) {
          const line = L.polyline(route, {
            color: "#10b981",
            weight: 4,
            opacity: 0.75,
            dashArray: "6, 6",
          }).addTo(map);
          polylinesRef.current.push(line);
        }
      });
    }
  }

  useEffect(() => {
    let cancelled = false;
    let map: AnyLeaflet | null = null;

    void loadLeaflet()
      .then((L) => {
        const el = hostRef.current;
        if (cancelled || !el) return;
        map = L.map(el, { zoomControl: true, attributionControl: false });
        map.setView(COLOMBO, 13);
        L.tileLayer(TILES, { maxZoom: 19 }).addTo(map);
        mapRef.current = map;
        syncAll(L, map);
        window.setTimeout(() => map?.invalidateSize(), 100);
        setMode("map");
      })
      .catch(() => {
        if (!cancelled) setMode("list");
      });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      shelterMarkersRef.current.clear();
      requestMarkersRef.current.clear();
      polylinesRef.current = [];
    };
  }, []);

  useEffect(() => {
    const L = typeof window !== "undefined" ? (window as unknown as { L?: AnyLeaflet }).L : null;
    const map = mapRef.current;
    if (!L || !map) return;
    syncAll(L, map);
  }, [shelters, selectedShelterId, helpRequests]);

  useEffect(() => {
    if (focusCoords && mapRef.current) {
      mapRef.current.setView(focusCoords, 15, { animate: true });
    }
  }, [focusCoords]);

  if (mode === "list") {
    return (
      <div className={className ?? "relative h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4"}>
        <p className="text-xs font-bold text-slate-500 mb-2">Shelter Locations (Map offline):</p>
        <div className="grid grid-cols-2 gap-2">
          {shelters.map((s) => (
            <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-2.5">
              <strong className="text-xs font-bold text-slate-800">{s.name}</strong>
              <p className="text-[11px] text-slate-500">{s.total_beds - s.occupied_beds} free beds</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={className ?? "relative h-72 w-full overflow-hidden rounded-3xl border border-slate-200 shadow-sm"}>
      {mode === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-xs font-bold text-slate-400">
          Loading logistics map…
        </div>
      ) : null}
      <div ref={hostRef} className="h-full w-full" />
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 backdrop-blur-md text-[11px] font-bold text-slate-700 shadow-sm">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> &gt;30% Free
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> &lt;25% Free
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Full / Critical
        </span>
        <span className="hidden sm:flex items-center gap-1 border-l border-slate-200 pl-2 text-slate-500">
          <span className="h-0.5 w-3 bg-emerald-500" /> Evac Routes
        </span>
      </div>
    </div>
  );
}
