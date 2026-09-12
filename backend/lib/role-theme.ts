import { HardHat, HeartHandshake, Shield } from "lucide-react";

import type { DashRole } from "./dashboard-auth";

export const ROLE_THEME: Record<
  DashRole,
  {
    label: string;
    icon: typeof Shield;
    iconBg: string;
    chipBg: string;
    chipText: string;
    glow: string;
    accent: string;
  }
> = {
  officer: {
    label: "Council Officer",
    icon: Shield,
    iconBg: "bg-brand",
    chipBg: "bg-brand-light",
    chipText: "text-brand",
    glow: "shadow-glow-blue",
    accent: "border-brand",
  },
  relief: {
    label: "Relief Desk",
    icon: HeartHandshake,
    iconBg: "bg-status-emerald",
    chipBg: "bg-status-emerald-bg",
    chipText: "text-status-emerald",
    glow: "shadow-glow-emerald",
    accent: "border-status-emerald",
  },
  crew: {
    label: "Field Crew",
    icon: HardHat,
    iconBg: "bg-brand-cyan",
    chipBg: "bg-brand-cyan/10",
    chipText: "text-brand-cyan",
    glow: "shadow-glow-cyan",
    accent: "border-brand-cyan",
  },
};
