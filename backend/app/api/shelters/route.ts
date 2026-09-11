import { json, options } from "@/lib/cors";
import { listShelters } from "@/lib/db";

export function OPTIONS() {
  return options();
}

export async function GET() {
  return json(await listShelters());
}
