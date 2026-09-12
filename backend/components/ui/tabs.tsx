import { cn } from "@/lib/cn";

export function Tabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
            value === option.id ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
