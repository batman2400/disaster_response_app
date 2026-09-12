import { createElement, useEffect, useRef, useState } from "react";

import { SAFE_ROUTES } from "@/lib/safe-routes";
import { colors } from "@/lib/theme";
import { COLOMBO_CENTER, PIN_COLORS, type HazardRow, type WardId } from "@/lib/types";

import type { HazardMapProps } from "./hazard-map-types";

const COLOMBO: [number, number] = [COLOMBO_CENTER.latitude, COLOMBO_CENTER.longitude];
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

type LeafletMap = {
  setView: (latLng: [number, number], zoom?: number) => void;
  invalidateSize: () => void;
  remove: () => void;
  on: (event: string, fn: (e: unknown) => void) => void;
};

type LeafletLayer = {
  addTo: (map: LeafletMap) => LeafletLayer;
  setLatLng?: (latLng: [number, number]) => void;
  setStyle?: (opts: Record<string, unknown>) => void;
  setRadius?: (r: number) => void;
  bindPopup?: (html: string) => void;
  remove: () => void;
  on?: (event: string, fn: (e: unknown) => void) => void;
};

type LeafletNS = {
  map: (el: HTMLElement, opts: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, opts: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
  circleMarker: (latLng: [number, number], opts: Record<string, unknown>) => LeafletLayer;
  polyline: (latLngs: [number, number][], opts: Record<string, unknown>) => LeafletLayer;
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

export function HazardMap({
  hazards,
  routeWards,
  selectedHazardId,
  onSelectHazard,
  focusCoords,
}: HazardMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef(new Map<string, LeafletLayer>());
  const linesRef = useRef(new Map<string, LeafletLayer>());
  const hazardsRef = useRef(hazards);
  const routesRef = useRef(routeWards);
  const selectHandlerRef = useRef(onSelectHazard);
  const [ready, setReady] = useState(false);

  hazardsRef.current = hazards;
  routesRef.current = routeWards;
  selectHandlerRef.current = onSelectHazard;

  function sync(L: LeafletNS, map: LeafletMap) {
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
      const isSelected = selectedHazardId === hazard.id;
      let marker = markersRef.current.get(hazard.id);
      if (!marker) {
        marker = L.circleMarker([hazard.lat, hazard.lng], {
          radius: isSelected ? 12 : 8,
          color: "#FFFFFF",
          weight: isSelected ? 3 : 2,
          fillColor: color,
          fillOpacity: 1,
        }).addTo(map);

        const currentHazard = hazard;
        marker.on?.("click", (e) => {
          if (e && typeof (e as { originalEvent?: Event }).originalEvent?.stopPropagation === "function") {
            (e as { originalEvent: Event }).originalEvent.stopPropagation();
          }
          selectHandlerRef.current?.(currentHazard);
        });

        markersRef.current.set(hazard.id, marker);
      } else {
        marker.setLatLng?.([hazard.lat, hazard.lng]);
        marker.setStyle?.({
          fillColor: color,
          radius: isSelected ? 12 : 8,
          weight: isSelected ? 3 : 2,
        });
      }
    }

    const active = new Set<WardId>(routesRef.current);
    for (const [id, line] of linesRef.current) {
      if (!active.has(id as WardId)) {
        line.remove();
        linesRef.current.delete(id);
      }
    }
    for (const wardId of routesRef.current) {
      const points = SAFE_ROUTES[wardId].map((point) => [point.latitude, point.longitude] as [number, number]);
      let line = linesRef.current.get(wardId);
      if (!line) {
        line = L.polyline(points, {
          color: colors.green,
          weight: 3,
          dashArray: "8,6",
        }).addTo(map);
        linesRef.current.set(wardId, line);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;

    void loadLeaflet()
      .then((L) => {
        const el = hostRef.current;
        if (cancelled || !el) return;
        map = L.map(el, { zoomControl: false, attributionControl: false });
        map.setView(COLOMBO, 12);
        L.tileLayer(TILES, { maxZoom: 19 }).addTo(map);

        map.on("click", () => {
          selectHandlerRef.current?.(null);
        });

        mapRef.current = map;
        sync(L, map);
        window.setTimeout(() => map?.invalidateSize(), 80);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markersRef.current.clear();
      linesRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;
    sync(L, map);
    window.setTimeout(() => map.invalidateSize(), 80);
  }, [hazards, routeWards, selectedHazardId]);

  useEffect(() => {
    if (focusCoords && mapRef.current) {
      mapRef.current.setView(
        [focusCoords.latitude, focusCoords.longitude],
        focusCoords.zoom ?? 14,
      );
    }
  }, [focusCoords]);

  return createElement(
    "div",
    {
      style: {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        background: colors.bg,
      },
    },
    ready
      ? null
      : createElement(
          "div",
          {
            style: {
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              color: colors.muted,
              fontWeight: 700,
              fontSize: 13,
            },
          },
          "Loading map…",
        ),
    createElement("div", {
      ref: hostRef,
      style: { position: "absolute", inset: 0, width: "100%", height: "100%" },
    }),
  );
}
