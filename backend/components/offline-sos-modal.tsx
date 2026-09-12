"use client";

import { AlertTriangle, Download, QrCode, Radio, ShieldAlert, Sparkles, Users, X } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

import { Modal } from "./ui/modal";
import { Button } from "./ui/button";
import type { DataMuleBeacon, HazardCategory, Urgency, WardId } from "@/lib/types";

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
  const [category, setCategory] = useState<HazardCategory>("FLOOD");
  const [peopleCount, setPeopleCount] = useState(3);
  const [medicalPriority, setMedicalPriority] = useState<Urgency>("CRITICAL");
  const [description, setDescription] = useState("Stranded on upper floor, floodwater rising, elderly person needs evacuation");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [beaconId, setBeaconId] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    const id = `beacon_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setBeaconId(id);

    const payload: DataMuleBeacon = {
      id,
      type: "FENDER_SOS_BEACON",
      lat: defaultLat,
      lng: defaultLng,
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
  }, [open, wardId, category, peopleCount, medicalPriority, description, defaultLat, defaultLng]);

  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-100 bg-slate-900 px-6 py-5 text-white">
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

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {/* Instructions banner */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-4 text-xs">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-extrabold text-purple-950">How This Rescues You When Cell Towers Fail:</p>
                <p className="font-medium leading-relaxed text-purple-800">
                  Show this screen to any <strong>rescue boat, army personnel, or municipal crew</strong>. Their device will scan and store your SOS token locally as a <strong>"Data Mule"</strong>. The moment their vehicle reaches cell range, your emergency details are instantly relayed to the Colombo Municipal Command Center.
                </p>
              </div>
            </div>
          </div>

          {/* QR Code Presentation */}
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            {qrDataUrl ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
                <img src={qrDataUrl} alt="Emergency SOS QR Beacon" className="h-56 w-56 object-contain" />
              </div>
            ) : (
              <div className="flex h-56 w-56 items-center justify-center">
                <Radio className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            )}
            <div className="mt-4 flex items-center gap-2">
              <span className="font-mono text-xs font-black text-slate-900">
                #{beaconId.slice(0, 14).toUpperCase()}
              </span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700 uppercase">
                {medicalPriority} Urgency
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              GPS: {defaultLat.toFixed(4)}, {defaultLng.toFixed(4)} · Persons: {peopleCount}
            </p>
          </div>

          {/* Rapid Tweak Controls */}
          <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Beacon Telemetry Tuning
            </h4>

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

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-slate-500">
            Keep this screen illuminated for passing responders
          </p>
          <Button type="button" variant="gradient" onClick={onClose} className="px-5 py-2 text-xs font-extrabold">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
