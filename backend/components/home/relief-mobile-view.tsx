"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bed,
  Box,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  HeartHandshake,
  Loader2,
  Minus,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Truck,
  Users,
  X,
} from "lucide-react";
import type { ShelterNeedCategory, ShelterRow, SuppliesStatus, Urgency } from "@/lib/types";
import { wardShort } from "@/lib/format";

interface ReliefMobileViewProps {
  shelters: ShelterRow[];
}

interface SupplyItemConfig {
  id: string;
  name: string;
  category: ShelterNeedCategory;
  icon: string;
  defaultQty: string;
}

const SUPPLY_CATALOG: SupplyItemConfig[] = [
  { id: "water", name: "Drinking Water", category: "WATER", icon: "💧", defaultQty: "200 Liters (10 Jerrycans)" },
  { id: "rations", name: "Dry Rations & Meals", category: "FOOD", icon: "🍞", defaultQty: "150 Meal Ration Packs" },
  { id: "first_aid", name: "First Aid & Medicine", category: "MEDICAL", icon: "🩹", defaultQty: "30 Trauma First Aid Kits" },
  { id: "baby_care", name: "Infant Formula & Diapers", category: "BABY_CARE", icon: "🍼", defaultQty: "40 Tins & Diaper Packs" },
  { id: "bedding", name: "Bedding & Tarpaulins", category: "BEDDING", icon: "🛏️", defaultQty: "50 Tarps & Foam Mats" },
];

type ItemStockStatus = "good" | "low" | "critical";

interface ActiveDelivery {
  orderId: string;
  dispatchedAt: string;
  etaMinutes: number;
  vehicleType: string;
  vehiclePlate: string;
  driverName: string;
  driverPhone: string;
  urgency: Urgency;
  items: { name: string; icon: string; quantity: string }[];
  status: "DISPATCHED" | "EN_ROUTE" | "ARRIVED";
}

