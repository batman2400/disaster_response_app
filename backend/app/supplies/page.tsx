"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Baby,
  Building2,
  CheckCircle2,
  Droplets,
  HeartHandshake,
  Map as MapIcon,
  Package,
  Pill,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Utensils,
  X,
  PhoneCall,
} from "lucide-react";

import { EmergencyBroadcastBanner } from "@/components/emergency-broadcast-banner";
import { EmergencySosModal } from "@/components/emergency-sos-modal";
import { PublicShell } from "@/components/public-shell";
import { Badge, Button, Modal, SectionLabel, UrgencyBadge } from "@/components/ui";
import { wardName, wardShort } from "@/lib/format";
import { LanguageSwitcher, useI18n } from "@/lib/i18n/language-context";
import type { ShelterNeed, ShelterNeedCategory, Urgency, WardId } from "@/lib/types";

const CATEGORY_TABS: { id: "ALL" | ShelterNeedCategory; label: string; icon: typeof Package }[] = [
  { id: "ALL", label: "All Supplies", icon: Package },
  { id: "WATER", label: "Clean Water", icon: Droplets },
  { id: "FOOD", label: "Dry Rations & Meals", icon: Utensils },
  { id: "BABY_CARE", label: "Infant Care & Diapers", icon: Baby },
  { id: "MEDICAL", label: "First Aid & Medicine", icon: Pill },
  { id: "BEDDING", label: "Bedding & Tarps", icon: Package },
];

