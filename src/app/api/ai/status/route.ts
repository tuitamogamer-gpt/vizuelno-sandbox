import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { enrolledAccount } from "@/lib/accounts";
import { configured } from "@/lib/pika";
import { modelIds, models } from "@/lib/generation";
export async function GET() {
  if (!(await authenticated()) && !(await enrolledAccount())) return NextResponse.json({ error: "Potreban je pristupni kod." }, { status: 401 });
  return NextResponse.json({ available: configured(), models: modelIds.map(id => ({ id, label: models[id].label })) }, { headers: { "Cache-Control": "no-store" } });
}
