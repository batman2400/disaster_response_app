import { cn } from "@/lib/cn";

export function PublicShell({
  children,
  className,
  variant = "page",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "page" | "bleed";
}) {
  if (variant === "bleed") {
    return (
      <div className={cn("relative min-h-dvh w-full overflow-hidden bg-slate-50", className)}>
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh justify-center bg-slate-200/80 lg:bg-slate-200 lg:px-6 lg:py-8">
      <div
        className={cn(
          "relative flex min-h-dvh w-full max-w-md flex-col overflow-hidden bg-slate-50 shadow-2xl",
          "lg:min-h-[calc(100dvh-4rem)] lg:max-w-6xl lg:rounded-[32px]",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
