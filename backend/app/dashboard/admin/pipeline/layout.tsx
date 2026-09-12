import type { ReactNode } from "react";

export default function PipelineLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-[#0f172a] text-slate-200">{children}</div>;
}
