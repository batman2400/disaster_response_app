"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Eye,
  Flame,
  Globe,
  HardHat,
  LocateFixed,
  MapPin,
  Package,
  Search,
  Shield,
  ShieldAlert,
  Sparkles,
  Truck,
  Waves,
  X,
} from "lucide-react";

import { EmergencyBroadcastBanner } from "@/components/emergency-broadcast-banner";
import { EmergencySosModal } from "@/components/emergency-sos-modal";
import { PublicShell } from "@/components/public-shell";
import { Badge, Button, Card, StatusBadge, UrgencyBadge } from "@/components/ui";
import { categoryLabel, timeAgo, wardShort } from "@/lib/format";
import { LanguageSwitcher, useI18n } from "@/lib/i18n/language-context";
import type { HazardRow } from "@/lib/types";

export default function TrackPage() {
  const router = useRouter();
  const { lang, t } = useI18n();
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [myReportIds, setMyReportIds] = useState<string[]>([]);
  const [recentHazards, setRecentHazards] = useState<HazardRow[]>([]);
  const [sosModalOpen, setSosModalOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("fender_my_reports");
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        setMyReportIds(ids.slice(0, 10));
      }
    } catch {
      // ignore
    }

    fetch("/api/hazards")
      .then((res) => res.json())
      .then((data: HazardRow[]) => {
        setRecentHazards(data.slice(0, 6));
      })
      .catch(() => {});
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim().replace(/^#?(CLM-)?/i, "").toLowerCase();
    if (!query) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/hazards");
      if (!res.ok) throw new Error("Failed to fetch hazard reports");
      const list = (await res.json()) as HazardRow[];

      const matched = list.find((h) => {
        const idLower = h.id.toLowerCase();
        return idLower === query || idLower.startsWith(query) || idLower.slice(0, 8) === query;
      });

      if (matched) {
        router.push(`/report/track/${matched.id}`);
      } else {
        setError(`No incident report found matching "${searchInput}". Check reference number or search recent incidents below.`);
      }
    } catch {
      setError("Network connection issue while searching for incident report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicShell>
      {/* Top Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/20 bg-white/85 px-6 py-3.5 backdrop-blur-lg lg:px-10">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            title="Return to Home"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-600 shadow-sm active:scale-90"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-brand animate-ping" />
            <span className="text-xs font-extrabold uppercase tracking-wider text-brand">
              Citizen Tracking Bay
            </span>
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

      <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8 max-w-5xl mx-auto w-full">
        {/* Title Hero */}
        <div className="mb-8 rounded-3xl border border-blue-100 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-purple-50/80 p-6 shadow-soft lg:p-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-sm">
                Live Resolution Tracker
              </span>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                AI + Field Operations
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-900 lg:text-3xl">
              {lang === "si"
                ? "ආපදා වාර්තා තත්ත්වය සොයන්න"
                : lang === "ta"
                ? "பேரிடர் அறிக்கை நிலையை கண்காணிக்கவும்"
                : "Track Incident Resolution Status"}
            </h1>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600 lg:text-sm">
              {lang === "si"
                ? "ඔබ ඉදිරිපත් කළ ආපදා වාර්තාවේ AI පරීක්ෂණ ප්‍රතිඵලය, නගර සභා අනුමැතිය හා ක්ෂේත්‍ර කාර්ය මණ්ඩලය යොමු කළ තත්ත්වය ක්ෂණිකව බලාගන්න."
                : lang === "ta"
                ? "நீங்கள் சமர்ப்பித்த அறிக்கையின் AI சரிபார்ப்பு, மாநகர சபை ஒப்புதல் மற்றும் மீட்புக் குழுவின் நேரலை நிலையை தெரிந்து கொள்ளுங்கள்."
                : "Follow the live journey of any reported flood hazard or emergency call from initial AI vision verification to municipal crew dispatch and on-site photo resolution."}
            </p>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mt-6">
            <div className="relative flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Enter Tracking Token e.g. #CLM-8F32 or full incident ID..."
                  className="w-full rounded-2xl border border-slate-200/90 bg-white py-3.5 pl-11 pr-4 text-xs font-bold text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light"
                />
              </div>
              <Button
                type="submit"
                variant="gradient"
                disabled={loading || !searchInput.trim()}
                className="py-3.5 px-6 text-xs font-extrabold shrink-0"
              >
                <Activity className="h-4 w-4" />
                <span>{loading ? "Searching..." : "Track Incident"}</span>
              </Button>
            </div>
            {error && <p className="mt-2 text-xs font-bold text-rose-600">{error}</p>}
          </form>
        </div>

        {/* My Submitted Reports (from localStorage) */}
        {myReportIds.length > 0 && (
          <div className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
                My Recently Reported Incidents ({myReportIds.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myReportIds.map((id) => (
                <Link
                  key={id}
                  href={`/report/track/${id}`}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-soft transition-all hover:border-brand hover:shadow-md active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-brand">
                      <Cpu className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-mono text-xs font-black text-slate-900">
                        #CLM-{id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">Track resolution progress</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recent Public Incidents */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
                Recent Colombo Active Incidents
              </h2>
            </div>
            <Link href="/map" className="text-xs font-bold text-brand hover:underline">
              View on Live Map →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentHazards.map((h) => (
              <Link
                key={h.id}
                href={`/report/track/${h.id}`}
                className="group flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-soft transition-all hover:border-slate-200 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-[10px] font-extrabold tracking-wider text-slate-400">
                      #CLM-{h.id.slice(0, 8).toUpperCase()}
                    </span>
                    <StatusBadge status={h.status} />
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-brand transition-colors">
                    {categoryLabel(h.category, lang)}
                  </h3>

                  <p className="mt-1 text-xs font-medium text-slate-500 line-clamp-2">
                    {h.description || "Reported hazard in Colombo flood basin"}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                  <span>{wardShort(h.ward_id)}</span>
                  <span>{timeAgo(h.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      <EmergencySosModal open={sosModalOpen} onClose={() => setSosModalOpen(false)} />
    </PublicShell>
  );
}
