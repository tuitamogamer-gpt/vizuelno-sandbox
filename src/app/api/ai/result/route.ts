import { NextResponse } from "next/server";
import { z } from "zod";
import { aiUser, aiError, readBody } from "@/lib/ai-route";
import { readTicket } from "@/lib/auth";
import { PikaError, downloadResult, jobSchema, pikaRequest } from "@/lib/pika";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const user = await aiUser(request);
    const body = z.object({ token: z.string().max(2000) }).parse(await readBody(request));
    const ticket = await readTicket(body.token,user,"job");
    if (typeof ticket.jobId !== "string" || !/^media_[a-zA-Z0-9-]+$/.test(ticket.jobId)) throw new PikaError("Neispravan identifikator.",400);
    const job = jobSchema.parse(await pikaRequest(`/v1/media/jobs/${ticket.jobId}`));
    if (job.status !== "completed" || !job.output?.images?.[0]?.url) throw new PikaError("Slika još nije spremna.",409);
    const image = await downloadResult(job.output.images[0].url);
    return new NextResponse(image.buffer, { headers: { "Content-Type": image.type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch(error) { return aiError(error); }
}
