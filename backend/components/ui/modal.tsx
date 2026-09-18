"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

export function Modal({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Handle ESC key to dismiss
  useEffect(() => {
    if (!open || !onClose) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex flex-col justify-end sm:justify-center items-center bg-slate-950/75 backdrop-blur-sm p-0 sm:p-4 md:p-6 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div
        className={cn(
          "relative flex min-h-0 w-full flex-col overflow-y-auto overflow-x-hidden bg-white shadow-2xl",
          // Mobile: bottom sheet with max height and rounded top
          "max-h-[92dvh] h-auto rounded-t-[32px] animate-slide-up",
          // Tablet / Laptop / Desktop: centered modal card with max height and width
          "sm:max-h-[88vh] sm:max-w-xl sm:rounded-[28px] sm:my-auto sm:animate-in sm:zoom-in-95 sm:fade-in",
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

