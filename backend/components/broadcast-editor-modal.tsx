"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  Megaphone,
  Radio,
  Send,
  ShieldAlert,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { Modal } from "./ui/modal";
import type { BroadcastAlert } from "@/lib/db";
import { WARDS } from "@/lib/format";

const CANNED_ALERTS = [
  {
    label: "Kelani River Minor Flood",
    severity: "CRITICAL" as const,
    ward_id: "ward_01",
    text: "Kelani River minor flood warning issued. Water approaching Low Level Road in Nagalagam Street. Avoid riverside arteries.",
  },
  {
    label: "Town Hall Drainage Surge",
    severity: "WARNING" as const,
    ward_id: "ward_02",
    text: "Heavy surface drainage overflow along Bauddhaloka Mawatha. Heavy traffic congestion; proceed with extreme caution.",
  },
  {
    label: "Peliyagoda Shelter Open",
    severity: "INFO" as const,
    ward_id: "ward_01",
    text: "Peliyagoda Community Centre shelter active with dry rations and emergency beds. Free entry for displaced basin residents.",
  },
  {
    label: "Downed Cable Hazard",
    severity: "CRITICAL" as const,
    ward_id: "ward_03",
    text: "Submerged electrical lines reported near Fort station. CEB repair unit dispatched; stay clear of standing water.",
  },
];

export function BroadcastEditorModal({
  open,
  onClose,
  onPublished,
}: {
  open: boolean;
  onClose: () => void;
  onPublished?: (alert: BroadcastAlert) => void;
}) {
  const [current, setCurrent] = useState<BroadcastAlert | null>(null);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"CRITICAL" | "WARNING" | "INFO">("WARNING");
  const [wardId, setWardId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  useEffect(() => {
    if (open) {
      void fetch("/api/broadcast")
        .then((res) => res.json())
        .then((data: BroadcastAlert) => {
          setCurrent(data);
          setMessage(data.message || "");
          setSeverity(data.severity || "WARNING");
          setWardId(data.ward_id || "");
          setIsActive(data.active);
        })
        .catch(() => {});
    }
  }, [open]);

  async function handleSave(activeState = isActive) {
    if (!message.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          active: activeState,
          message: message.trim(),
          severity,
          ward_id: wardId || null,
          author: "Council Command Desk",
        }),
      });
      if (res.ok) {
        const saved = (await res.json()) as BroadcastAlert;
        setCurrent(saved);
        setIsActive(saved.active);
        setSuccessNotice(true);
        onPublished?.(saved);
        setTimeout(() => {
          setSuccessNotice(false);
          onClose();
        }, 800);
      }
    } finally {
      setSaving(false);
    }
  }

  function applyCanned(item: (typeof CANNED_ALERTS)[number]) {
    setMessage(item.text);
    setSeverity(item.severity);
    setWardId(item.ward_id);
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex max-h-[90vh] flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-md shadow-rose-500/25">
              <Megaphone className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Officer Emergency Public Broadcast
                </h3>
                <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-rose-700">
                  Citizen Feed
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">
                Pushes an emergency alert banner across all citizen map, report, and home screens
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-5">
          {/* Quick templates */}
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">
              Quick Disaster Bulletins
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CANNED_ALERTS.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => applyCanned(c)}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-left transition hover:border-brand hover:bg-brand-light/40"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800">{c.label}</p>
                    <span className="font-mono text-[10px] font-semibold text-slate-400 uppercase">
                      {c.ward_id} · {c.severity}
                    </span>
                  </div>
                  <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                </button>
              ))}
            </div>
          </div>

          {/* Severity Picker */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Alert Severity Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSeverity("CRITICAL")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-extrabold transition-all ${
                  severity === "CRITICAL"
                    ? "border-rose-500 bg-rose-500 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5" />
                Critical Evac
              </button>

              <button
                type="button"
                onClick={() => setSeverity("WARNING")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-extrabold transition-all ${
                  severity === "WARNING"
                    ? "border-amber-500 bg-amber-500 text-slate-950 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Flood Watch
              </button>

              <button
                type="button"
                onClick={() => setSeverity("INFO")}
                className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-extrabold transition-all ${
                  severity === "INFO"
                    ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Megaphone className="h-3.5 w-3.5" />
                Civic Info
              </button>
            </div>
          </div>

          {/* Ward Target */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Target Municipal Ward
            </label>
            <select
              value={wardId}
              onChange={(e) => setWardId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 shadow-sm focus:border-brand focus:outline-hidden"
            >
              <option value="">All Colombo Basin (Metropolitan Wide)</option>
              {WARDS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.id} — {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Broadcast Message Input */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Broadcast Message Text
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type urgent public instruction or evacuation notice..."
              className="w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold text-slate-900 shadow-sm focus:border-brand focus:outline-hidden"
            />
            <p className="mt-1 text-[11px] font-medium text-slate-400">
              Broadcasts update automatically every 15 seconds on active citizen devices.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                current?.active ? "bg-emerald-500 animate-ping" : "bg-slate-300"
              }`}
            />
            <span className="text-xs font-bold text-slate-600">
              Status: {current?.active ? "Active Broadcast Running" : "Inactive"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {current?.active ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave(false)}
                className="rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Disable Broadcast
              </button>
            ) : null}

            <button
              type="button"
              disabled={saving || !message.trim()}
              onClick={() => void handleSave(true)}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
            >
              {successNotice ? (
                <>
                  <Check className="h-4 w-4 text-white" /> Published!
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Publish Broadcast
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
