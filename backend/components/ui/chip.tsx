import { cn } from "@/lib/cn";

export function Chip({
  active,
  children,
  className,
  onClick,
  title,
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "whitespace-nowrap rounded-lg px-3 py-1 text-xs font-bold transition-colors",
        active ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
        className,
      )}
    >
      {children}
    </button>
  );
}
