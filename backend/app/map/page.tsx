import { listHazards, listShelters, listWards } from "@/lib/db";

import { PublicMap } from "./PublicMap";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [hazards, wards, shelters] = await Promise.all([
    listHazards(),
    listWards(),
    listShelters(),
  ]);
  return <PublicMap initialHazards={hazards} initialWards={wards} initialShelters={shelters} />;
}
