import type { ReactNode } from "react";

import { DashboardChrome } from "@/components/dashboard-chrome";
import { requireDashboardRole } from "@/lib/require-role";

export default async function ReliefLayout({ children }: { children: ReactNode }) {
  await requireDashboardRole("relief");
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-800">
      <DashboardChrome role="relief" />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
