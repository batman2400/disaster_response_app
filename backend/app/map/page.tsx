import { listHazards, listWards } from "@/lib/db";

import { PublicMap } from "./PublicMap";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [hazards, wards] = await Promise.all([listHazards(), listWards()]);
  return <PublicMap initialHazards={hazards} initialWards={wards} />;
}
