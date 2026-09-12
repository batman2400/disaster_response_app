import { listHazards, listShelters } from "@/lib/db";

import { ReliefBoard } from "./ReliefBoard";

export const dynamic = "force-dynamic";

export default async function ReliefPage() {
  const [hazards, shelters] = await Promise.all([listHazards(), listShelters()]);
  return <ReliefBoard initialHazards={hazards} initialShelters={shelters} />;
}
