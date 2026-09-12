"use client";

import { useEffect, useRef, useState } from "react";

import { categoryLabel, PIN_COLORS, wardShort } from "@/lib/format";
import type { HazardRow } from "@/lib/types";
import type { ShelterWithCoords } from "@/lib/safe-routes";

const COLOMBO: [number, number] = [6.9271, 79.8612];
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
  setLatLng: (latLng: [number, number]) => void;
  setStyle: (opts: Record<string, unknown>) => void;
  on: (event: string, fn: () => void) => void;
  bindTooltip?: (content: string, opts?: Record<string, unknown>) => void;
  remove: () => void;
};

type LeafletCircle = {
  addTo: (map: LeafletMap) => LeafletCircle;
  bindTooltip?: (content: string, opts?: Record<string, unknown>) => void;
  remove: () => void;
};

type LeafletPolyline = {
  addTo: (map: LeafletMap) => LeafletPolyline;
  remove: () => void;
};

type LeafletNS = {
  map: (el: HTMLElement, opts: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, opts: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
  circleMarker: (latLng: [number, number], opts: Record<string, unknown>) => LeafletMarker;
  circle?: (latLng: [number, number], opts: Record<string, unknown>) => LeafletCircle;
  polyline: (latLngs: [number, number][], opts?: Record<string, unknown>) => LeafletPolyline;
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
    document.body.appendChild(script);
  });
}

export type StyledRoute = {
  points: [number, number][];
  color?: string;
  dashArray?: string;
  weight?: number;
};

export type DangerZone = {
  lat: number;
  lng: number;
  radiusM?: number;
  label?: string;
};

export type WaypointInfo = {
  lat: number;
  lng: number;
  label?: string;
};

