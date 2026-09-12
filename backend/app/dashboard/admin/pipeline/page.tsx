import { listHazards } from "@/lib/db";

import { PipelineList } from "./PipelineList";

export const dynamic = "force-dynamic";

export default async function PipelineIndexPage() {
  const hazards = await listHazards();
  return <PipelineList hazards={hazards} />;
}
