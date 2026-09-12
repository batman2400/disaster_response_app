"use client";

import { Box, HardHat, Users } from "lucide-react";
import { cn } from "@/lib/cn";

export type FrontlineRole = "citizen" | "crew" | "relief";

interface RoleSegmentedSwitchProps {
  activeRole: FrontlineRole;
  onChange: (role: FrontlineRole) => void;
  className?: string;
}

export function RoleSegmentedSwitch({
  activeRole,
  onChange,
  className,
}: RoleSegmentedSwitchProps) {
  const roles: { id: FrontlineRole; label: string; icon: typeof Users; tag: string }[] = [
    {
      id: "citizen",
      label: "Citizens",
      icon: Users,
      tag: "Public",
    },
    {
      id: "crew",
      label: "Field Crew",
      icon: HardHat,
      tag: "Response",
    },
    {
      id: "relief",
      label: "Relief Desk",
      icon: Box,
      tag: "Shelters",
    },
  ];

  return (
    <div
      role="tablist"
      aria-label="Frontline Operations Mode"
      className={cn(
        "relative flex w-full items-center rounded-2xl bg-slate-200/70 p-1.5 backdrop-blur-md shadow-inner",
        className
      )}
    >
      {roles.map((r) => {
        const Icon = r.icon;
        const isActive = activeRole === r.id;
        return (
          <button
            key={r.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(r.id)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold transition-all duration-200 touch-manipulation",
              isActive
                ? "bg-white text-slate-900 shadow-sm shadow-slate-300/50 scale-[1.01]"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-colors",
                isActive
                  ? r.id === "citizen"
                    ? "text-brand"
                    : r.id === "crew"
                    ? "text-cyan-600"
                    : "text-emerald-600"
                  : "text-slate-400"
              )}
            />
            <span>{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}
