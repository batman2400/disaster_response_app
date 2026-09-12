import { requireDashboardRole } from "@/lib/require-role";
import { listHazards } from "@/lib/db";

import { CrewQueue } from "./CrewQueue";

export const dynamic = "force-dynamic";

export default async function CrewPage() {
  await requireDashboardRole("crew");
  const hazards = await listHazards();
  return <CrewQueue initialHazards={hazards} />;
}
