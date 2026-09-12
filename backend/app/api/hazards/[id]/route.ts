import { json, options } from "@/lib/cors";
import { findHazard } from "@/lib/db";

export function OPTIONS() {
  return options();
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hazard = await findHazard(id);
  if (!hazard) return json({ error: "Incident not found" }, 404);
  return json(hazard);
}