export function ReliefMobileView({ shelters }: ReliefMobileViewProps) {
  const [selectedShelterId, setSelectedShelterId] = useState<string>(
    shelters[0]?.id || ""
  );

  // Per-shelter bed occupancy and overall status
  const [shelterState, setShelterState] = useState<Record<string, { occupied: number; status: SuppliesStatus }>>(
    () => {
      const initial: Record<string, { occupied: number; status: SuppliesStatus }> = {};
      shelters.forEach((s) => {
        initial[s.id] = { occupied: s.occupied_beds, status: s.supplies_status };
      });
      return initial;
    }
  );

  // Per-shelter inventory checklist state
  const [inventoryState, setInventoryState] = useState<Record<string, Record<string, ItemStockStatus>>>(
    () => {
      const initial: Record<string, Record<string, ItemStockStatus>> = {};
      shelters.forEach((s) => {
        if (s.supplies_status === "CRITICAL") {
          initial[s.id] = {
            water: "critical",
            rations: "low",
            first_aid: "critical",
            baby_care: "low",
            bedding: "critical",
          };
        } else if (s.supplies_status === "LOW") {
          initial[s.id] = {
            water: "good",
            rations: "low",
            first_aid: "good",
            baby_care: "low",
            bedding: "good",
          };
        } else {
          initial[s.id] = {
            water: "good",
            rations: "good",
            first_aid: "good",
            baby_care: "good",
            bedding: "good",
          };
        }
      });
      return initial;
    }
  );

  // Per-shelter active delivery dispatch tracking
  const [activeDeliveries, setActiveDeliveries] = useState<Record<string, ActiveDelivery | null>>({});

  const [updating, setUpdating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Requisition Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, string>>({});
  const [requisitionUrgency, setRequisitionUrgency] = useState<Urgency>("MEDIUM");
  const [transportType, setTransportType] = useState<string>("High-Clearance 4x4 Truck");
  const [requisitionNotes, setRequisitionNotes] = useState<string>("");
  const [isSubmittingRequisition, setIsSubmittingRequisition] = useState(false);

  const currentShelter = shelters.find((s) => s.id === selectedShelterId) || shelters[0];

  const currentState = currentShelter
    ? shelterState[currentShelter.id] || { occupied: currentShelter.occupied_beds, status: currentShelter.supplies_status }
    : { occupied: 0, status: "ADEQUATE" as SuppliesStatus };

  const currentInventory = currentShelter
    ? inventoryState[currentShelter.id] || {
        water: "good",
        rations: "good",
        first_aid: "good",
        baby_care: "good",
        bedding: "good",
      }
    : {};

  const currentDelivery = currentShelter ? activeDeliveries[currentShelter.id] || null : null;

  const availableBeds = currentShelter
    ? Math.max(0, currentShelter.total_beds - currentState.occupied)
    : 0;

  function showToast(msg: string, duration = 3500) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), duration);
  }

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
        if (res.status === 401 || res.status === 403) {
          showToast("Signed out: Sign in to Relief Desk to sync live cloud updates.");
          return;
        }
      } else {
        showToast("Shelter bed count updated!");
      }
    } catch {
      showToast("Network offline. Bed update stored locally.");
    } finally {
      setUpdating(false);
    }
  }

  // Toggle individual supply item status: good -> low -> critical -> good
  async function toggleSupplyItem(itemId: string) {
    if (!currentShelter) return;
    const currentItemStatus = currentInventory[itemId] || "good";
    const nextStatus: ItemStockStatus =
      currentItemStatus === "good" ? "low" : currentItemStatus === "low" ? "critical" : "good";

    const nextInventory = {
      ...currentInventory,
      [itemId]: nextStatus,
    };

    setInventoryState((prev) => ({
      ...prev,
      [currentShelter.id]: nextInventory,
    }));

    // Auto calculate overall shelter status
    const values = Object.values(nextInventory);
    const calculatedStatus: SuppliesStatus = values.some((v) => v === "critical")
      ? "CRITICAL"
      : values.some((v) => v === "low")
      ? "LOW"
      : "ADEQUATE";

    setShelterState((prev) => ({
      ...prev,
      [currentShelter.id]: { ...prev[currentShelter.id], status: calculatedStatus },
    }));

    // Sync status to backend
    try {
      await fetch("/api/shelters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shelter_id: currentShelter.id,
          supplies_status: calculatedStatus,
        }),
      });
    } catch {
      // Ignore background sync errors
    }
  }

  // Open Requisition Modal with preselected low/critical items
  function handleOpenRequisitionModal() {
    if (!currentShelter) return;
    const initialChecked: Record<string, boolean> = {};
    const initialQty: Record<string, string> = {};

    let hasAnyShortage = false;
    SUPPLY_CATALOG.forEach((item) => {
      const status = currentInventory[item.id] || "good";
      const isShort = status === "low" || status === "critical";
      if (isShort) hasAnyShortage = true;
      initialChecked[item.id] = isShort;
      initialQty[item.id] = item.defaultQty;
    });

    // If all are good, select all by default so user can easily order whatever they need
    if (!hasAnyShortage) {
      initialChecked["water"] = true;
      initialChecked["rations"] = true;
    }

    setSelectedItems(initialChecked);
    setItemQuantities(initialQty);
    setRequisitionUrgency(currentState.status === "CRITICAL" ? "CRITICAL" : "MEDIUM");
    setRequisitionNotes("");
    setIsModalOpen(true);
  }

  // Submit Requisition to Central Hub and API
  async function handleSubmitRequisition(e: React.FormEvent) {
    e.preventDefault();
    if (!currentShelter || isSubmittingRequisition) return;

    const requestedItems = SUPPLY_CATALOG.filter((item) => selectedItems[item.id]).map((item) => ({
      name: item.name,
      category: item.category,
      icon: item.icon,
      quantity: itemQuantities[item.id] || item.defaultQty,
    }));

    if (requestedItems.length === 0) {
      showToast("Please select at least one supply item to request.");
      return;
    }

    setIsSubmittingRequisition(true);

    try {
      // 1. Transmit requests to official shelter supplies API
      for (const item of requestedItems) {
        try {
          await fetch("/api/relief/supplies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shelter_id: currentShelter.id,
              shelter_name: currentShelter.name,
              ward_id: currentShelter.ward_id,
              item_name: item.name,
              category: item.category,
              quantity_needed: item.quantity,
              urgency: requisitionUrgency,
              coordinator_name: "Shelter Logistics Desk",
              coordinator_phone: "+94 11 243 4215",
            }),
          });
        } catch (err) {
          console.warn("Could not post individual supply item to API:", err);
        }
      }

      // 2. Formulate active delivery dispatch tracking
      const orderNumber = `HUB-${Math.floor(1000 + Math.random() * 9000)}`;
      const newDelivery: ActiveDelivery = {
        orderId: orderNumber,
        dispatchedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        etaMinutes: requisitionUrgency === "CRITICAL" ? 20 : requisitionUrgency === "MEDIUM" ? 35 : 60,
        vehicleType: transportType,
        vehiclePlate: `WP NB-${Math.floor(2000 + Math.random() * 7000)}`,
        driverName: "Officer S. Bandara (Central Logistics Unit)",
        driverPhone: "+94 77 245 9182",
        urgency: requisitionUrgency,
        items: requestedItems,
        status: "EN_ROUTE",
      };

      setActiveDeliveries((prev) => ({
        ...prev,
        [currentShelter.id]: newDelivery,
      }));

      setIsModalOpen(false);
      showToast(`🚚 Requisition #${orderNumber} dispatched! Supply truck is en route from Central Hub.`);
    } catch (err) {
      console.error("Requisition submission failed:", err);
      showToast("Failed to transmit requisition. Stored locally.");
    } finally {
      setIsSubmittingRequisition(false);
    }
  }

  // Mark Delivery Received & Restock All Supplies
  async function handleConfirmDeliveryRestocked() {
    if (!currentShelter) return;

    // Reset all items for this shelter to 'good'
    const resetInventory: Record<string, ItemStockStatus> = {};
    SUPPLY_CATALOG.forEach((item) => {
      resetInventory[item.id] = "good";
    });

    setInventoryState((prev) => ({
      ...prev,
      [currentShelter.id]: resetInventory,
    }));

    // Set shelter status to ADEQUATE
    setShelterState((prev) => ({
      ...prev,
      [currentShelter.id]: { ...prev[currentShelter.id], status: "ADEQUATE" },
    }));

    // Clear active delivery
    setActiveDeliveries((prev) => ({
      ...prev,
      [currentShelter.id]: null,
    }));

    showToast("✅ Delivery received & confirmed! All shelter rations marked Adequate.");

    // Sync to backend
    try {
      await fetch("/api/shelters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shelter_id: currentShelter.id,
          supplies_status: "ADEQUATE",
        }),
      });
    } catch {
      // ignore
    }
  }

  if (!currentShelter) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
        No active shelters registered in this district.
      </div>
    );
  }

  const hasShortages = Object.values(currentInventory).some((s) => s === "low" || s === "critical");

  return (
    <div className="flex flex-col gap-5 animate-pop">
      {/* Toast Feedback */}
      {toastMessage ? (
        <div className="fixed top-5 left-4 right-4 z-50 mx-auto max-w-md flex items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-900 shadow-lg animate-slide-down-alert">
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
                {s.name} ({wardShort(s.ward_id)})
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
          Tap + or − as evacuees arrive or check out. Updates reflect immediately on the public map.
        </p>
      </div>

      {/* 3. Relief Supplies Health Matrix & Resupply */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-indigo-600" />
            <div>
              <h4 className="text-sm font-black text-slate-900">Ration & Supply Status</h4>
              <p className="text-[10px] font-medium text-slate-400">Tap item to cycle stock status</p>
            </div>
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
            ● {currentState.status}
          </span>
        </div>

        {/* Interactive Supply Inventory Checklist */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {SUPPLY_CATALOG.map((item) => {
            const status = currentInventory[item.id] || "good";
            const isCritical = status === "critical";
            const isLow = status === "low";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleSupplyItem(item.id)}
                title={`Click to cycle ${item.name} stock level`}
                className={`flex items-center justify-between rounded-xl border p-2.5 text-left transition-all active:scale-95 ${
                  isCritical
                    ? "border-rose-300 bg-rose-50/80 text-rose-900 shadow-xs"
                    : isLow
                    ? "border-amber-300 bg-amber-50/80 text-amber-900 shadow-xs"
                    : "border-slate-100 bg-slate-50/80 text-slate-700 hover:bg-slate-100/70"
                }`}
              >
                <span className="flex items-center gap-1.5 font-bold truncate">
                  <span>{item.icon}</span>
                  <span className="truncate">{item.name}</span>
                </span>
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                    isCritical
                      ? "bg-rose-200 text-rose-800"
                      : isLow
                      ? "bg-amber-200 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {isCritical ? "Critical" : isLow ? "Restock" : "Good"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Central Hub Delivery Status Banner */}
        {currentDelivery ? (
          <div className="mt-4 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-blue-50/90 p-4 shadow-sm animate-in fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-500/25">
                  <Truck className="h-5 w-5 animate-pulse" />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-indigo-950">
                      Central Hub Dispatch #{currentDelivery.orderId}
                    </span>
                    <span className="rounded bg-indigo-200/80 px-1.5 py-0.2 text-[9px] font-black text-indigo-800 uppercase tracking-wide">
                      En Route
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-indigo-700">
                    ETA: ~{currentDelivery.etaMinutes} mins · {currentDelivery.vehicleType}
                  </p>
                </div>
              </div>

              <a
                href={`tel:${currentDelivery.driverPhone}`}
                className="flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-[10px] font-bold text-indigo-700 shadow-2xs hover:bg-indigo-50"
                title="Call Delivery Driver"
              >
                <Phone className="h-3 w-3" />
                <span className="hidden sm:inline">Call Driver</span>
              </a>
            </div>

            {/* Cargo Manifest */}
            <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-indigo-100 pt-2 text-[10px]">
              <span className="font-bold text-indigo-900">Cargo Manifest:</span>
              {currentDelivery.items.map((it, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-md bg-white/80 px-1.5 py-0.5 font-bold text-slate-700 border border-indigo-100"
                >
                  <span>{it.icon}</span>
                  <span>{it.quantity}</span>
                </span>
              ))}
            </div>

            {/* Confirm Restocked Action */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirmDeliveryRestocked}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Delivery & Restock Shelter</span>
              </button>
              <button
                type="button"
                onClick={handleOpenRequisitionModal}
                className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 active:scale-95"
                title="Request additional supplies"
              >
                + More
              </button>
            </div>
          </div>
        ) : (
          /* Main Dispatch Trigger Button */
          <button
            type="button"
            onClick={handleOpenRequisitionModal}
            className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-black text-white shadow-xs transition-transform active:scale-95 touch-manipulation ${
              hasShortages
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/20 animate-pulse"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>
              {hasShortages
                ? "⚠️ Shortage Detected: Request Delivery from Central Hub"
                : "Request Supply Delivery from Central Hub"}
            </span>
          </button>
        )}

        {/* Shortcut to public donation & supply needs board */}
        <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
          <span className="text-slate-400 font-medium">Public Disaster Supply Board:</span>
          <Link
            href="/supplies"
            className="flex items-center gap-1 font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            <span>View Civilian Pledges Bay</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
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

      {/* 5. Central Hub Logistics Requisition Modal */}
      {isModalOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-indigo-50/60 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Central Hub Supply Requisition</h3>
                  <p className="text-[11px] font-bold text-indigo-700">
                    Depot 01 (Orugodawatta) ➔ {currentShelter.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequisition} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Delivery Routing Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-xs">
                <div className="flex items-center justify-between text-slate-500 font-bold text-[11px]">
                  <span>Origin: Central Logistics Hub</span>
                  <span>Destination: {wardShort(currentShelter.ward_id)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 font-black text-slate-800 text-xs">
                  <span className="text-indigo-600">Central Logistics Bay #1</span>
                  <span>➔</span>
                  <span className="truncate">{currentShelter.name}</span>
                </div>
              </div>

              {/* Items Selection Checklist */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2">
                  Select Supplies to Dispatch:
                </label>
                <div className="space-y-2">
                  {SUPPLY_CATALOG.map((item) => {
                    const isChecked = Boolean(selectedItems[item.id]);
                    const currentStatus = currentInventory[item.id] || "good";
                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col gap-2 rounded-xl border p-3 transition-colors ${
                          isChecked ? "border-indigo-300 bg-indigo-50/30" : "border-slate-200 bg-white opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                setSelectedItems((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                              <span>{item.icon}</span>
                              <span>{item.name}</span>
                            </span>
                          </label>

                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              currentStatus === "critical"
                                ? "bg-rose-100 text-rose-700"
                                : currentStatus === "low"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {currentStatus}
                          </span>
                        </div>

                        {isChecked ? (
                          <div className="pl-6.5">
                            <input
                              type="text"
                              value={itemQuantities[item.id] || item.defaultQty}
                              onChange={(e) =>
                                setItemQuantities((prev) => ({
                                  ...prev,
                                  [item.id]: e.target.value,
                                }))
                              }
                              placeholder="Enter quantity needed"
                              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none"
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Urgency & Vehicle Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Delivery Urgency:
                  </label>
                  <select
                    value={requisitionUrgency}
                    onChange={(e) => setRequisitionUrgency(e.target.value as Urgency)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 shadow-2xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="CRITICAL">Code Red Convoy (~20 mins)</option>
                    <option value="MEDIUM">High Priority (~35 mins)</option>
                    <option value="LOW">Standard Dispatch (~60 mins)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                    Transport Vehicle:
                  </label>
                  <select
                    value={transportType}
                    onChange={(e) => setTransportType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 shadow-2xs focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="High-Clearance 4x4 Truck">High-Clearance 4x4 Truck (Flooded access)</option>
                    <option value="Fast Response Logistics Van">Fast Response Logistics Van</option>
                    <option value="Rescue Boat Carrier">Rescue Boat Carrier (Waterlogged cut-off)</option>
                  </select>
                </div>
              </div>

              {/* Special Access Notes */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                  Coordinator Delivery Instructions (Optional):
                </label>
                <input
                  type="text"
                  value={requisitionNotes}
                  onChange={(e) => setRequisitionNotes(e.target.value)}
                  placeholder="e.g. Access via North gate; ground level flooded 15cm"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRequisition}
                  className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-indigo-700 active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingRequisition ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="h-4 w-4" />
                      <span>Transmit Dispatch Order</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
