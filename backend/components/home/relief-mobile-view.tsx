"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Bed,
  Box,
  CheckCircle2,
  Droplet,
  ExternalLink,
  HeartHandshake,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";
import type { ShelterRow, SuppliesStatus } from "@/lib/types";

interface ReliefMobileViewProps {
  shelters: ShelterRow[];
}

export function ReliefMobileView({ shelters }: ReliefMobileViewProps) {
  const [selectedShelterId, setSelectedShelterId] = useState<string>(
    shelters[0]?.id || ""
  );
  const [shelterState, setShelterState] = useState<Record<string, { occupied: number; status: SuppliesStatus }>>(
    () => {
      const initial: Record<string, { occupied: number; status: SuppliesStatus }> = {};
      shelters.forEach((s) => {
        initial[s.id] = { occupied: s.occupied_beds, status: s.supplies_status };
      });
      return initial;
    }
  );
  const [updating, setUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const currentShelter = shelters.find((s) => s.id === selectedShelterId) || shelters[0];
  const currentState = currentShelter
    ? shelterState[currentShelter.id] || { occupied: currentShelter.occupied_beds, status: currentShelter.supplies_status }
    : { occupied: 0, status: "ADEQUATE" as SuppliesStatus };

  const availableBeds = currentShelter
    ? Math.max(0, currentShelter.total_beds - currentState.occupied)
    : 0;

  async function adjustBeds(delta: number) {
    if (!currentShelter || updating) return;
    const newOccupied = Math.min(
      currentShelter.total_beds,
      Math.max(0, currentState.occupied + delta)
    );
    if (newOccupied === currentState.occupied) return;

    // Optimistic update
    setShelterState((prev) => ({
      ...prev,
      [currentShelter.id]: { ...prev[currentShelter.id], occupied: newOccupied },
    }));

    setUpdating(true);
    try {
      const res = await fetch("/api/shelters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shelter_id: currentShelter.id,
          occupied_beds: newOccupied,
        }),
      });

      if (!res.ok) {
        // If unauthenticated, alert user nicely
        if (res.status === 401 || res.status === 403) {
          setToastMessage("Signed out: Sign in to Relief Desk to sync live cloud updates.");
          setTimeout(() => setToastMessage(null), 4000);
          return;
        }
      } else {
        setToastMessage("Shelter bed count updated!");
        setTimeout(() => setToastMessage(null), 2500);
      }
    } catch {
      setToastMessage("Network error. Update stored locally.");
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setUpdating(false);
    }
  }

  async function handleResupplyRequest() {
    if (!currentShelter || updating) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/relief/resupply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shelter_id: currentShelter.id,
          shelter_name: currentShelter.name,
          ward_id: currentShelter.ward_id,
          items: ["Dry Rations", "Baby Formula"],
          supplies_status: currentState.status === "ADEQUATE" ? "LOW" : currentState.status,
        }),
      });
      if (res.status === 401 || res.status === 403) {
        setToastMessage("Signed out: Sign in to Relief Desk to send this request to Command.");
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }
      if (!res.ok) {
        const payload = (await res.json()) as { error?: string };
        throw new Error(payload.error || "Resupply request failed");
      }
      setToastMessage("Resupply request sent to Officer Command Console.");
      setTimeout(() => setToastMessage(null), 3500);
    } catch {
      setToastMessage("Network error. Could not reach Officer Command Console.");
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setUpdating(false);
    }
  }

  if (!currentShelter) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
        No active shelters registered in this district.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-pop">
      {/* Toast Feedback */}
      {toastMessage ? (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 shadow-sm animate-slide-down-alert">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      ) : null}

      {/* 1. Relief Header & Shelter Switcher */}
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-100/40 p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/20">
              <Box className="h-6 w-6" />
            </div>
            <div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Relief Operations
              </span>
              <h3 className="text-base font-black text-slate-900">Shelter Logistics Desk</h3>
            </div>
          </div>

          <Link
            href="/dashboard/login?role=relief"
            className="flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition-transform hover:bg-emerald-700 active:scale-95 touch-manipulation"
          >
            <span>Open Desk</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Shelter Dropdown */}
        <div className="mt-4 pt-3 border-t border-emerald-200/60">
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            Select Assigned Shelter:
          </label>
          <select
            value={selectedShelterId}
            onChange={(e) => setSelectedShelterId(e.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-emerald-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none"
          >
            {shelters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.ward_id.replace("_", " ").toUpperCase()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Rapid Bed Capacity Stepper */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bed className="h-4 w-4 text-emerald-600" />
            <h4 className="text-sm font-black text-slate-900">Live Bed Occupancy Counter</h4>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
              availableBeds <= 10
                ? "bg-rose-100 text-rose-800"
                : availableBeds <= 30
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {availableBeds} Available
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustBeds(-1)}
              disabled={currentState.occupied <= 0}
              aria-label="Decrease occupied beds"
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-xs transition-transform active:scale-95 disabled:opacity-40 touch-manipulation"
            >
              <Minus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => adjustBeds(-5)}
              disabled={currentState.occupied < 5}
              className="hidden sm:flex h-12 px-3 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xs font-extrabold text-slate-600 shadow-xs active:scale-95 disabled:opacity-40"
            >
              -5
            </button>
          </div>

          <div className="text-center">
            <p className="text-2xl font-black text-slate-900">
              {currentState.occupied}{" "}
              <span className="text-sm font-bold text-slate-400">/ {currentShelter.total_beds}</span>
            </p>
            <p className="text-[11px] font-bold text-slate-500">Occupied Beds</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => adjustBeds(5)}
              disabled={currentState.occupied + 5 > currentShelter.total_beds}
              className="hidden sm:flex h-12 px-3 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-xs font-extrabold text-emerald-700 shadow-xs active:scale-95 disabled:opacity-40"
            >
              +5
            </button>
            <button
              type="button"
              onClick={() => adjustBeds(1)}
              disabled={currentState.occupied >= currentShelter.total_beds}
              aria-label="Increase occupied beds"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 transition-transform active:scale-95 disabled:opacity-40 touch-manipulation"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <p className="mt-2 text-center text-[10px] font-medium text-slate-400">
          Tap + or - as evacuees arrive or check out. Updates reflect immediately on the public map.
        </p>
      </div>

      {/* 3. Relief Supplies Health Matrix & Resupply */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-indigo-600" />
            <h4 className="text-sm font-black text-slate-900">Ration & Supply Status</h4>
          </div>
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
              currentState.status === "ADEQUATE"
                ? "bg-emerald-100 text-emerald-800"
                : currentState.status === "LOW"
                ? "bg-amber-100 text-amber-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {currentState.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <span>💧</span> Drinking Water
            </span>
            <span className="font-extrabold text-emerald-700">Good</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <span>🍞</span> Dry Rations
            </span>
            <span className="font-extrabold text-amber-600">Restock Soon</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <span>🩹</span> First Aid Packs
            </span>
            <span className="font-extrabold text-emerald-700">Adequate</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <span className="flex items-center gap-1.5 font-bold text-slate-700">
              <span>🍼</span> Baby Formula
            </span>
            <span className="font-extrabold text-rose-600">Low Stock</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResupplyRequest}
          disabled={updating}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-xs transition-transform hover:bg-indigo-700 active:scale-95 touch-manipulation disabled:opacity-60"
        >
          <Truck className="h-3.5 w-3.5" />
          <span>{updating ? "Sending to Command…" : "Request Supply Delivery from Command"}</span>
        </button>
      </div>

      {/* 4. Evacuee Intake / Missing Persons Registry Shortcut */}
      <div className="rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50/60 p-4.5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-600 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">Arriving Evacuee Check-In</h4>
              <p className="text-[11px] text-slate-500">
                Log displaced persons or mark families safe.
              </p>
            </div>
          </div>

          <Link
            href="/safe"
            className="flex items-center gap-1 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700 active:scale-95 touch-manipulation"
          >
            <span>Open Intake</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