export function OfficerMap({
  hazards,
  selectedId,
  onSelect,
  shelters = [],
  onSelectShelter,
  selectedShelterId,
  safeRoutes = [],
  dangerZones = [],
  waypoint = null,
  focusCoords,
  className,
}: {
  hazards: HazardRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  shelters?: ShelterWithCoords[];
  onSelectShelter?: (shelter: ShelterWithCoords) => void;
  selectedShelterId?: string | null;
  safeRoutes?: Array<[number, number][] | StyledRoute>;
  dangerZones?: DangerZone[];
  waypoint?: WaypointInfo | null;
  focusCoords?: [number, number] | null;
  className?: string;
}) {
  const [mode, setMode] = useState<"loading" | "map" | "list">("loading");
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef(new Map<string, LeafletMarker>());
  const shelterMarkersRef = useRef(new Map<string, LeafletMarker>());
  const polylinesRef = useRef<LeafletPolyline[]>([]);
  const dangerCirclesRef = useRef<LeafletCircle[]>([]);
  const waypointMarkerRef = useRef<LeafletMarker | null>(null);

  const hazardsRef = useRef(hazards);
  const selectedRef = useRef(selectedId);
  const selectRef = useRef(onSelect);

  const sheltersRef = useRef(shelters);
  const selectedShelterRef = useRef(selectedShelterId);
  const selectShelterRef = useRef(onSelectShelter);

  const safeRoutesRef = useRef(safeRoutes);
  const dangerZonesRef = useRef(dangerZones);
  const waypointRef = useRef(waypoint);

  hazardsRef.current = hazards;
  selectedRef.current = selectedId;
  selectRef.current = onSelect;

  sheltersRef.current = shelters;
  selectedShelterRef.current = selectedShelterId;
  selectShelterRef.current = onSelectShelter;

  safeRoutesRef.current = safeRoutes;
  dangerZonesRef.current = dangerZones;
  waypointRef.current = waypoint;

  function syncMarkers(L: LeafletNS, map: LeafletMap) {
    const rows = hazardsRef.current;
    const keep = new Set(rows.map((hazard) => hazard.id));
    for (const [id, marker] of markersRef.current) {
      if (!keep.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
    for (const hazard of rows) {
      const color = PIN_COLORS[hazard.status];
      let marker = markersRef.current.get(hazard.id);
      if (!marker) {
        marker = L.circleMarker([hazard.lat, hazard.lng], {
          radius: 10,
          color: "#ffffff",
          weight: 3,
          fillColor: color,
          fillOpacity: 1,
        }).addTo(map);
        const id = hazard.id;
        marker.on("click", () => selectRef.current(id));
        markersRef.current.set(hazard.id, marker);
      } else {
        marker.setLatLng([hazard.lat, hazard.lng]);
        marker.setStyle({ fillColor: color });
      }
    }

    // Sync shelters
    const currentShelters = sheltersRef.current;
    const keepShelters = new Set(currentShelters.map((s) => s.id));
    for (const [id, marker] of shelterMarkersRef.current) {
      if (!keepShelters.has(id)) {
        marker.remove();
        shelterMarkersRef.current.delete(id);
      }
    }
    for (const shelter of currentShelters) {
      const isSelected = shelter.id === selectedShelterRef.current;
      let marker = shelterMarkersRef.current.get(shelter.id);
      if (!marker) {
        marker = L.circleMarker([shelter.lat, shelter.lng], {
          radius: isSelected ? 13 : 10,
          color: "#ffffff",
          weight: 3,
          fillColor: "#6366f1",
          fillOpacity: 0.95,
        }).addTo(map);
        const s = shelter;
        marker.on("click", () => selectShelterRef.current?.(s));
        shelterMarkersRef.current.set(shelter.id, marker);
      } else {
        marker.setLatLng([shelter.lat, shelter.lng]);
        marker.setStyle({
          radius: isSelected ? 13 : 10,
          fillColor: isSelected ? "#4338ca" : "#6366f1",
        });
      }
    }

    // Sync safe routes
    for (const line of polylinesRef.current) {
      line.remove();
    }
    polylinesRef.current = [];
    if (L.polyline && safeRoutesRef.current.length > 0) {
      for (const item of safeRoutesRef.current) {
        const isStyled = !Array.isArray(item);
        const pts = isStyled ? item.points : item;
        const color = isStyled ? item.color || "#10b981" : "#10b981";
        const weight = isStyled ? item.weight || 5 : 5;
        const dashArray = isStyled ? item.dashArray || "8, 8" : "8, 8";

        if (pts && pts.length >= 2) {
          const line = L.polyline(pts, {
            color,
            weight,
            opacity: 0.9,
            dashArray,
          }).addTo(map);
          polylinesRef.current.push(line);
        }
      }
    }

    // Sync danger zones (bypassed affected paths and roadblocks)
    for (const c of dangerCirclesRef.current) {
      c.remove();
    }
    dangerCirclesRef.current = [];
    if (L.circle && dangerZonesRef.current.length > 0) {
      for (const zone of dangerZonesRef.current) {
        const circle = L.circle([zone.lat, zone.lng], {
          radius: zone.radiusM || 250,
          color: "#ef4444",
          weight: 2,
          dashArray: "6, 6",
          fillColor: "#ef4444",
          fillOpacity: 0.16,
        }).addTo(map);
        if (zone.label && circle.bindTooltip) {
          circle.bindTooltip(`⚠️ Avoided Hazard: ${zone.label}`, {
            direction: "top",
          });
        }
        dangerCirclesRef.current.push(circle);
      }
    }

    // Sync High Ground Waypoint marker
    if (waypointMarkerRef.current) {
      waypointMarkerRef.current.remove();
      waypointMarkerRef.current = null;
    }
    if (waypointRef.current) {
      const wp = waypointRef.current;
      const marker = L.circleMarker([wp.lat, wp.lng], {
        radius: 12,
        color: "#ffffff",
        weight: 3,
        fillColor: "#059669",
        fillOpacity: 1,
      }).addTo(map);
      if (wp.label && marker.bindTooltip) {
        marker.bindTooltip(`🛡️ Elevated Safe Waypoint: ${wp.label}`, {
          permanent: true,
          direction: "top",
        });
      }
      waypointMarkerRef.current = marker;
    }

    const chosen = rows.find((hazard) => hazard.id === selectedRef.current);
    if (chosen) map.setView([chosen.lat, chosen.lng], 14);
  }

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;

    void loadLeaflet()
      .then((L) => {
        const el = hostRef.current;
        if (cancelled || !el) return;
        map = L.map(el, { zoomControl: true, attributionControl: false });
        map.setView(COLOMBO, 13);
        L.tileLayer(TILES, { maxZoom: 19 }).addTo(map);
        mapRef.current = map;
        syncMarkers(L, map);
        window.setTimeout(() => map?.invalidateSize(), 80);
        setMode("map");
      })
      .catch(() => {
        if (!cancelled) setMode("list");
      });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markersRef.current.clear();
      shelterMarkersRef.current.clear();
      polylinesRef.current = [];
      for (const c of dangerCirclesRef.current) {
        c.remove();
      }
      dangerCirclesRef.current = [];
      waypointMarkerRef.current?.remove();
      waypointMarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = getWindowL();
    const map = mapRef.current;
    if (!L || !map) return;
    syncMarkers(L, map);
  }, [hazards, selectedId, shelters, selectedShelterId, safeRoutes, dangerZones, waypoint]);

  useEffect(() => {
    if (focusCoords && mapRef.current) {
      mapRef.current.setView(focusCoords, 15, { animate: true });
    }
  }, [focusCoords]);

  if (mode === "list") {
    return (
      <div className={className ?? "absolute inset-0 overflow-y-auto bg-slate-50 p-4"}>
        {hazards.map((hazard) => (
          <button
            key={hazard.id}
            type="button"
            className="mb-2 flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left"
            onClick={() => onSelect(hazard.id)}
          >
            <span className="h-3 w-3 rounded-full" style={{ background: PIN_COLORS[hazard.status] }} />
            <span className="text-sm font-bold text-slate-800">
              {categoryLabel(hazard.category)} · {hazard.status}
              <br />
              <span className="text-xs font-medium text-slate-400">{wardShort(hazard.ward_id)}</span>
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={className ?? "absolute inset-0"}>
      {mode === "loading" ? (
        <p className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 text-xs font-bold text-slate-400">
          Loading map…
        </p>
      ) : null}
      <div ref={hostRef} className="h-full w-full" />
    </div>
  );
}