export default function SuppliesPage() {
  const { lang, t } = useI18n();
  const [needs, setNeeds] = useState<ShelterNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | ShelterNeedCategory>("ALL");
  const [selectedWard, setSelectedWard] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sosModalOpen, setSosModalOpen] = useState(false);

  // Pledge modal state
  const [pledgeModalOpen, setPledgeModalOpen] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<ShelterNeed | null>(null);
  const [donorName, setDonorName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [pledgeQuantity, setPledgeQuantity] = useState("");
  const [pledgeNotes, setPledgeNotes] = useState("");
  const [submittingPledge, setSubmittingPledge] = useState(false);
  const [pledgeSuccess, setPledgeSuccess] = useState(false);

  const fetchNeeds = async () => {
    try {
      const res = await fetch("/api/relief/supplies");
      if (res.ok) {
        const data = await res.json();
        setNeeds(data.needs || []);
      }
    } catch (err) {
      console.warn("Failed to fetch shelter supplies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNeeds();
    const interval = setInterval(fetchNeeds, 15000);
    return () => clearInterval(interval);
  }, []);

  const filteredNeeds = useMemo(() => {
    return needs.filter((item) => {
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) return false;
      if (selectedWard !== "ALL" && item.ward_id !== selectedWard) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.item_name.toLowerCase().includes(q) ||
          item.shelter_name.toLowerCase().includes(q) ||
          item.coordinator_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [needs, selectedCategory, selectedWard, searchQuery]);

  const stats = useMemo(() => {
    const critical = needs.filter((n) => n.urgency === "CRITICAL" && n.status !== "FULFILLED").length;
    const totalPledges = needs.reduce((acc, n) => acc + (n.pledges?.length || 0), 0);
    const fulfilled = needs.filter((n) => n.status === "FULFILLED").length;
    return {
      total: needs.length,
      critical,
      totalPledges,
      fulfilled,
    };
  }, [needs]);

  const handleOpenPledge = (need: ShelterNeed) => {
    setSelectedNeed(need);
    setDonorName("");
    setContactPhone("");
    setPledgeQuantity(need.quantity_needed);
    setPledgeNotes("");
    setPledgeSuccess(false);
    setPledgeModalOpen(true);
  };

  const handlePledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNeed || !donorName.trim() || !contactPhone.trim() || !pledgeQuantity.trim()) return;

    setSubmittingPledge(true);
    try {
      const res = await fetch("/api/relief/supplies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          need_id: selectedNeed.id,
          donor_name: donorName.trim(),
          contact_phone: contactPhone.trim(),
          quantity: pledgeQuantity.trim(),
          notes: pledgeNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        setPledgeSuccess(true);
        await fetchNeeds();
        setTimeout(() => {
          setPledgeModalOpen(false);
          setPledgeSuccess(false);
        }, 1800);
      }
    } catch (err) {
      console.error("Pledge failed:", err);
    } finally {
      setSubmittingPledge(false);
    }
  };

  return (
    <PublicShell>
      {/* Header Bar with Navigation & SOS */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/20 bg-white/85 px-6 py-3.5 backdrop-blur-lg lg:px-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            title="Return to Home"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-600 shadow-sm transition-transform active:scale-90"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="hidden sm:flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
              {lang === "si" ? "සහන සැපයුම් පුවරුව" : lang === "ta" ? "நிவாரண விநியோக பலகை" : "Relief Logistics Active"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 shadow-inner">
          <Link
            href="/map"
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:text-brand"
          >
            <MapIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("live_map")}</span>
          </Link>
          <div className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold text-brand shadow-sm">
            <HeartHandshake className="h-3.5 w-3.5" />
            <span>{lang === "si" ? "සැපයුම්" : lang === "ta" ? "விநியோகம்" : "Supplies"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setSosModalOpen(true)}
            className="flex h-10 items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-500 px-3 text-xs font-extrabold text-white shadow-md shadow-rose-500/20 active:scale-95"
          >
            <ShieldAlert className="h-4 w-4 animate-pulse" />
            <span>SOS 117</span>
          </button>
        </div>
      </div>

      <div className="px-6 pt-3 lg:px-10">
        <EmergencyBroadcastBanner />
      </div>

      <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8">
        {/* Title Hero */}
        <div className="mb-6 rounded-3xl border border-indigo-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-purple-50/80 p-6 shadow-soft lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-sm">
                  NDRRMS · Public Relief Bay
                </span>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  Live Colombo Shelters
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 lg:text-3xl">
                {lang === "si"
                  ? "නවාතැන් මධ්‍යස්ථාන ආධාර හා සැපයුම් පුවරුව"
                  : lang === "ta"
                  ? "நிவாரண முகாம் தேவைகள் மற்றும் நன்கொடை பலகை"
                  : "Shelter Supply Needs & Volunteer Donation Board"}
              </h1>
              <p className="mt-1 max-w-2xl text-xs font-semibold leading-relaxed text-slate-600 lg:text-sm">
                {lang === "si"
                  ? "කොළඹ ගංවතුරින් විපතට පත් ජනතාව රඳවා සිටින නවාතැන් මධ්‍යස්ථාන සඳහා අවශ්‍ය පානීය ජලය, ආහාර හා ඖෂධ සෘජුව පරිත්‍යාග කරන්න."
                  : lang === "ta"
                  ? "கொழும்பு வெள்ள நிவாரண முகாம்களுக்கு அவசியமான குடிநீர், உலர் உணவு, மருந்துப் பொருட்களை நேரடியாக வழங்கி உதவுங்கள்."
                  : "Direct civilian and NGO donation portal for flood relief centers across Colombo. View live urgent shortages and pledge supplies directly to center coordinators."}
              </p>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0">
              <div className="rounded-2xl border border-white/80 bg-white/90 p-3.5 text-center shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Needs</p>
                <p className="mt-0.5 text-xl font-black text-slate-900">{stats.total}</p>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/90 p-3.5 text-center shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">Critical</p>
                <p className="mt-0.5 text-xl font-black text-rose-600">{stats.critical}</p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/90 p-3.5 text-center shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Pledges</p>
                <p className="mt-0.5 text-xl font-black text-emerald-700">{stats.totalPledges}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {CATEGORY_TABS.map((cat) => {
              const Icon = cat.icon;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition-all active:scale-95 ${
                    active
                      ? "bg-brand text-white shadow-sm shadow-brand/25"
                      : "border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Ward Selector */}
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 shadow-sm focus:border-brand focus:outline-none"
            >
              <option value="ALL">All Wards</option>
              <option value="ward_01">Ward 01 - Kelani Basin</option>
              <option value="ward_02">Ward 02 - Town Hall</option>
              <option value="ward_03">Ward 03 - Fort</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items or shelters..."
                className="w-48 sm:w-60 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-semibold text-slate-800 shadow-sm focus:border-brand focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Needs Cards Grid */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              <p className="text-xs font-bold">Loading shelter supply board…</p>
            </div>
          </div>
        ) : filteredNeeds.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
            <Package className="h-10 w-10 text-slate-300" />
            <p className="mt-2 text-sm font-extrabold text-slate-700">No supply shortages matching your filter</p>
            <p className="mt-1 text-xs text-slate-400">All current requests in this category have been met or pledged.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredNeeds.map((need) => {
              const isFulfilled = need.status === "FULFILLED";
              const isCritical = need.urgency === "CRITICAL";

              return (
                <div
                  key={need.id}
                  className={`flex flex-col justify-between rounded-3xl border bg-white p-5 shadow-soft transition-all hover:shadow-md ${
                    isCritical && !isFulfilled ? "border-rose-200/80 ring-1 ring-rose-300/40" : "border-slate-100"
                  }`}
                >
                  <div>
                    {/* Header: Urgency + Shelter */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <UrgencyBadge urgency={need.urgency} />
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-600">
                          {need.category}
                        </span>
                      </div>
                      {isFulfilled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          Fulfilled
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                          {need.pledges.length > 0 ? "Partially Pledged" : "Urgent Need"}
                        </span>
                      )}
                    </div>

                    {/* Item Name */}
                    <h3 className="text-base font-extrabold tracking-tight text-slate-900 leading-snug">
                      {need.item_name}
                    </h3>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-slate-400">Target:</span>
                      <span className="text-sm font-black text-brand">{need.quantity_needed}</span>
                    </div>

                    {/* Shelter info */}
                    <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span className="truncate">{need.shelter_name}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-400 pl-5">
                        {wardShort(need.ward_id)}
                      </p>
                      <div className="mt-2 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px]">
                        <span className="font-semibold text-slate-500">Coordinator: {need.coordinator_name}</span>
                        <a
                          href={`tel:${need.coordinator_phone}`}
                          className="flex items-center gap-1 font-extrabold text-indigo-600 hover:underline"
                        >
                          <PhoneCall className="h-3 w-3" />
                          Call
                        </a>
                      </div>
                    </div>

                    {/* Existing Pledges preview */}
                    {need.pledges.length > 0 ? (
                      <div className="mt-3 space-y-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Recent Donor Pledges ({need.pledges.length}):
                        </p>
                        {need.pledges.slice(0, 2).map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded-lg bg-emerald-50/70 px-2.5 py-1 text-[11px] text-emerald-900">
                            <span className="font-bold truncate">{p.donor_name}</span>
                            <span className="font-extrabold shrink-0">{p.quantity}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {/* Action Button */}
                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <Button
                      type="button"
                      variant={isFulfilled ? "ghost" : "gradient"}
                      disabled={isFulfilled}
                      onClick={() => handleOpenPledge(need)}
                      className="w-full py-2.5 text-xs font-extrabold"
                    >
                      <HeartHandshake className="h-3.5 w-3.5" />
                      <span>{isFulfilled ? "Needs Met · Thank You" : "Pledge to Provide"}</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Pledge Modal */}
      <Modal open={pledgeModalOpen}>
        <div className="flex flex-col p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Pledge Relief Supplies</h3>
                <p className="text-xs text-slate-500">Direct coordinator notification</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPledgeModalOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selectedNeed ? (
            <div className="mb-4 rounded-2xl bg-slate-50 p-3.5 text-xs">
              <p className="font-bold text-slate-800">{selectedNeed.item_name}</p>
              <p className="mt-0.5 text-slate-500">{selectedNeed.shelter_name} ({wardShort(selectedNeed.ward_id)})</p>
              <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-brand">
                <span>Total needed: {selectedNeed.quantity_needed}</span>
                <span>Coordinator: {selectedNeed.coordinator_phone}</span>
              </div>
            </div>
          ) : null}

          {pledgeSuccess ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center animate-pop">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h4 className="mt-3 text-base font-extrabold text-emerald-900">Pledge Recorded!</h4>
              <p className="mt-1 text-xs text-emerald-700">
                Thank you for your solidarity. The shelter coordinator has been alerted to your donation.
              </p>
            </div>
          ) : (
            <form onSubmit={handlePledgeSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Donor / Organization Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="e.g. Red Cross Colombo / John Silva"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Contact Phone Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. 077 123 4567"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Quantity You Can Provide <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={pledgeQuantity}
                  onChange={(e) => setPledgeQuantity(e.target.value)}
                  placeholder="e.g. 50 Packs / 100 Bottles"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">
                  Delivery ETA / Notes (Optional)
                </label>
                <textarea
                  value={pledgeNotes}
                  onChange={(e) => setPledgeNotes(e.target.value)}
                  placeholder="e.g. Transport arriving around 3 PM by van..."
                  className="mt-1 h-18 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-800 focus:border-brand focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <Button
                  type="submit"
                  variant="gradient"
                  disabled={submittingPledge}
                  className="flex-1 py-3 text-xs font-extrabold"
                >
                  <HeartHandshake className="h-4 w-4" />
                  <span>{submittingPledge ? "Submitting Pledge…" : "Confirm Pledge"}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPledgeModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      <EmergencySosModal open={sosModalOpen} onClose={() => setSosModalOpen(false)} />
    </PublicShell>
  );
}
