import { NextResponse } from "next/server";
import { loadBroadcastAlert, saveBroadcastAlert, type BroadcastAlert } from "@/lib/db";

export async function GET() {
  const alert = await loadBroadcastAlert();
  return NextResponse.json(alert);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<BroadcastAlert>;
    const current = await loadBroadcastAlert();

    const updated: BroadcastAlert = {
      active: typeof body.active === "boolean" ? body.active : current.active,
      message: typeof body.message === "string" ? body.message.trim() : current.message,
      severity: body.severity && ["CRITICAL", "WARNING", "INFO"].includes(body.severity)
        ? body.severity
        : current.severity,
      ward_id: body.ward_id !== undefined ? body.ward_id : current.ward_id,
      author: body.author || "Duty Officer",
      updated_at: new Date().toISOString(),
    };

    const saved = await saveBroadcastAlert(updated);
    return NextResponse.json(saved);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
