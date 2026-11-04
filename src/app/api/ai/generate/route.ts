import { NextResponse } from "next/server";
import { aiUser, aiError, readBody } from "@/lib/ai-route";
import { readTicket, signTicket } from "@/lib/auth";
import { PikaError, imageInput, jobSchema, pikaRequest, generationHash, promptHash, providerMessage, quoteImage } from "@/lib/pika";
import { models, requestSchema } from "@/lib/generation";
import { allowAttempt } from "@/lib/rate-limit";
export const maxDuration = 60;
export async function POST(request: Request) {
  let submissionStarted = false;
  try {
    const user = await aiUser(request);
    const body = requestSchema.parse(await readBody(request));
    const quote = await readTicket(body.quoteToken, user, "quote");
    if (quote.hash !== generationHash(body) || quote.requestId !== body.requestId) throw new PikaError("Model, format ili brief je promijenjen. Ponovo provjeri cijenu.", 409);
    if (!allowAttempt(`generate:${user}`, 10)) throw new PikaError("Dostignut je limit pokušaja. Sačekaj 15 minuta.", 429);
    const current = await quoteImage(body);
    if (typeof quote.amount !== "number" || current.micro_usd > quote.amount) throw new PikaError("Cijena se promijenila. Ponovo provjeri cijenu prije generisanja.", 409);
    submissionStarted = true;
    const job = jobSchema.parse(await pikaRequest(`/v1/media/${models[body.model].api}`, { method: "POST", body: imageInput(body), idempotencyKey: promptHash(`${user}:${body.requestId}`) }));
    const token = await signTicket(user, "job", { jobId: job.id }, "7d");
    return NextResponse.json({ id: job.id, status: job.status, token, error: job.status === "failed" ? providerMessage(job.error?.code) : undefined }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = aiError(error);
    return NextResponse.json({ ...await response.json(), uncertain: submissionStarted }, { status: response.status, headers: { "Cache-Control": "no-store" } });
  }
}
