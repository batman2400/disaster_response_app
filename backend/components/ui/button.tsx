import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const variants = {
  primary:
    "bg-brand text-white shadow-glow hover:bg-brand-indigo disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none",
  gradient:
    "bg-gradient-to-r from-brand to-brand-indigo text-white shadow-glow disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none",
  success:
    "bg-gradient-to-r from-emerald-500 to-emerald-400 text-white shadow-glow-emerald disabled:bg-slate-200 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none",
  ghost:
    "bg-white text-slate-700 border border-slate-200 hover:border-brand hover:text-brand",
  danger:
    "bg-white text-slate-600 border-2 border-slate-200 hover:border-status-crimson hover:bg-status-crimson-bg hover:text-status-crimson",
  amber:
    "bg-white text-slate-600 border-2 border-slate-200 hover:border-status-amber hover:bg-status-amber-bg hover:text-status-amber",
} as const;

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[20px] px-4 py-3 text-sm font-extrabold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
