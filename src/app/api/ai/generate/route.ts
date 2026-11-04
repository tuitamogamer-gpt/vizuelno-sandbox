import { NextResponse } from "next/server";
import { z } from "zod";
import { aiUser, aiError, readBody } from "@/lib/ai-route";
import { readTicket, signTicket } from "@/lib/auth";
import { PIKA_MODEL, PikaError, imageInput, jobSchema, pikaRequest, promptHash, promptSchema, providerMessage, quoteImage } from "@/lib/pika";
import { allowAttempt } from "@/lib/rate-limit";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const user = await aiUser(request);
    const body = z.object({ prompt: promptSchema, quoteToken: z.string().max(2000), requestId: z.string().uuid() }).parse(await readBody(request));
    const quote = await readTicket(body.quoteToken,user,"quote");
    if (quote.hash !== promptHash(body.prompt)) throw new PikaError("Brief je promijenjen. Ponovo provjeri cijenu.", 409);
    if (!allowAttempt(`generate:${user}`, 10)) throw new PikaError("Dostignut je limit pokušaja. Sačekaj 15 minuta.", 429);
    const current = await quoteImage(body.prompt);
    if (typeof quote.amount !== "number" || current.micro_usd > quote.amount) throw new PikaError("Cijena se promijenila. Ponovo provjeri cijenu prije generisanja.", 409);
    const job = jobSchema.parse(await pikaRequest(`/v1/media/${PIKA_MODEL}`, { method: "POST", body: imageInput(body.prompt), idempotencyKey: promptHash(`${user}:${body.requestId}`) }));
    const token = await signTicket(user, "job", { jobId: job.id }, "7d");
    return NextResponse.json({ id: job.id, status: job.status, token, error: job.status === "failed" ? providerMessage(job.error?.code) : undefined }, { headers: { "Cache-Control": "no-store" } });
  } catch(error) { return aiError(error); }
}
