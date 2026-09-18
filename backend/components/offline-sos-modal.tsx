"use client";

import { AlertTriangle, Download, Loader2, MapPin, QrCode, Radio, RefreshCw, ShieldAlert, Sparkles, Users, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { Modal } from "./ui/modal";
import { Button } from "./ui/button";
import type { DataMuleBeacon, HazardCategory, Urgency, WardId } from "@/lib/types";
import { nearestWard, WARD_CENTERS } from "@/lib/geo";
import { WARDS, wardShort } from "@/lib/format";

interface OfflineSosModalProps {
  open: boolean;
  onClose: () => void;
  defaultWard?: WardId;
  defaultLat?: number;
  defaultLng?: number;
}

export function OfflineSosModal({
  open,
  onClose,
  defaultWard = "ward_01",
  defaultLat = 6.9535,
  defaultLng = 79.8732,
}: OfflineSosModalProps) {
  const [wardId, setWardId] = useState<WardId>(defaultWard);
  const [lat, setLat] = useState<number>(defaultLat);
  const [lng, setLng] = useState<number>(defaultLng);
  const [gpsStatus, setGpsStatus] = useState<"live" | "ward" | "detecting">("detecting");
  const [category, setCategory] = useState<HazardCategory>("FLOOD");
  const [peopleCount, setPeopleCount] = useState(3);
  const [medicalPriority, setMedicalPriority] = useState<Urgency>("CRITICAL");
  const [description, setDescription] = useState("Stranded on upper floor, floodwater rising, elderly person needs evacuation");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [beaconId, setBeaconId] = useState<string>("");

  const acquireGps = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGpsStatus("ward");
      return;
    }
    setGpsStatus("detecting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const liveLat = Number(pos.coords.latitude.toFixed(5));
        const liveLng = Number(pos.coords.longitude.toFixed(5));
        setLat(liveLat);
        setLng(liveLng);
        const autoWard = nearestWard(liveLat, liveLng);
        setWardId(autoWard);
        setGpsStatus("live");
      },
      (err) => {
        console.warn("Live GPS unavailable, using ward fallback:", err.message);
        setGpsStatus("ward");
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    if (!open) return;
    acquireGps();
  }, [open]);

  const handleWardChange = (newWard: WardId) => {
    setWardId(newWard);
    if (gpsStatus !== "live") {
      const center = WARD_CENTERS[newWard];
      if (center) {
        setLat(center[0]);
        setLng(center[1]);
      }
    }
  };

  useEffect(() => {
    if (!open) return;

    const id = `beacon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setBeaconId(id);

    const payload: DataMuleBeacon = {
      id,
      type: "FENDER_SOS_BEACON",
      lat,
      lng,
      ward_id: wardId,
      category,
      help_request: true,
      description,
      estimated_people: peopleCount,
      medical_priority: medicalPriority,
      created_at: new Date().toISOString(),
    };

    void QRCode.toDataURL(JSON.stringify(payload), {
      width: 320,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    }).then(setQrDataUrl);
  }, [open, wardId, lat, lng, category, peopleCount, medicalPriority, description]);

  return (
    <Modal open={open} onClose={onClose} className="sm:max-w-lg">
      <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
        {/* Header (shrink-0) */}
        <div className="shrink-0 border-b border-slate-800 bg-slate-900 px-5 py-4 text-white sm:px-6 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <Radio className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight">Offline SOS Beacon (Data Mule)</h3>
                <p className="text-[11px] font-bold text-slate-400">
                  Zero-Connectivity QR Emergency Transmission
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-800 p-1.5 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body (flex-1 min-h-0 overflow-y-auto) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {/* 1. QR Code Presentation FIRST - immediately visible to rescuers */}
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/40 p-4 sm:p-5 text-center">
            {qrDataUrl ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2.5 shadow-md">
                <img src={qrDataUrl} alt="Emergency SOS QR Beacon" className="h-44 w-44 sm:h-52 sm:w-52 object-contain" />
              </div>
            ) : (
              <div className="flex h-44 w-44 sm:h-52 sm:w-52 items-center justify-center">
                <Radio className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <span className="font-mono text-xs font-black text-slate-900">
                #{beaconId.slice(0, 14).toUpperCase()}
              </span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 uppercase">
                {medicalPriority} Urgency
              </span>
            </div>

            {/* Accurate Location Display & Refresh */}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-center">
              {gpsStatus === "live" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-800 border border-emerald-300">
                  <MapPin className="h-3 w-3 text-emerald-600" />
                  <span>Live GPS: {lat.toFixed(4)}, {lng.toFixed(4)}</span>
                </span>
              ) : gpsStatus === "detecting" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800 border border-amber-300">
                  <Loader2 className="h-3 w-3 animate-spin text-amber-600" />
                  <span>Locking GPS Satellites...</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                  <MapPin className="h-3 w-3 text-slate-500" />
                  <span>{wardShort(wardId)} Sector: {lat.toFixed(4)}, {lng.toFixed(4)}</span>
                </span>
              )}

              <button
                type="button"
                onClick={acquireGps}
                className="inline-flex items-center gap-1 text-[10px] font-extrabold text-purple-700 hover:text-purple-900 bg-purple-100/80 px-2 py-0.5 rounded-full"
                title="Re-acquire current satellite GPS"
              >
                <RefreshCw className="h-2.5 w-2.5" />
                <span>Refresh GPS</span>
              </button>
            </div>

            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              Sector: {wardShort(wardId)} · Headcount: {peopleCount} Persons
            </p>
          </div>

          {/* 2. Instructions banner */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-3.5 sm:p-4 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-4.5 w-4.5 text-purple-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-extrabold text-purple-950">How This Rescues You When Cell Towers Fail:</p>
                <p className="font-medium leading-relaxed text-purple-800 text-[11px] sm:text-xs">
                  Show this screen to any <strong>rescue boat, army personnel, or municipal crew</strong>. Their device will scan and store your SOS token locally as a <strong>"Data Mule"</strong>. The moment their vehicle reaches cell range, your emergency details are instantly relayed to the Colombo Municipal Command Center.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Rapid Tweak Controls */}
          <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 sm:p-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Beacon Telemetry Tuning
            </h4>

            {/* Ward / Sector Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Your Sector / Ward Area
              </label>
              <select
                value={wardId}
                onChange={(e) => handleWardChange(e.target.value as WardId)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900"
              >
                {WARDS.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Estimated People</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={peopleCount}
                    onChange={(e) => setPeopleCount(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Medical Condition</label>
                <select
                  value={medicalPriority}
                  onChange={(e) => setMedicalPriority(e.target.value as Urgency)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                >
                  <option value="CRITICAL">Critical / Elderly / Infant</option>
                  <option value="MEDIUM">Standard / Trapped</option>
                  <option value="LOW">Shelter Relocation Only</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Stranded Situation Note</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900"
                placeholder="Briefly describe situation (e.g. on roof, water 4 feet high)..."
              />
            </div>
          </div>
        </div>

        {/* Footer (shrink-0) */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold text-slate-500 truncate">
            Keep screen bright for passing responders
          </p>
          <Button type="button" variant="gradient" onClick={onClose} className="px-5 py-2 text-xs font-extrabold shrink-0">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
