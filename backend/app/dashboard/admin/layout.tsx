import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireDashboardRole } from "@/lib/require-role";

export const metadata: Metadata = {
  title: "Admin · Fender",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireDashboardRole("officer");
  return children;
}
