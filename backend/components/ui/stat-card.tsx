import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "slate" | "amber" | "crimson" | "emerald" | "brand";
}) {
  const tones = {
    slate: "text-slate-900",
    amber: "text-status-amber",
    crimson: "text-status-crimson",
    emerald: "text-status-emerald",
    brand: "text-brand",
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-soft">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn("mt-1 text-2xl font-extrabold", tones[tone])}>{value}</p>
    </div>
  );
}
