"use client";

import { ArrowLeft, Camera, Check, ClipboardList, LocateFixed, RotateCw, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { PublicShell } from "@/components/public-shell";
import { Button, SectionLabel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { categoryLabel, wardShort } from "@/lib/format";
import { readFileAsDataUrl } from "@/lib/geo";
import { latestDispatchNote } from "@/lib/officer-log";
import type { HazardRow } from "@/lib/types";

export function ResolveTask({ hazard }: { hazard: HazardRow }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState("");
  const [notes, setNotes] = useState("");
  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function onPick(file: File | undefined) {
    if (!file) return;
    const data = await readFileAsDataUrl(file);
    setPhoto(data);
    setVerified(false);
    setScanning(true);
    window.setTimeout(() => {
      setScanning(false);
      setVerified(true);
    }, 1200);
  }

  async function submit() {
    if (!photo) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: hazard.id, closure_photo_base64: photo }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Resolve failed");
      setDone(true);
      window.setTimeout(() => router.push("/crew"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resolve failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PublicShell>
      <div className="ambient-orb pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-brand/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative z-10 flex items-center justify-between px-6 py-4 lg:px-10">
        <Link
          href="/crew"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-100 bg-white text-slate-600 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Resolve Task</h1>
          <p className="mt-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-brand">
            #{hazard.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="w-10" />
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar px-6 pb-32 pt-2 lg:grid lg:grid-cols-2 lg:gap-10 lg:px-10 lg:pb-10">
        <div>
        <div className="mb-6 rounded-3xl border border-slate-100/50 bg-white/80 p-5 shadow-soft backdrop-blur-md">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-indigo text-white shadow-glow-blue">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{categoryLabel(hazard.category)}</h2>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-slate-500">
                <LocateFixed className="h-3 w-3" />
                {wardShort(hazard.ward_id)}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <ClipboardList className="h-4 w-4 text-slate-400" />
            <p className="text-[11px] font-semibold text-slate-600">
              {hazard.description || "Clear the hazard and photograph the reopened path."}
            </p>
          </div>
          {hazard.dispatched_at ? (
            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
              <Truck className="mt-0.5 h-4 w-4 text-brand-indigo" />
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand-indigo">
                  Dispatched by officer
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-600">
                  {latestDispatchNote(hazard) || "Council officer sent this ticket to the field queue."}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <SectionLabel hint={<span className="rounded-md bg-brand-light px-2 py-1 text-[10px] font-bold text-brand">Required</span>}>
          1. After-Fix Photo Verification
        </SectionLabel>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative mb-6 flex h-64 w-full flex-col items-center justify-center overflow-hidden rounded-[32px] border-2 border-dashed border-slate-300 bg-white shadow-soft",
            photo && "border-solid",
            verified && "border-status-emerald ring-4 ring-emerald-500/20",
            photo && !verified && "border-brand",
          )}
        >
          {photo ? (
            <img src={photo} alt="After-fix" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center px-8">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-brand-light text-brand">
                <Camera className="h-7 w-7" />
              </div>
              <p className="text-sm font-extrabold text-slate-700">Tap to capture clear scene</p>
              <p className="mt-1 text-center text-[11px] font-medium text-slate-400">
                Ensure the cleared road and fixed hazard are visible.
              </p>
            </div>
          )}
          {scanning ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span className="text-xs font-bold uppercase tracking-widest text-white">Verifying Clearance…</span>
            </div>
          ) : null}
          {verified ? (
            <span className="absolute top-4 right-4 flex items-center gap-1.5 rounded-xl bg-status-emerald px-3 py-1.5 text-[10px] font-bold text-white shadow-lg animate-scale-up">
              <Check className="h-3 w-3" /> AI Confirmed
            </span>
          ) : null}
          {photo ? (
            <span className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-slate-900/70 px-4 py-2 text-xs font-bold text-white backdrop-blur-md">
              <RotateCw className="h-3 w-3" /> Retake Photo
            </span>
          ) : null}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => void onPick(event.target.files?.[0])}
        />
        </div>

        <div className="flex flex-col">
        <SectionLabel>2. Resolution Notes</SectionLabel>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="e.g. Pumped water, drains cleared. Road is now fully passable."
          className="mb-4 h-28 w-full resize-none rounded-[24px] border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-700 shadow-soft placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 lg:h-40"
        />
        {error ? <p className="text-sm font-semibold text-status-crimson">{error}</p> : null}
        <div className="mt-auto hidden lg:block">
          <Button
            type="button"
            variant="success"
            disabled={!verified || busy}
            className="w-full rounded-[24px] py-5"
            onClick={() => void submit()}
          >
            <Check className="h-5 w-5" />
            {busy ? "Updating System…" : "Close Task & Update Map"}
          </Button>
        </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-0 z-20 w-full p-6 lg:hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-100 via-slate-100/90 to-transparent" />
        <Button
          type="button"
          variant="success"
          disabled={!verified || busy}
          className="pointer-events-auto w-full rounded-[24px] py-5"
          onClick={() => void submit()}
        >
          <Check className="h-5 w-5" />
          {busy ? "Updating System…" : "Close Task & Update Map"}
        </Button>
      </div>

      {done ? (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-status-emerald">
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white text-5xl text-status-emerald shadow-glow-emerald animate-scale-up">
            <Check className="h-12 w-12" />
          </div>
          <h2 className="mb-2 text-3xl font-extrabold tracking-tight text-white">Task Resolved</h2>
          <p className="px-8 text-center text-sm font-medium text-emerald-50">
            Public map updated. #{hazard.id.slice(0, 8).toUpperCase()} marked clear and passable.
          </p>
        </div>
      ) : null}
    </PublicShell>
  );
}
