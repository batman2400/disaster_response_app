import { json, options } from "@/lib/cors";
import { listHazards } from "@/lib/db";

export function OPTIONS() {
  return options();
}

export async function GET() {
  return json(await listHazards());
}
