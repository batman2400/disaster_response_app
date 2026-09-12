"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { categoryLabel, PIN_COLORS, wardShort } from "@/lib/format";
import type { HazardRow } from "@/lib/types";

const COLOMBO = { lat: 6.9271, lng: 79.8612 };

const DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0b1624" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9aa8b8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#07111c" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#24344a" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#173049" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9aa8b8" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#07111c" }] },
];

type GMaps = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => GMap;
  Marker: new (opts: Record<string, unknown>) => GMarker;
  Size: new (w: number, h: number) => unknown;
  Point: new (x: number, y: number) => unknown;
};

type GMap = {
  panTo: (latLng: { lat: number; lng: number }) => void;
};

type GMarker = {
  setMap: (map: GMap | null) => void;
  setPosition: (p: { lat: number; lng: number }) => void;
  setIcon: (icon: unknown) => void;
  setTitle: (title: string) => void;
  addListener: (event: string, fn: () => void) => void;
};

type LeafletMap = {
  setView: (latLng: [number, number], zoom?: number) => void;
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
    google?: { maps: GMaps };
    gm_authFailure?: () => void;
    L?: LeafletNS;
  }
}

function svgPin(color: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40"><path fill="${color}" stroke="#07111C" stroke-width="1.2" d="M14 1.5C7.1 1.5 1.5 7.1 1.5 14c0 9.6 12.5 23.6 12.5 23.6S26.5 23.6 26.5 14C26.5 7.1 20.9 1.5 14 1.5z"/><circle fill="#F4F7FB" cx="14" cy="14" r="4.5"/></svg>`,
  )}`;
}

export function OfficerMap({
  hazards,
  selectedId,
  onSelect,
}: {
  hazards: HazardRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? "";
  const [engine, setEngine] = useState<"google" | "leaflet" | "list">(key ? "google" : "leaflet");
  const hostRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<GMap | null>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const googleMarkersRef = useRef(new Map<string, GMarker>());
  const leafletMarkersRef = useRef(new Map<string, LeafletMarker>());
  const hazardsRef = useRef(hazards);
  const selectedRef = useRef(selectedId);
  const selectRef = useRef(onSelect);
  hazardsRef.current = hazards;
  selectedRef.current = selectedId;
  selectRef.current = onSelect;

  function syncGoogle() {
    const g = window.google?.maps;
    const map = googleMapRef.current;
    if (!g || !map) return;
    const rows = hazardsRef.current;
    const keep = new Set(rows.map((hazard) => hazard.id));
    for (const [id, marker] of googleMarkersRef.current) {
      if (!keep.has(id)) {
        marker.setMap(null);
        googleMarkersRef.current.delete(id);
      }
    }
    for (const hazard of rows) {
      const pos = { lat: hazard.lat, lng: hazard.lng };
      const icon = {
        url: svgPin(PIN_COLORS[hazard.status]),
        scaledSize: new g.Size(28, 40),
        anchor: new g.Point(14, 40),
      };
      let marker = googleMarkersRef.current.get(hazard.id);
      if (!marker) {
        marker = new g.Marker({ map, position: pos, icon, title: `${hazard.category} · ${hazard.status}` });
        const id = hazard.id;
        marker.addListener("click", () => selectRef.current(id));
        googleMarkersRef.current.set(hazard.id, marker);
      } else {
        marker.setPosition(pos);
        marker.setIcon(icon);
        marker.setTitle(`${hazard.category} · ${hazard.status}`);
      }
    }
    const chosen = rows.find((hazard) => hazard.id === selectedRef.current);
    if (chosen) map.panTo({ lat: chosen.lat, lng: chosen.lng });
  }

  function initGoogle() {
    const g = window.google?.maps;
    const el = hostRef.current;
    if (!g || !el) return;
    if (!googleMapRef.current) {
      googleMapRef.current = new g.Map(el, {
        center: COLOMBO,
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: true,
        styles: DARK_STYLE,
        backgroundColor: "#07111C",
      });
    }
    syncGoogle();
    window.setTimeout(() => {
      if (el.querySelector(".gm-err-container")) setEngine("leaflet");
    }, 1400);
  }

  function syncLeaflet() {
    const L = window.L;
    const map = leafletMapRef.current;
    if (!L || !map) return;
    const rows = hazardsRef.current;
    const keep = new Set(rows.map((hazard) => hazard.id));
    for (const [id, marker] of leafletMarkersRef.current) {
      if (!keep.has(id)) {
        marker.remove();
        leafletMarkersRef.current.delete(id);
      }
    }
    for (const hazard of rows) {
      const color = PIN_COLORS[hazard.status];
      let marker = leafletMarkersRef.current.get(hazard.id);
      if (!marker) {
        marker = L.circleMarker([hazard.lat, hazard.lng], {
          radius: 8,
          color: "#07111C",
          weight: 1,
          fillColor: color,
          fillOpacity: 1,
        }).addTo(map);
        const id = hazard.id;
        marker.on("click", () => selectRef.current(id));
        leafletMarkersRef.current.set(hazard.id, marker);
      } else {
        marker.setLatLng([hazard.lat, hazard.lng]);
        marker.setStyle({ fillColor: color });
      }
    }
    const chosen = rows.find((hazard) => hazard.id === selectedRef.current);
    if (chosen) map.setView([chosen.lat, chosen.lng], 14);
  }

  function initLeaflet() {
    const L = window.L;
    const el = hostRef.current;
    if (!L || !el) return;
    if (!leafletMapRef.current) {
      googleMapRef.current = null;
      googleMarkersRef.current.clear();
      el.innerHTML = "";
      const map = L.map(el, { zoomControl: true, attributionControl: false });
      map.setView([COLOMBO.lat, COLOMBO.lng], 12);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
      leafletMapRef.current = map;
    }
    syncLeaflet();
  }

  useEffect(() => {
    window.gm_authFailure = () => setEngine("leaflet");
    return () => {
      window.gm_authFailure = undefined;
    };
  }, []);

  useEffect(() => {
    if (engine === "google" && window.google?.maps) initGoogle();
    if (engine === "leaflet" && window.L) initLeaflet();
  }, [engine]);

  useEffect(() => {
    if (engine === "google") syncGoogle();
    if (engine === "leaflet") syncLeaflet();
  }, [engine, hazards, selectedId]);

  useEffect(() => {
    if (engine !== "leaflet") return;
    if (window.L) {
      initLeaflet();
      return;
    }
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => initLeaflet();
    script.onerror = () => setEngine("list");
    document.body.appendChild(script);
  }, [engine]);

  if (engine === "list") {
    return (
      <div className="officer-map">
        <div className="officer-map-fallback">
          <p className="dash-kicker">MAP PINS</p>
          {hazards.length === 0 ? (
            <p className="sub">No pins.</p>
          ) : (
            hazards.map((hazard) => (
              <button
                key={hazard.id}
                type="button"
                className={`pin-row${selectedId === hazard.id ? " on" : ""}`}
                onClick={() => onSelect(hazard.id)}
              >
                <span className="pin-dot" style={{ background: PIN_COLORS[hazard.status] }} />
                <span>
                  {categoryLabel(hazard.category)} · {hazard.status}
                  <br />
                  <span className="meta">{wardShort(hazard.ward_id)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="officer-map">
      {engine === "google" && key ? (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${key}&loading=async`}
          strategy="afterInteractive"
          onLoad={() => initGoogle()}
          onError={() => setEngine("leaflet")}
        />
      ) : null}
      <div ref={hostRef} className="officer-map-canvas" />
    </div>
  );
}
