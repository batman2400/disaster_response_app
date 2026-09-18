"use client";

import { CheckCircle2, Package, Truck } from "lucide-react";

import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { timeAgo, wardShort } from "@/lib/format";
import type { SupplyRequest } from "@/lib/types";

export function SupplyRequestInbox({
  requests,
  busyId,
  error,
  onAcknowledge,
  onDispatch,
}: {
  requests: SupplyRequest[];
  busyId: string;
  error?: string;
  onAcknowledge: (id: string) => void;
  onDispatch: (id: string) => void;
}) {
  const active = requests.filter((row) => row.status !== "DISPATCHED");
  if (active.length === 0) return null;

  return (
    <div className="shrink-0 border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50/80 to-rose-50/70 px-4 py-3 sm:px-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-900">Relief resupply inbox</p>
            <p className="text-[11px] font-medium text-slate-500">
              Item requests from shelter desks land here for Command to acknowledge or dispatch.
            </p>
          </div>
        </div>
        <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
          {active.length} open
        </Badge>
      </div>

      {error ? (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-bold text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {active.map((row) => (
          <div
            key={row.id}
            className={cn(
              "min-w-[280px] max-w-sm shrink-0 rounded-2xl border bg-white p-3 shadow-xs",
              row.urgency === "CRITICAL" ? "border-rose-200" : "border-amber-200",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-extrabold text-slate-900">{row.shelter_name}</p>
                <p className="text-[11px] font-semibold text-slate-500">
                  {wardShort(row.ward_id)} · {timeAgo(row.created_at)}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide",
                  row.status === "ACKNOWLEDGED"
                    ? "bg-sky-50 text-sky-800 border border-sky-200"
                    : row.urgency === "CRITICAL"
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200",
                )}
              >
                {row.status === "ACKNOWLEDGED" ? "Acknowledged" : row.urgency}
              </span>
            </div>
            <p className="mt-2 text-[11px] font-bold leading-snug text-slate-700">
              {row.items.join(" · ")}
            </p>
            <div className="mt-3 flex items-center gap-2">
              {row.status === "OPEN" ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-lg px-2.5 py-1 text-[10px] font-extrabold"
                  disabled={busyId === row.id}
                  onClick={() => onAcknowledge(row.id)}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{busyId === row.id ? "Saving…" : "Acknowledge"}</span>
                </Button>
              ) : null}
              <Button
                type="button"
                className="rounded-lg px-2.5 py-1 text-[10px] font-extrabold"
                disabled={busyId === row.id}
                onClick={() => onDispatch(row.id)}
              >
                <Truck className="h-3 w-3" />
                <span>{busyId === row.id ? "Saving…" : "Dispatch truck"}</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
