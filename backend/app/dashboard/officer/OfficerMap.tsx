"use client";

import { useEffect, useRef, useState } from "react";

import { categoryLabel, PIN_COLORS, wardShort } from "@/lib/format";
import type { HazardRow } from "@/lib/types";

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
  remove: () => void;
};

type LeafletNS = {
  map: (el: HTMLElement, opts: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, opts: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
  circleMarker: (latLng: [number, number], opts: Record<string, unknown>) => LeafletMarker;
};

declare global {
  interface Window {
    L?: LeafletNS;
  }
}

function loadLeaflet(): Promise<LeafletNS> {
  if (window.L) return Promise.resolve(window.L);
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
      existing.addEventListener("load", () => (window.L ? resolve(window.L) : reject(new Error("Leaflet missing"))));
      existing.addEventListener("error", () => reject(new Error("Leaflet failed")));
      return;
    }
    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => (window.L ? resolve(window.L) : reject(new Error("Leaflet missing")));
    script.onerror = () => reject(new Error("Leaflet failed"));
    document.body.appendChild(script);
  });
}

export function OfficerMap({
  hazards,
  selectedId,
  onSelect,
  className,
}: {
  hazards: HazardRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const [mode, setMode] = useState<"loading" | "map" | "list">("loading");
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef(new Map<string, LeafletMarker>());
  const hazardsRef = useRef(hazards);
  const selectedRef = useRef(selectedId);
  const selectRef = useRef(onSelect);
  hazardsRef.current = hazards;
  selectedRef.current = selectedId;
  selectRef.current = onSelect;

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
    };
  }, []);

  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;
    syncMarkers(L, map);
  }, [hazards, selectedId]);

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
