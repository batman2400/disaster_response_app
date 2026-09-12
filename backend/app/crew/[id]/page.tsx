import { notFound } from "next/navigation";

import { requireDashboardRole } from "@/lib/require-role";
import { findHazard } from "@/lib/db";

import { ResolveTask } from "./ResolveTask";

export const dynamic = "force-dynamic";

export default async function CrewResolvePage({ params }: { params: Promise<{ id: string }> }) {
  await requireDashboardRole("crew");
  const { id } = await params;
  const hazard = await findHazard(id);
  if (!hazard) notFound();
  return <ResolveTask hazard={hazard} />;
}
