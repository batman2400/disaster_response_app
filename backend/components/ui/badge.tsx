"use client";

import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/language-context";
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
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: HazardStatus }) {
  const { t } = useI18n();

  const labelMap: Record<HazardStatus, string> = {
    PENDING: t("status_pending"),
    PUBLISHED: t("status_published"),
    NEED_INFO: t("status_need_info"),
    AREA_ALERT: t("status_area_alert"),
    COUNCIL_TICKET: t("status_council_ticket"),
    RESOLVED: t("status_resolved"),
  };

  return <Badge className={statusClass[status]}>{labelMap[status] || status.replaceAll("_", " ")}</Badge>;
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const { t } = useI18n();

  const labelMap: Record<Urgency, string> = {
    CRITICAL: t("urgency_critical"),
    MEDIUM: t("urgency_medium"),
    LOW: t("urgency_low"),
  };

  return <Badge className={urgencyClass[urgency]}>{labelMap[urgency] || urgency}</Badge>;
}

export function WardBadge({ status }: { status: WardStatus }) {
  const { lang } = useI18n();

  const labels: Record<string, Record<WardStatus, string>> = {
    en: { NORMAL: "NORMAL", WATCH: "WATCH", CRITICAL: "CRITICAL" },
    si: { NORMAL: "සාමාන්‍ය", WATCH: "අවධානයෙන්", CRITICAL: "අතිශය හදිසි" },
    ta: { NORMAL: "சாதாரண", WATCH: "கண்காணிப்பு", CRITICAL: "அவசரமானது" },
  };

  const label = labels[lang]?.[status] || status;
  return <Badge className={wardClass[status]}>{label}</Badge>;
}
