import { cn } from "@/lib/cn";

export function PublicShell({
  children,
  className,
  variant = "page",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "page" | "bleed" | "wide";
}) {
  if (variant === "bleed") {
    return (
      <div className={cn("relative min-h-dvh w-full overflow-hidden bg-slate-50", className)}>
        {children}
      </div>
    );
  }

  const maxWidth = variant === "wide" ? "max-w-7xl" : "max-w-6xl";

  return (
    <div className="relative min-h-dvh w-full flex flex-col bg-slate-50 text-slate-900">
      <div className={cn("relative mx-auto flex w-full flex-1 flex-col", maxWidth, className)}>
        {children}
      </div>
    </div>
  );
}
