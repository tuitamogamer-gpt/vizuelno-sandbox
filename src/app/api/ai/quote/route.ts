import { NextResponse } from "next/server";
import { aiUser, aiError, readBody } from "@/lib/ai-route";
import { signTicket } from "@/lib/auth";
import { PikaError, generationHash, quoteImage } from "@/lib/pika";
import { inputSchema, models } from "@/lib/generation";
import { allowAttempt } from "@/lib/rate-limit";
export const maxDuration = 30;
export async function POST(request: Request) {
  try {
    const user = await aiUser(request);
    if (!allowAttempt(`quote:${user}`, 30)) throw new PikaError("Sačekaj prije nove provjere cijene.", 429);
    const input = inputSchema.parse(await readBody(request));
    const quote = await quoteImage(input);
    const requestId = crypto.randomUUID();
    const token = await signTicket(user, "quote", { hash: generationHash(input), amount: quote.micro_usd, requestId });
    return NextResponse.json({ token, requestId, price: quote.micro_usd / 1_000_000, model: models[input.model].label, expiresAt: Date.now() + 9 * 60_000 }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return aiError(error); }
}
