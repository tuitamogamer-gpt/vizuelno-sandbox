import { NextResponse } from "next/server";
import { aiUser, aiError } from "@/lib/ai-route";
import { configured, pikaRequest, PikaError } from "@/lib/pika";
import { allowAttempt } from "@/lib/rate-limit";
export async function POST(request: Request) {
  try {
    const user = await aiUser(request);
    if (!allowAttempt(`connection:${user}`, 10)) throw new PikaError("Sačekaj prije nove provjere veze.", 429);
    if (!configured()) throw new PikaError("PIKA_API_KEY još nije dodat u ovom deploymentu. Dodaj ključ i uradi redeploy.", 503);
    await pikaRequest("/billing/balance");
    return NextResponse.json({ connected: true, message: "Pika prihvata ključ. Veza je spremna; cijena i dostupni kredit provjeravaju se prije svake slike." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return aiError(error); }
}
