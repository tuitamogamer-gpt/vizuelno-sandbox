import { NextResponse } from "next/server";
import { z } from "zod";
import { aiUser, aiError, readBody } from "@/lib/ai-route";
import { readTicket } from "@/lib/auth";
import { PikaError, jobSchema, pikaRequest, providerMessage } from "@/lib/pika";
export async function POST(request: Request) {
  try {
    const user = await aiUser(request);
    const body = z.object({ token: z.string().max(2000) }).parse(await readBody(request));
    const ticket = await readTicket(body.token,user,"job");
    if (typeof ticket.jobId !== "string" || !/^media_[a-zA-Z0-9-]+$/.test(ticket.jobId)) throw new PikaError("Neispravan identifikator.",400);
    const job = jobSchema.parse(await pikaRequest(`/v1/media/jobs/${ticket.jobId}`));
    return NextResponse.json({ id: job.id, status: job.status, error: job.status === "failed" ? providerMessage(job.error?.code) : undefined, charge: job.billing?.state === "settled" ? (job.billing.charge_micro_usd ?? 0) / 1_000_000 : undefined }, { headers: { "Cache-Control": "no-store" } });
  } catch(error) { return aiError(error); }
}
