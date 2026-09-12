import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-3xl border border-slate-100 bg-white shadow-soft", className)}>
      {children}
    </div>
  );
}

export function SectionLabel({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">{children}</h2>
      {hint}
    </div>
  );
}
