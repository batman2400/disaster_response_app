import { crewPassword } from "@/lib/app-auth";
import { json, options } from "@/lib/cors";
import { passwordsMatch } from "@/lib/dashboard-auth";

export function OPTIONS() {
  return options();
}

export async function POST(request: Request) {
  let body: { role?: string; password?: string };
  try {
    body = (await request.json()) as { role?: string; password?: string };
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (body.role !== "FIELD_CREW" && body.role !== "crew") {
    return json({ error: "Choose Field Crew" }, 400);
  }

  if (!passwordsMatch(body.password, crewPassword())) {
    return json({ error: "Invalid crew password" }, 401);
  }

  return json({ ok: true, role: "FIELD_CREW" });
}
