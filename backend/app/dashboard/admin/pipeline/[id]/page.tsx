import { notFound } from "next/navigation";

import { findHazard, listHazards } from "@/lib/db";

import { PipelineAudit } from "../PipelineAudit";

export const dynamic = "force-dynamic";

export default async function PipelineAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [hazard, siblings] = await Promise.all([findHazard(id), listHazards()]);
  if (!hazard) notFound();
  return <PipelineAudit hazard={hazard} siblings={siblings} />;
}
