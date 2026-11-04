import { NextResponse } from "next/server";
import { authenticated } from "@/lib/auth";
import { configured, PIKA_LABEL } from "@/lib/pika";
export async function GET() {
  if (!(await authenticated())) return NextResponse.json({ error: "Potreban je pristupni kod." }, { status: 401 });
  return NextResponse.json({ available: configured(), model: PIKA_LABEL }, { headers: { "Cache-Control": "no-store" } });
}
