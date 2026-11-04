import { createHash } from "node:crypto";
import { z } from "zod";
export const PIKA_API = "https://api.dev.pika.art";
export const PIKA_MODEL = "google/gemini-3.1-flash-image/text-to-image";
export const PIKA_LABEL = "Nano Banana 2 · 1K · 1:1";
export const promptSchema = z.string().trim().min(20).max(6000);
export function imageInput(prompt: string) { return { prompt, num_images: 1, aspect_ratio: "1:1", output_format: "png", resolution: "1K", thinking_level: "minimal" }; }
export function promptHash(prompt: string) { return createHash("sha256").update(prompt).digest("hex"); }
export function configured() { return Boolean(process.env.PIKA_API_KEY?.trim()); }
export class PikaError extends Error {
  constructor(message: string, public status = 502) { super(message); }
}
export function providerMessage(code?: string) {
  const messages: Record<string,string> = {
    content_moderation: "Servis nije prihvatio ovaj opis. Preformuliši brief i pokušaj ponovo.",
    insufficient_balance: "Pika kredit nije dovoljan. Nastavnik treba dopuniti račun.",
    membership_required: "Potrebno je aktivno Pika API Club članstvo.",
    cycle_limit_exceeded: "Dostignuto je ograničenje potrošnje na Pika računu.",
    rate_limited: "Servis je trenutno zauzet. Sačekaj prije novog pokušaja.",
    invalid_input: "Servis nije prihvatio postavke. Obrati se nastavniku.",
  };
  return messages[code || ""] || "Generisanje nije završeno. Tvoj projekat je sačuvan; pokušaj ponovo kasnije.";
}
export async function pikaRequest(path: string, options?: { method?: string; body?: unknown; idempotencyKey?: string }) {
  if (!configured()) throw new PikaError("Nastavnik još nije povezao Pika API ključ.", 503);
  let response: Response;
  try { response = await fetch(`${PIKA_API}${path}`, { method: options?.method || "GET", headers: { "X-API-Key": process.env.PIKA_API_KEY!, "Content-Type": "application/json", ...(options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}) }, body: options?.body ? JSON.stringify(options.body) : undefined, cache: "no-store", signal: AbortSignal.timeout(20000), redirect: "error" }); }
  catch { throw new PikaError("Pika servis trenutno ne odgovara. Sačekaj i provjeri status prije novog generisanja.", 504); }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // A known rejected submit still has a terminal job. Return it so the client
    // can safely clear its uncertain-submit state and show the provider error.
    if (options?.idempotencyKey && data?.id && data?.status === "failed") return data;
    if (response.status === 401 || response.status === 403 && !data?.error?.code) throw new PikaError("Pika ključ nije aktivan ili nema odgovarajući pristup. Obrati se nastavniku.", 503);
    throw new PikaError(providerMessage(data?.error?.code), response.status === 429 ? 429 : 502);
  }
  return data;
}
const quoteSchema = z.object({ micro_usd: z.number().int().nonnegative(), sell_usd: z.string() });
const balanceSchema = z.object({ balance_micro_usd: z.number(), postpaid: z.object({ active: z.boolean(), cycle: z.object({ remaining_micro_usd: z.number() }).nullable().optional() }).nullable().optional() });
export async function quoteImage(prompt: string) {
  const [quoteRaw, balanceRaw] = await Promise.all([pikaRequest(`/catalog/apis/${PIKA_MODEL}/quote`, { method: "POST", body: imageInput(prompt) }), pikaRequest("/billing/balance")]);
  const quote = quoteSchema.parse(quoteRaw), balance = balanceSchema.parse(balanceRaw);
  const ceiling = Number(process.env.PIKA_MAX_IMAGE_USD || "0.25");
  if (!Number.isFinite(ceiling) || ceiling <= 0 || quote.micro_usd > ceiling * 1_000_000) throw new PikaError("Cijena prelazi dozvoljeni iznos za jednu sliku. Obrati se nastavniku.", 422);
  const remaining = balance.postpaid?.active ? balance.postpaid.cycle?.remaining_micro_usd : balance.balance_micro_usd;
  if (typeof remaining !== "number" || remaining < quote.micro_usd) throw new PikaError(providerMessage("insufficient_balance"), 422);
  return quote;
}
export const jobSchema = z.object({
  id: z.string().regex(/^media_[a-zA-Z0-9-]+$/), status: z.enum(["queued", "running", "completed", "failed"]),
  output: z.object({ images: z.array(z.object({ url: z.string().url() })).optional() }).nullable().optional(),
  error: z.object({ code: z.string().optional() }).nullable().optional(),
  billing: z.object({ state: z.string(), charge_micro_usd: z.number().optional() }).nullable().optional(),
});
export function safeMediaUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || !["cdn.pika.art", "api.dev.pika.art"].includes(url.hostname)) throw new PikaError("Servis je vratio nepodržanu adresu slike.");
  if (url.hostname === "api.dev.pika.art" && !url.pathname.startsWith("/v1/files/")) throw new PikaError("Nepodržana adresa slike.");
  return url;
}
export async function downloadResult(value: string) {
  let url = safeMediaUrl(value);
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { headers: url.hostname === "api.dev.pika.art" ? { "X-API-Key": process.env.PIKA_API_KEY! } : {}, cache: "no-store", signal: AbortSignal.timeout(20000), redirect: "manual" });
    if (response.status >= 300 && response.status < 400) { url = safeMediaUrl(new URL(response.headers.get("location") || "", url).href); continue; }
    const type = response.headers.get("content-type")?.split(";")[0];
    if (!response.ok || !type || !["image/png","image/jpeg","image/webp"].includes(type)) throw new PikaError("Slika trenutno nije dostupna za preuzimanje.");
    const reader = response.body?.getReader(); if (!reader) throw new PikaError("Prazan rezultat servisa.");
    let size = 0; const chunks: Uint8Array[] = [];
    while (true) { const chunk = await reader.read(); if (chunk.done) break; size += chunk.value.byteLength; if (size > 8_000_000) { await reader.cancel(); throw new PikaError("Slika prelazi dozvoljenih 8 MB."); } chunks.push(chunk.value); }
    const buffer = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { buffer.set(chunk,offset); offset += chunk.length; }
    return { buffer, type };
  }
  throw new PikaError("Previše preusmjerenja pri preuzimanju slike.");
}
