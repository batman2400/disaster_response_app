import { cn } from "@/lib/cn";

export function BottomSheet({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-40 flex max-h-[80vh] flex-col rounded-t-[32px] bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500",
        open ? "translate-y-0" : "translate-y-full",
        className,
      )}
    >
      <button type="button" onClick={onClose} className="flex shrink-0 cursor-pointer justify-center pb-2 pt-4">
        <span className="h-1.5 w-12 rounded-full bg-slate-200" />
      </button>
      {children}
    </div>
  );
}
