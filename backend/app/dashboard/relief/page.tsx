import { listHazards, listShelters, listWards } from "@/lib/db";

import { ReliefBoard } from "./ReliefBoard";

export const dynamic = "force-dynamic";

export default async function ReliefPage() {
  const [hazards, shelters, wards] = await Promise.all([listHazards(), listShelters(), listWards()]);
  return <ReliefBoard initialHazards={hazards} initialShelters={shelters} initialWards={wards} />;
}

