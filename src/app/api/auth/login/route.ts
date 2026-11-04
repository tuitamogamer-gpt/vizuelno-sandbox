import { NextResponse } from "next/server";
import { accessConfigured, createSession, sameOrigin, SESSION_COOKIE, sessionOptions, verifyCode } from "@/lib/auth";
import { allowAttempt } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Zahtjev nije dozvoljen." }, { status: 403 });
  if (!accessConfigured()) return NextResponse.json({ error: "Pristup još nije podešen. Obratite se nastavniku." }, { status: 503 });
  const ip = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!allowAttempt(ip)) return NextResponse.json({ error: "Previše pokušaja. Pokušaj ponovo za 15 minuta." }, { status: 429, headers: { "Retry-After": "900" } });
  try {
    const body = await request.text();
    if (body.length > 1024) return NextResponse.json({ error: "Neispravan zahtjev." }, { status: 400 });
    const { code } = JSON.parse(body);
    if (typeof code !== "string" || code.length > 128 || !verifyCode(code)) return NextResponse.json({ error: "Kod nije ispravan. Provjeri unos i pokušaj ponovo." }, { status: 401 });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, await createSession(), sessionOptions);
    return response;
  } catch { return NextResponse.json({ error: "Nije moguće prijaviti se. Pokušaj ponovo." }, { status: 400 }); }
}
