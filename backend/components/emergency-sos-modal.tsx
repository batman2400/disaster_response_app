"use client";

import { Ambulance, Flame, PhoneCall, ShieldAlert, X, Zap } from "lucide-react";
import { Modal } from "./ui/modal";

const HOTLINES = [
  {
    number: "117",
    name: "Disaster Management Centre (DMC)",
    desc: "National flood rescue, stranded evacuation & disaster relief.",
    icon: ShieldAlert,
    badge: "bg-rose-50 text-rose-600 border-rose-200",
    callBtn: "bg-rose-600 hover:bg-rose-700 text-white",
  },
  {
    number: "1990",
    name: "Suwa Seriya Ambulance",
    desc: "Free 24/7 national pre-hospital medical emergency service.",
    icon: Ambulance,
    badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
    callBtn: "bg-emerald-600 hover:bg-emerald-700 text-white",
  },
  {
    number: "119",
    name: "Sri Lanka Police Emergency",
    desc: "Urgent law enforcement, public safety & perimeter roadblocks.",
    icon: PhoneCall,
    badge: "bg-blue-50 text-blue-600 border-blue-200",
    callBtn: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  {
    number: "110",
    name: "Fire & Rescue Operations",
    desc: "Colombo Municipal Council Fire Brigade watercraft rescue.",
    icon: Flame,
    badge: "bg-amber-50 text-amber-600 border-amber-200",
    callBtn: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  {
    number: "0112670002",
    display: "011-2670002",
    name: "Colombo Municipal Council (CMC)",
    desc: "Town Hall flood relief bay & municipal drainage emergency desk.",
    icon: PhoneCall,
    badge: "bg-indigo-50 text-indigo-600 border-indigo-200",
    callBtn: "bg-indigo-600 hover:bg-indigo-700 text-white",
  },
  {
    number: "1989",
    name: "CEB Downed Power Lines",
    desc: "Electrical hazard shutoff for submerged transformers & lines.",
    icon: Zap,
    badge: "bg-amber-50 text-amber-600 border-amber-200",
    callBtn: "bg-slate-800 hover:bg-slate-900 text-white",
  },
];

export function EmergencySosModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex max-h-[85vh] flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/30">
              <ShieldAlert className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Colombo Emergency Hotlines</h3>
              <p className="text-xs font-semibold text-slate-500">24/7 Verified Emergency Response Services</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-3">
          <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3.5 text-xs font-semibold leading-relaxed text-rose-800">
            If you or family members are trapped in rising waters, call <strong>117 (DMC)</strong> or <strong>1990 (Suwa Seriya)</strong> immediately. Keep phone lines free for rescue dispatchers.
          </div>

          {HOTLINES.map((hotline) => {
            const Icon = hotline.icon;
            return (
              <div
                key={hotline.number}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-soft transition-all hover:border-slate-200"
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${hotline.badge}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-slate-900">
                        {hotline.display ?? hotline.number}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-800">{hotline.name}</h4>
                    <p className="mt-0.5 text-[11px] font-medium leading-tight text-slate-400">{hotline.desc}</p>
                  </div>
                </div>

                <a
                  href={`tel:${hotline.number}`}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold shadow-sm transition-transform active:scale-95 ${hotline.callBtn}`}
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Call
                </a>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Sri Lanka Disaster Management Act No. 13 of 2005
          </p>
        </div>
      </div>
    </Modal>
  );
}
