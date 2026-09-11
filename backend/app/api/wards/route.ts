import { json, options } from "@/lib/cors";
import { listWards } from "@/lib/db";

export function OPTIONS() {
  return options();
}

export async function GET() {
  return json(await listWards());
}
