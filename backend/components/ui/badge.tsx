import { cn } from "@/lib/cn";
import type { HazardStatus, Urgency, WardStatus } from "@/lib/types";

const statusClass: Record<HazardStatus, string> = {
  PENDING: "bg-slate-100 text-slate-500",
  PUBLISHED: "bg-brand-light text-brand",
  NEED_INFO: "bg-status-amber-bg text-status-amber",
  AREA_ALERT: "bg-status-crimson-bg text-status-crimson",
  COUNCIL_TICKET: "bg-indigo-50 text-brand-indigo",
  RESOLVED: "bg-status-emerald-bg text-status-emerald",
};

const urgencyClass: Record<Urgency, string> = {
  LOW: "bg-status-emerald-bg text-status-emerald",
  MEDIUM: "bg-status-amber-bg text-status-amber",
  CRITICAL: "bg-status-crimson-bg text-status-crimson",
};

const wardClass: Record<WardStatus, string> = {
  NORMAL: "bg-status-emerald-bg text-status-emerald",
  WATCH: "bg-status-amber-bg text-status-amber",
  CRITICAL: "bg-status-crimson-bg text-status-crimson",
};

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: HazardStatus }) {
  return <Badge className={statusClass[status]}>{status.replaceAll("_", " ")}</Badge>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const label = urgency === "CRITICAL" ? "High Risk" : urgency === "MEDIUM" ? "Med Risk" : "Low Risk";
  return <Badge className={urgencyClass[urgency]}>{label}</Badge>;
}

export function WardBadge({ status }: { status: WardStatus }) {
  return <Badge className={wardClass[status]}>{status}</Badge>;
}
