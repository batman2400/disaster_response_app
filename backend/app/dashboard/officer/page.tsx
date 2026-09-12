import { listHazards, listWards } from "@/lib/db";

import { OfficerBoard } from "./OfficerBoard";

export const dynamic = "force-dynamic";

export default async function OfficerPage() {
  const [hazards, wards] = await Promise.all([listHazards(), listWards()]);
  return <OfficerBoard initialHazards={hazards} initialWards={wards} />;
}
