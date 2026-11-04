import { NextResponse } from "next/server";
import { sameOrigin, sessionIdentity } from "./auth";
import { PikaError } from "./pika";
export async function aiUser(request: Request) {
  if (!sameOrigin(request)) throw new PikaError("Nedozvoljen zahtjev.", 403);
  const user = await sessionIdentity();
  if (!user) throw new PikaError("Prijava je istekla. Ponovo unesi pristupni kod.", 401);
  return user;
}
export async function readBody(request: Request) {
  const body = await request.text();
  if (body.length > 12000) throw new PikaError("Zahtjev je prevelik.", 413);
  try { return JSON.parse(body); } catch { throw new PikaError("Neispravan zahtjev.", 400); }
}
export function aiError(error: unknown) { return NextResponse.json({ error: error instanceof PikaError ? error.message : "Zahtjev nije moguće obraditi. Provjeri unos ili pokušaj ponovo." }, { status: error instanceof PikaError ? error.status : 400, headers: { "Cache-Control": "no-store" } }); }
