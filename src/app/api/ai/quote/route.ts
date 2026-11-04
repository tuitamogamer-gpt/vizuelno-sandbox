import { NextResponse } from "next/server";
import { aiUser, aiError, readBody } from "@/lib/ai-route";
import { signTicket } from "@/lib/auth";
import { PIKA_LABEL, PikaError, promptHash, promptSchema, quoteImage } from "@/lib/pika";
import { allowAttempt } from "@/lib/rate-limit";
export const maxDuration = 30;
export async function POST(request: Request) {
  try {
    const user = await aiUser(request);
    if (!allowAttempt(`quote:${user}`, 30)) throw new PikaError("Sačekaj prije nove provjere cijene.", 429);
    const prompt = promptSchema.parse((await readBody(request)).prompt);
    const quote = await quoteImage(prompt);
    const token = await signTicket(user, "quote", { hash: promptHash(prompt), amount: quote.micro_usd });
    return NextResponse.json({ token, price: quote.micro_usd / 1_000_000, model: PIKA_LABEL }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return aiError(error); }
}
