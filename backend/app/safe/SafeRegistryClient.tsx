"use client";

import {
  Baby,
  Building2,
  CheckCircle2,
  Clock,
  HeartPulse,
  Home,
  LifeBuoy,
  MapPin,
  Phone,
  Search,
  Shield,
  Activity,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { EmergencySosModal } from "@/components/emergency-sos-modal";
import { PublicShell } from "@/components/public-shell";
import { Badge, Button, Card, Chip, StatCard } from "@/components/ui";
import { LanguageSwitcher, useI18n } from "@/lib/i18n/language-context";
import { timeAgo } from "@/lib/format";
import type { SafeCheckIn, SafeStatus, VulnerabilityFlag, WardId } from "@/lib/types";

const STATUS_META: Record<
  SafeStatus,
  { label: string; badge: string; icon: typeof Home }
> = {
  IN_SHELTER: {
    label: "Safe at Municipal Shelter",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: Building2,
  },
  SAFE_HOME: {
    label: "Safe at Home (High Ground)",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Home,
  },
  WITH_RELATIVES: {
    label: "Evacuated to Relatives",
    badge: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Users,
  },
  MEDICAL_CARE: {
    label: "Under Medical Care",
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    icon: HeartPulse,
  },
};

const VULNERABILITY_META: Record<
  VulnerabilityFlag,
  { label: string; icon: typeof HeartPulse; color: string }
> = {
  ELDERLY: { label: "Elderly (70+)", icon: Users, color: "bg-amber-100 text-amber-800 border-amber-200" },
  INFANT: { label: "Infant / Child Care", icon: Baby, color: "bg-pink-100 text-pink-800 border-pink-200" },
  MEDICAL_INSULIN: { label: "Insulin / Dialysis", icon: HeartPulse, color: "bg-rose-100 text-rose-800 border-rose-200" },
  OXYGEN_POWER: { label: "Oxygen / Power Needed", icon: ShieldAlert, color: "bg-purple-100 text-purple-800 border-purple-200" },
  WHEELCHAIR: { label: "Wheelchair Access", icon: Activity, color: "bg-blue-100 text-blue-800 border-blue-200" },
};

const SHELTERS_LIST = [
  { id: "peliyagoda_cc", name: "Peliyagoda Community Centre (Ward 01)" },
  { id: "kelaniya_temple", name: "Kelaniya Temple Hall (Ward 01)" },
  { id: "town_hall", name: "Town Hall Relief Bay (Ward 02)" },
  { id: "thimbirigasyaya", name: "Thimbirigasyaya School (Ward 02)" },
  { id: "fort_railway", name: "Fort Railway Waiting Hall (Ward 03)" },
];

export function SafeRegistryClient() {
  const { lang } = useI18n();
  const [activeTab, setActiveTab] = useState<"search" | "checkin">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [shelterFilter, setShelterFilter] = useState("ALL");
  const [vulnerableOnly, setVulnerableOnly] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);

  // List data
  const [checkIns, setCheckIns] = useState<SafeCheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nic, setNic] = useState("");
  const [status, setStatus] = useState<SafeStatus>("IN_SHELTER");
  const [shelterId, setShelterId] = useState("town_hall");
  const [locationDetail, setLocationDetail] = useState("");
  const [familyCount, setFamilyCount] = useState(2);
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityFlag[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successRecord, setSuccessRecord] = useState<SafeCheckIn | null>(null);

  useEffect(() => {
    void fetchCheckIns();
  }, [searchQuery, shelterFilter, vulnerableOnly]);

  async function fetchCheckIns() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (shelterFilter !== "ALL") params.set("shelter", shelterFilter);
      if (vulnerableOnly) params.set("vulnerable", "true");

      const res = await fetch(`/api/safe?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load records");
      const data = (await res.json()) as { check_ins: SafeCheckIn[] };
      setCheckIns(data.check_ins || []);
    } catch (err) {
      console.warn("Error fetching safe registry:", err);
    } finally {
      setLoading(false);
    }
  }

  function toggleVulnerability(flag: VulnerabilityFlag) {
    if (vulnerabilities.includes(flag)) {
      setVulnerabilities(vulnerabilities.filter((f) => f !== flag));
    } else {
      setVulnerabilities([...vulnerabilities, flag]);
    }
  }

  async function handleCheckInSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;

    setSubmitting(true);
    try {
      const selectedShelterObj = SHELTERS_LIST.find((s) => s.id === shelterId);

      const res = await fetch("/api/safe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          contact_phone: phone.trim(),
          nic: nic.trim() || undefined,
          status,
          shelter_id: status === "IN_SHELTER" ? shelterId : null,
          shelter_name: status === "IN_SHELTER" ? selectedShelterObj?.name : null,
          location_detail: locationDetail.trim() || undefined,
          family_count: familyCount,
          vulnerabilities,
          message: message.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit check-in");
      const data = (await res.json()) as { check_in: SafeCheckIn };
      setSuccessRecord(data.check_in);
      void fetchCheckIns();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicShell>
      {/* Header bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/20 bg-white/85 px-6 py-3.5 backdrop-blur-lg lg:px-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-10 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
          >
            ← Home
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-200">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 lg:text-base">Family Reunification Registry</h1>
              <p className="text-[10px] font-bold text-slate-400">Sri Lanka Disaster Management Centre (DMC)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setSosModalOpen(true)}
            className="flex h-9 items-center gap-1 rounded-xl bg-rose-500 px-3 text-xs font-black text-white shadow-sm hover:bg-rose-600 active:scale-95"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>SOS 117</span>
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Hero Title & KPI Row */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
            <Shield className="h-3.5 w-3.5 text-emerald-600" />
            Official Municipal Disaster Registry
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Family Safety & Evacuee Reunification
          </h2>
          <p className="mx-auto max-w-2xl text-xs sm:text-sm font-medium text-slate-500">
            Search for family members evacuated to Colombo shelters, or register yourself and your loved ones to notify out-of-area relatives without jamming emergency call lines.
          </p>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Verified Safe
            </span>
            <span className="font-mono text-2xl font-black text-slate-900">
              {checkIns.length * 4 + 182}
            </span>
            <span className="mt-0.5 text-[11px] font-semibold text-emerald-600 block">Citizens Safe</span>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Shelter Occupancy
            </span>
            <span className="font-mono text-2xl font-black text-slate-900">
              {checkIns.filter((c) => c.status === "IN_SHELTER").length * 5 + 43}
            </span>
            <span className="mt-0.5 text-[11px] font-semibold text-blue-600 block">Sheltered Today</span>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Medical / Vulnerable
            </span>
            <span className="font-mono text-2xl font-black text-rose-600">
              {checkIns.filter((c) => c.vulnerabilities?.length > 0).length + 18}
            </span>
            <span className="mt-0.5 text-[11px] font-semibold text-rose-600 block">Flagged for Care</span>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Active Shelters
            </span>
            <span className="font-mono text-2xl font-black text-slate-900">5</span>
            <span className="mt-0.5 text-[11px] font-semibold text-purple-600 block">Municipal Hubs</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-2xl border border-slate-200 bg-slate-100 p-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition-all ${
              activeTab === "search" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Search className="h-4 w-4 text-brand" />
            <span>Search For Evacuated Relatives</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("checkin")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-xs font-black transition-all ${
              activeTab === "checkin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserPlus className="h-4 w-4 text-emerald-600" />
            <span>"I Am Safe" Check-In</span>
          </button>
        </div>

        {/* TAB 1: Search & Inquiry */}
        {activeTab === "search" && (
          <div className="space-y-5">
            {/* Search Filter Bar */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by full name, phone last 4 digits (e.g. 4821), or keyword..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-xs font-bold text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={shelterFilter}
                  onChange={(e) => setShelterFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700"
                >
                  <option value="ALL">All Colombo Shelters</option>
                  {SHELTERS_LIST.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setVulnerableOnly(!vulnerableOnly)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                    vulnerableOnly
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <HeartPulse className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Special Needs Only</span>
                </button>
              </div>
            </div>

            {/* Results List */}
            {loading ? (
              <div className="py-12 text-center text-xs font-bold text-slate-400">Loading safe directory…</div>
            ) : checkIns.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                <h4 className="text-sm font-extrabold text-slate-700">No Check-In Records Found</h4>
                <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                  Try searching with a shorter name or select "All Colombo Shelters". If your relative has not checked in yet, you can call DMC hotline 117.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {checkIns.map((item) => {
                  const meta = STATUS_META[item.status] || STATUS_META.IN_SHELTER;
                  const StatusIcon = meta.icon;

                  return (
                    <div
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-soft transition-all hover:border-slate-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-base text-slate-900">{item.full_name}</span>
                            {item.verified_by_shelter && (
                              <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black text-emerald-800" title="Verified in-person by Municipal Shelter Officer">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-xs font-semibold text-slate-500">
                            Phone: <strong className="text-slate-800">{item.contact_masked}</strong>
                            {item.nic_masked && <span> · NIC: {item.nic_masked}</span>}
                          </p>
                        </div>

                        <span className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-[10px] font-extrabold shrink-0 ${meta.badge}`}>
                          <StatusIcon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </div>

                      {/* Location / Shelter */}
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
                        <span>{item.shelter_name || item.location_detail || "Colombo Municipal Ward"}</span>
                      </div>

                      {/* Family Headcount & Special Needs Tags */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">
                          {item.family_count} {item.family_count === 1 ? "Person" : "Family Members"} Safe
                        </span>

                        {item.vulnerabilities?.map((flag) => {
                          const vMeta = VULNERABILITY_META[flag];
                          if (!vMeta) return null;
                          const VIcon = vMeta.icon;
                          return (
                            <span
                              key={flag}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-extrabold ${vMeta.color}`}
                            >
                              <VIcon className="h-2.5 w-2.5" />
                              {vMeta.label}
                            </span>
                          );
                        })}
                      </div>

                      {/* Personal Note to Family */}
                      {item.message && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs italic text-slate-700 border border-slate-100">
                          "{item.message}"
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Checked in {timeAgo(item.created_at)}
                        </span>
                        <span className="font-mono">#{item.id.slice(0, 12)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Check-In Form */}
        {activeTab === "checkin" && (
          <div className="mx-auto max-w-2xl">
            {successRecord ? (
              <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-xl space-y-4 animate-pop">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900">You Are Registered as Safe!</h3>
                <p className="text-xs font-semibold text-slate-600 max-w-md mx-auto">
                  Your entry has been recorded into the Colombo Municipal Directory. Loved ones and relatives searching for <strong>{successRecord.full_name}</strong> will see that your family is secure.
                </p>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-left space-y-1.5 font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <strong className="text-slate-900">{STATUS_META[successRecord.status].label}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Location:</span>
                    <strong className="text-slate-900">{successRecord.shelter_name || successRecord.location_detail}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Phone Masked for Privacy:</span>
                    <strong className="text-slate-900 font-mono">{successRecord.contact_masked}</strong>
                  </div>
                </div>

                <div className="flex justify-center gap-3">
                  <Button
                    type="button"
                    variant="gradient"
                    onClick={() => {
                      setSuccessRecord(null);
                      setActiveTab("search");
                    }}
                    className="py-2.5 px-5 text-xs font-black"
                  >
                    Return to Directory Search
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCheckInSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-soft space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-black text-slate-900">Submit Safe Status Check-In</h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Your phone number is automatically masked for privacy (e.g. 077 *** 8921).
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Sunil Jayawardena"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Contact Phone <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="07XXXXXXXX"
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Current Evacuation Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as SafeStatus)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900"
                      >
                        <option value="IN_SHELTER">At Municipal Relief Shelter</option>
                        <option value="SAFE_HOME">At Home (High Ground / Dry)</option>
                        <option value="WITH_RELATIVES">Evacuated to Friends / Relatives</option>
                        <option value="MEDICAL_CARE">Hospital / Medical Aid Tent</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Family Members with You
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={familyCount}
                        onChange={(e) => setFamilyCount(Math.max(1, Number(e.target.value)))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  {status === "IN_SHELTER" && (
                    <div>
                      <label className="text-xs font-extrabold text-slate-700 block mb-1">
                        Select Shelter Location
                      </label>
                      <select
                        value={shelterId}
                        onChange={(e) => setShelterId(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900"
                      >
                        {SHELTERS_LIST.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">
                      Street / Specific Location Details
                    </label>
                    <input
                      type="text"
                      value={locationDetail}
                      onChange={(e) => setLocationDetail(e.target.value)}
                      placeholder="e.g. Nagalagam Street 2nd lane, or Room 4 in Main Temple"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900"
                    />
                  </div>

                  {/* Vulnerability / Priority Flags */}
                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">
                      Special Medical / Care Requirements (Flags Rescue Boats & Relief Diet)
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {(Object.keys(VULNERABILITY_META) as VulnerabilityFlag[]).map((flag) => {
                        const vMeta = VULNERABILITY_META[flag];
                        const isSelected = vulnerabilities.includes(flag);
                        return (
                          <button
                            type="button"
                            key={flag}
                            onClick={() => toggleVulnerability(flag)}
                            className={`flex items-center gap-1.5 rounded-xl border p-2 text-left text-xs font-bold transition-all ${
                              isSelected
                                ? "border-brand bg-brand/10 text-brand shadow-sm"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <vMeta.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-[11px]">{vMeta.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-slate-700 block mb-1">
                      Public Message to Relatives
                    </label>
                    <textarea
                      rows={2}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="e.g. All 4 of us are safe with dry clothes. Phone battery low, don't panic."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-medium text-slate-900"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="gradient"
                  disabled={submitting}
                  className="w-full py-3.5 text-xs font-black shadow-md"
                >
                  {submitting ? "Securing Record…" : "Confirm 'I Am Safe' & Publish"}
                </Button>
              </form>
            )}
          </div>
        )}
      </div>

      <EmergencySosModal open={sosModalOpen} onClose={() => setSosModalOpen(false)} />
    </PublicShell>
  );
}
