import { NextResponse } from "next/server";
import { sameOrigin, SESSION_COOKIE, sessionOptions } from "@/lib/auth";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Nedozvoljen zahtjev." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionOptions, maxAge: 0 });
  return response;
}
