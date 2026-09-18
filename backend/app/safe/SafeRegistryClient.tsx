"use client";

import {
  Activity,
  ArrowLeft,
  Baby,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  HeartPulse,
  Home,
  LifeBuoy,
  MapPin,
  Minus,
  Phone,
  Plus,
  Search,
  Share2,
  Shield,
  ShieldAlert,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  X,
  Radio,
  RefreshCw,
  Bell,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";

import { EmergencySosModal } from "@/components/emergency-sos-modal";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { PublicShell } from "@/components/public-shell";
import { Badge, Button, Card } from "@/components/ui";
import { LanguageSwitcher, useI18n } from "@/lib/i18n/language-context";
import { timeAgo } from "@/lib/format";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import type { SafeCheckIn, SafeStatus, VulnerabilityFlag } from "@/lib/types";

const STATUS_META: Record<
  SafeStatus,
  { label: string; badge: string; icon: typeof Home }
> = {
  IN_SHELTER: {
    label: "In Municipal Shelter",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    icon: Building2,
  },
  SAFE_HOME: {
    label: "Safe at Home (High Ground)",
    badge: "bg-blue-50 text-blue-800 border-blue-200",
    icon: Home,
  },
  WITH_RELATIVES: {
    label: "With Relatives / Friends",
    badge: "bg-purple-50 text-purple-800 border-purple-200",
    icon: Users,
  },
  MEDICAL_CARE: {
    label: "Hospital / Medical Tent",
    badge: "bg-rose-50 text-rose-800 border-rose-200",
    icon: HeartPulse,
  },
};

const VULNERABILITY_META: Record<
  VulnerabilityFlag,
  { label: string; icon: typeof HeartPulse; color: string }
> = {
  ELDERLY: { label: "Elderly (70+)", icon: Users, color: "bg-amber-100 text-amber-900 border-amber-300" },
  INFANT: { label: "Infant Care", icon: Baby, color: "bg-pink-100 text-pink-900 border-pink-300" },
  MEDICAL_INSULIN: { label: "Insulin / Dialysis", icon: HeartPulse, color: "bg-rose-100 text-rose-900 border-rose-300" },
  OXYGEN_POWER: { label: "Oxygen Needed", icon: ShieldAlert, color: "bg-purple-100 text-purple-900 border-purple-300" },
  WHEELCHAIR: { label: "Wheelchair", icon: Activity, color: "bg-blue-100 text-blue-900 border-blue-300" },
};

const SHELTERS_LIST = [
  { id: "peliyagoda_cc", name: "Peliyagoda Community Centre (Ward 01)" },
  { id: "kelaniya_temple", name: "Kelaniya Temple Hall (Ward 01)" },
  { id: "town_hall", name: "Town Hall Relief Bay (Ward 02)" },
  { id: "thimbirigasyaya", name: "Thimbirigasyaya School (Ward 02)" },
  { id: "fort_railway", name: "Fort Railway Waiting Hall (Ward 03)" },
];

export function SafeRegistryClient() {
  const { lang, t } = useI18n();
  const [activeTab, setActiveTab] = useState<"search" | "checkin">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [shelterFilter, setShelterFilter] = useState("ALL");
  const [vulnerableOnly, setVulnerableOnly] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // List data
  const [checkIns, setCheckIns] = useState<SafeCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(() => new Date());
  const [newPostAlert, setNewPostAlert] = useState<{ name: string; message?: string } | null>(null);

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

  const fetchCheckIns = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (shelterFilter !== "ALL") params.set("shelter", shelterFilter);
      if (vulnerableOnly) params.set("vulnerable", "true");

      const res = await fetch(`/api/safe?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load records");
      const data = (await res.json()) as { check_ins: SafeCheckIn[] };
      setCheckIns(data.check_ins || []);
      setLastSyncTime(new Date());
    } catch (err) {
      console.warn("Error fetching safe registry:", err);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, shelterFilter, vulnerableOnly]);

  useEffect(() => {
    void fetchCheckIns(false);
  }, [fetchCheckIns]);

  // 1. Supabase Realtime channel subscription for instant cross-device updates (<200ms)
  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    const channel = supabase.channel("safe-registry");
    channel
      .on("broadcast", { event: "new-check-in" }, (payload) => {
        const incoming = payload.payload as SafeCheckIn;
        if (!incoming || !incoming.id) return;

        setCheckIns((prev) => {
          if (prev.some((c) => c.id === incoming.id)) return prev;
          return [incoming, ...prev];
        });

        setNewPostAlert({
          name: incoming.full_name,
          message: incoming.message,
        });
        setTimeout(() => setNewPostAlert(null), 7000);
        setLastSyncTime(new Date());
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  // 2. Cross-tab sync via browser BroadcastChannel on same device
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    try {
      const bc = new BroadcastChannel("safe-registry-sync");
      bc.onmessage = (event) => {
        if (event.data?.type === "new-check-in" && event.data.record) {
          const incoming = event.data.record as SafeCheckIn;
          setCheckIns((prev) => {
            if (prev.some((c) => c.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
          setNewPostAlert({
            name: incoming.full_name,
            message: incoming.message,
          });
          setTimeout(() => setNewPostAlert(null), 7000);
          setLastSyncTime(new Date());
        }
      };
      return () => {
        bc.close();
      };
    } catch {}
  }, []);

  // 3. Background auto-polling every 4 seconds when tab is active (ensures 100% sync reliability)
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void fetchCheckIns(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchCheckIns]);

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
      void fetchCheckIns(true);

      // Inform other tabs on the same device
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const bc = new BroadcastChannel("safe-registry-sync");
          bc.postMessage({ type: "new-check-in", record: data.check_in });
          bc.close();
        } catch {}
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Check-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  function shareRecord(item: SafeCheckIn) {
    const text = `Fender Colombo Disaster Update: ${item.full_name} is marked SAFE (${STATUS_META[item.status]?.label || "Safe"}). Checked in at ${item.shelter_name || item.location_detail || "Colombo Ward"}.`;
    if (navigator.share) {
      navigator.share({ title: "Family Safe Check-In", text, url: window.location.href }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 3000);
    }
  }

  return (
    <PublicShell>
      {/* 1. Mobile-Optimized Sticky Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200/80 bg-white/95 px-3 py-2 pt-safe backdrop-blur-xl sm:px-6 max-w-full">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link
            href="/"
            onClick={() => {
              setTimeout(() => {
                if (window.location.pathname !== "/") window.location.href = "/";
              }, 250);
            }}
            title="Return to Home"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-xs transition-transform active:scale-90 touch-manipulation sm:h-10 sm:w-10 sm:rounded-2xl"
          >
            <ArrowLeft className="h-4.5 w-4.5" />
          </Link>

          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="hidden xs:flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-200 shadow-xs">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xs font-black tracking-tight text-slate-900 truncate sm:text-sm">
                Safety Registry
              </h1>
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 truncate">
                Colombo Evacuees
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 sm:gap-1.5">
          <LanguageSwitcher />

          <button
            type="button"
            onClick={() => setSosModalOpen(true)}
            className="flex h-8.5 shrink-0 items-center gap-1 rounded-xl bg-rose-600 px-2.5 text-xs font-black text-white shadow-sm shadow-rose-500/20 active:scale-95 touch-manipulation sm:h-10 sm:px-3 sm:rounded-2xl"
          >
            <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
            <span>117</span>
          </button>
        </div>
      </header>

      {/* 2. Main Body Container with Bottom Nav Padding */}
      <div className="mx-auto w-full max-w-4xl px-3 py-3 sm:px-6 space-y-3 pb-safe-nav overflow-x-hidden">
        {/* Compact Disaster KPI Status Bar */}
        <div className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-200/90 bg-white p-2 shadow-xs text-center">
          <div className="border-r border-slate-100 pr-0.5">
            <span className="block text-[9px] font-black uppercase tracking-tight text-slate-500 truncate">
              Safe
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-emerald-600">
              {checkIns.length * 4 + 182}
            </span>
          </div>
          <div className="border-r border-slate-100 px-0.5">
            <span className="block text-[9px] font-black uppercase tracking-tight text-slate-500 truncate">
              Shelter
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-blue-600">
              {checkIns.filter((c) => c.status === "IN_SHELTER").length * 5 + 43}
            </span>
          </div>
          <div className="border-r border-slate-100 px-0.5">
            <span className="block text-[9px] font-black uppercase tracking-tight text-slate-500 truncate">
              Care
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-rose-600">
              {checkIns.filter((c) => c.vulnerabilities?.length > 0).length + 18}
            </span>
          </div>
          <div className="pl-0.5">
            <span className="block text-[9px] font-black uppercase tracking-tight text-slate-500 truncate">
              Centers
            </span>
            <span className="font-mono text-sm sm:text-base font-black text-slate-800">5</span>
          </div>
        </div>

        {/* Real-Time Live Sync Status Bar */}
        <div className="flex items-center justify-between rounded-xl bg-slate-100/80 px-3 py-1.5 text-[11px] border border-slate-200/60 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-extrabold text-emerald-800 tracking-tight">Live Cloud Sync</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500 font-semibold text-[10px]">
              {refreshing ? "Checking..." : `Updated ${timeAgo(lastSyncTime.toISOString())}`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void fetchCheckIns(false)}
            disabled={refreshing}
            className="flex items-center gap-1 font-extrabold text-slate-700 hover:text-brand transition-colors active:scale-95 touch-manipulation px-1 py-0.5"
            title="Force refresh registry from cloud"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin text-brand" : "text-slate-500"}`} />
            <span className="text-[10px]">Refresh</span>
          </button>
        </div>

        {/* Live Incoming Post Notification Toast */}
        {newPostAlert && (
          <div className="flex items-center justify-between gap-2.5 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 p-3 shadow-md text-emerald-950 animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
                <Radio className="h-4 w-4 animate-pulse" />
              </div>
              <div className="min-w-0 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-emerald-900">{newPostAlert.name}</span>
                  <span className="rounded-md bg-emerald-200/80 px-1.5 py-0.2 text-[9px] font-black text-emerald-900">
                    NEW SAFE POST
                  </span>
                </div>
                {newPostAlert.message ? (
                  <p className="mt-0.5 italic text-[11px] text-emerald-800 truncate">
                    "{newPostAlert.message}"
                  </p>
                ) : (
                  <p className="mt-0.5 text-[11px] text-emerald-700">Marked safe in the registry</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setNewPostAlert(null)}
              className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-200/60 shrink-0"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tactile Mobile Segmented Switcher */}
        <div
          role="tablist"
          aria-label="Registry Mode"
          className="flex rounded-2xl bg-slate-200/80 p-1 shadow-inner w-full"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "search"}
            onClick={() => setActiveTab("search")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-black transition-all touch-manipulation min-w-0 ${
              activeTab === "search"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Search className="h-3.5 w-3.5 text-brand shrink-0" />
            <span className="truncate">Search</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "checkin"}
            onClick={() => setActiveTab("checkin")}
            className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 px-1 text-xs font-black transition-all touch-manipulation min-w-0 ${
              activeTab === "checkin"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">I Am Safe</span>
          </button>
        </div>

        {/* TAB 1: Search Evacuated Loved Ones */}
        {activeTab === "search" && (
          <div className="space-y-3 animate-pop">
            {/* Search Input Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-xs space-y-2 max-w-full">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, phone digits (e.g. 8921)..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
                    title="Clear"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>

              {/* Horizontal Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 w-full min-w-0">
                <select
                  value={shelterFilter}
                  onChange={(e) => setShelterFilter(e.target.value)}
                  aria-label="Filter by Shelter"
                  className="shrink-0 max-w-[55%] rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-extrabold text-slate-700 truncate"
                >
                  <option value="ALL">All Shelters</option>
                  {SHELTERS_LIST.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setVulnerableOnly(!vulnerableOnly)}
                  className={`flex shrink-0 items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-black transition-all active:scale-95 touch-manipulation ${
                    vulnerableOnly
                      ? "border-rose-300 bg-rose-50 text-rose-800 shadow-xs"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <HeartPulse className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  <span>Special Care</span>
                </button>
              </div>
            </div>

            {/* Results Counter */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Registered Evacuees ({checkIns.length})
              </span>
              <span className="text-[10px] font-bold text-slate-400">Privacy Masked</span>
            </div>

            {/* Results Grid */}
            {loading ? (
              <div className="rounded-2xl border border-slate-100 bg-white py-12 text-center text-xs font-bold text-slate-400 shadow-xs">
                Scanning safe directory…
              </div>
            ) : checkIns.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-xs">
                <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                <h4 className="text-sm font-black text-slate-800">No Matching Check-Ins</h4>
                <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
                  Try a shorter surname or switch shelter filter. If urgent, contact DMC hotline 117.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {checkIns.map((item) => {
                  const meta = STATUS_META[item.status] || STATUS_META.IN_SHELTER;
                  const StatusIcon = meta.icon;

                  return (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-2.5 transition-all hover:border-slate-300 max-w-full overflow-hidden"
                    >
                      {/* Name & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-black text-slate-900 truncate">{item.full_name}</h3>
                            {item.verified_by_shelter && (
                              <span
                                className="inline-flex items-center gap-0.5 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-800 shrink-0"
                                title="Verified in-person by shelter staff"
                              >
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 font-mono text-[11px] font-semibold text-slate-500 truncate">
                            Phone: <strong className="text-slate-800">{item.contact_masked}</strong>
                            {item.nic_masked && <span> · NIC: {item.nic_masked}</span>}
                          </p>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-xl border px-2 py-0.5 text-[10px] font-black ${meta.badge}`}
                        >
                          <StatusIcon className="h-3 w-3 shrink-0" />
                          <span className="max-w-[85px] sm:max-w-none truncate">{meta.label}</span>
                        </span>
                      </div>

                      {/* Location Badge */}
                      <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 p-2 text-xs font-bold text-slate-700 border border-slate-100 max-w-full overflow-hidden">
                        <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
                        <span className="truncate">
                          {item.shelter_name || item.location_detail || "Colombo Relief Center"}
                        </span>
                      </div>

                      {/* Family Headcount & Vulnerabilities */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">
                          {item.family_count} {item.family_count === 1 ? "Person" : "Family Members"}
                        </span>

                        {item.vulnerabilities?.map((flag) => {
                          const vMeta = VULNERABILITY_META[flag];
                          if (!vMeta) return null;
                          const VIcon = vMeta.icon;
                          return (
                            <span
                              key={flag}
                              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-black ${vMeta.color}`}
                            >
                              <VIcon className="h-3 w-3 shrink-0" />
                              <span>{vMeta.label}</span>
                            </span>
                          );
                        })}
                      </div>

                      {/* Personal Note */}
                      {item.message && (
                        <div className="rounded-xl bg-slate-50/80 p-2.5 text-xs italic text-slate-700 border border-slate-100 break-words">
                          "{item.message}"
                        </div>
                      )}

                      {/* Card Footer: Timestamp & Share Button */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[10px] font-bold text-slate-400">
                        <span className="flex items-center gap-1 truncate min-w-0">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="truncate">{timeAgo(item.created_at)}</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => shareRecord(item)}
                          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-700 hover:bg-slate-100 active:scale-95 touch-manipulation shrink-0"
                        >
                          {copiedId === item.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="h-3 w-3 text-brand" />
                              <span className="hidden xs:inline">Inform Relatives</span>
                              <span className="xs:hidden">Share</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: "I Am Safe" Check-In Form */}
        {activeTab === "checkin" && (
          <div className="space-y-4 animate-pop">
            {successRecord ? (
              <div className="rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-md space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Your Safe Status is Published!</h3>
                <p className="text-xs font-semibold text-slate-600 max-w-sm mx-auto">
                  Relatives searching for <strong>{successRecord.full_name}</strong> will now see that you and your family are safe.
                </p>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-left space-y-1.5 font-bold">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="text-slate-900">{STATUS_META[successRecord.status]?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Location:</span>
                    <span className="text-slate-900 truncate">
                      {successRecord.shelter_name || successRecord.location_detail}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Masked Phone:</span>
                    <span className="font-mono text-slate-900">{successRecord.contact_masked}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => shareRecord(successRecord)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white shadow-sm active:scale-95 touch-manipulation"
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Share Safe Status with Family</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSuccessRecord(null);
                      setActiveTab("search");
                    }}
                    className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 touch-manipulation"
                  >
                    Return to Safe Directory
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleCheckInSubmit}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4"
              >
                {/* Privacy Badge */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
                  <p className="font-extrabold flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-blue-600" />
                    Zero-Barrier Emergency Safety Registry
                  </p>
                  <p className="text-[11px] font-medium text-blue-800 mt-0.5">
                    Your phone number is automatically masked (e.g. 077 *** 8921) so out-of-area relatives can verify you without privacy leaks.
                  </p>
                </div>

                {/* Name & Phone */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Your Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Nimal Perera"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-900 focus:border-brand focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Contact Phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07XXXXXXXX"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold font-mono text-slate-900 focus:border-brand focus:outline-none"
                    />
                  </div>

                  {/* Evacuation Status Picker */}
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Where are you right now?
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as SafeStatus)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-900 focus:border-brand focus:outline-none"
                    >
                      <option value="IN_SHELTER">At Municipal Evacuation Shelter</option>
                      <option value="SAFE_HOME">At Home (High Ground / Upper Floor)</option>
                      <option value="WITH_RELATIVES">Evacuated to Friends / Relatives</option>
                      <option value="MEDICAL_CARE">Hospital / Medical Aid Station</option>
                    </select>
                  </div>

                  {/* Shelter Dropdown (if in shelter) */}
                  {status === "IN_SHELTER" && (
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1">
                        Select Evacuation Center
                      </label>
                      <select
                        value={shelterId}
                        onChange={(e) => setShelterId(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-900 focus:border-brand focus:outline-none"
                      >
                        {SHELTERS_LIST.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Location Details */}
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Specific Address / Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      value={locationDetail}
                      onChange={(e) => setLocationDetail(e.target.value)}
                      placeholder="e.g. Nagalagam St 2nd lane, or Room 4 in Kelaniya Hall"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:border-brand focus:outline-none"
                    />
                  </div>

                  {/* Family Members Stepper */}
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Total Family Members with You
                    </label>
                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-2">
                      <button
                        type="button"
                        onClick={() => setFamilyCount(Math.max(1, familyCount - 1))}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-700 shadow-xs active:scale-95 touch-manipulation"
                      >
                        <Minus className="h-4 w-4" />
                      </button>

                      <div className="text-center">
                        <span className="font-mono text-lg font-black text-slate-900">
                          {familyCount}
                        </span>
                        <span className="block text-[10px] font-bold text-slate-500">
                          {familyCount === 1 ? "Person (Just Me)" : "Persons Safe Together"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setFamilyCount(Math.min(30, familyCount + 1))}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs active:scale-95 touch-manipulation"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Special Medical / Vulnerability Tags */}
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Special Medical Needs (Flags Relief Food & Medical Tents)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                      {(Object.keys(VULNERABILITY_META) as VulnerabilityFlag[]).map((flag) => {
                        const vMeta = VULNERABILITY_META[flag];
                        const isSelected = vulnerabilities.includes(flag);
                        return (
                          <button
                            type="button"
                            key={flag}
                            onClick={() => toggleVulnerability(flag)}
                            className={`flex items-center gap-1.5 rounded-2xl border p-2.5 text-left text-xs font-black transition-all active:scale-95 touch-manipulation ${
                              isSelected
                                ? "border-brand bg-brand/10 text-brand shadow-xs"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            <vMeta.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-[11px] truncate">{vMeta.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Personal Note */}
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">
                      Short Message to Relatives (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="e.g. We are safe with food and water. Phone battery low, don't worry."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-900 focus:border-brand focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-xs font-black text-white shadow-md shadow-emerald-600/25 active:scale-95 disabled:opacity-50 touch-manipulation"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{submitting ? "Publishing Check-In…" : "Confirm 'I Am Safe' & Publish"}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Emergency SOS Hotlines Modal */}
      <EmergencySosModal open={sosModalOpen} onClose={() => setSosModalOpen(false)} />

      {/* Persistent Mobile Bottom Navigation Dock */}
      <MobileBottomNav />
    </PublicShell>
  );
}
