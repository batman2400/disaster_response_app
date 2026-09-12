import { cn } from "@/lib/cn";

export function Modal({
  open,
  children,
  className,
}: {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm lg:items-center lg:justify-center lg:p-8">
      <div
        className={cn(
          "flex h-[88%] w-full flex-col rounded-t-[40px] bg-white shadow-2xl animate-slide-up",
          "lg:h-auto lg:max-h-[min(88vh,840px)] lg:max-w-xl lg:rounded-[32px]",
          className,
        )}
      >
        <div className="flex justify-center pb-2 pt-4 lg:pt-5">
          <div className="h-1.5 w-12 rounded-full bg-slate-200 lg:hidden" />
        </div>
        {children}
      </div>
    </div>
  );
}
