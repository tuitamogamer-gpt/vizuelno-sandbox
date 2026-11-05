import { z } from "zod";

export const modelIds = ["gpt-image-2.5", "nano-banana-2.1", "seedream-5-pro", "ideogram-4.5"] as const;
export type ModelId = typeof modelIds[number];
export const models: Record<ModelId, { label: string; detail: string; api: string; note: string }> = {
  "gpt-image-2.5": { label: "GPT Image 2.5", detail: "OpenAI · Sunburst", api: "openai/gpt-image-2.5-sunburst/text-to-image", note: "Razradi kompoziciju i detaljan vizuelni brief." },
  "nano-banana-2.1": { label: "Nano Banana 2.1", detail: "Google", api: "google/gemini-nano-banana-2.1/text-to-image", note: "Istraži stilove, materijale i svjetlo." },
  "seedream-5-pro": { label: "Seedream 5 Pro", detail: "ByteDance · 5.0 Pro", api: "bytedance/seedream-5.0-pro/text-to-image", note: "Eksperimentiši s vizuelnim smjerom i primjenama." },
  "ideogram-4.5": { label: "Ideogram 4.5", detail: "Ideogram", api: "ideogram/ideogram-4.5/text-to-image", note: "Istraži natpise i tipografske kompozicije." },
};
export const aspects = ["1:1", "3:4", "4:3", "16:9", "9:16"] as const;
export type Aspect = typeof aspects[number];
export const inputSchema = z.object({ model: z.enum(modelIds), aspect: z.enum(aspects), prompt: z.string().trim().min(20).max(6000) });
export type GenerationInput = z.infer<typeof inputSchema>;
export const imageData = z.string().max(3_000_000).refine(v => v === "" || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v), "Podržane su PNG, JPG i WebP slike.");
export const resultSchema = z.object({
  id: z.string().min(1).max(100), image: imageData.refine(value => value.length > 0, "Vizual nema sliku."), input: inputSchema, createdAt: z.string().datetime(), charge: z.number().nonnegative().optional(),
});
export type GenerationResult = z.infer<typeof resultSchema>;
export const requestSchema = inputSchema.extend({ quoteToken: z.string().max(2000), requestId: z.string().uuid() });
export type GenerationRequest = z.infer<typeof requestSchema>;
export const generationSchema = z.object({
  model: z.enum(modelIds).default("nano-banana-2.1"), aspect: z.enum(aspects).default("1:1"), prompt: z.string().max(6000).default(""),
  result: resultSchema.nullable().default(null),
  alternatives: z.array(resultSchema).default([]),
  job: z.object({ id: z.string().max(100), token: z.string().max(2000), status: z.enum(["queued", "running", "completed", "failed"]), input: inputSchema }).nullable().default(null),
  request: requestSchema.nullable().default(null),
});
export type Generation = z.infer<typeof generationSchema>;
export function newGeneration(prompt = "", aspect: Aspect = "1:1"): Generation { return { model: "nano-banana-2.1", aspect, prompt, result: null, alternatives: [], job: null, request: null }; }
export function inputKey(input: GenerationInput) { return JSON.stringify([input.model, input.aspect, input.prompt.trim()]); }
export function isPending(state: Generation) { return !!state.request || !!state.job && state.job.status !== "failed" && state.result?.id !== state.job.id; }
export const visualTargets = ["moodboard", "palette", "logo", "typography", "letterhead", "social"] as const;
export type VisualTarget = typeof visualTargets[number];
export const visualsSchema = z.partialRecord(z.enum(visualTargets), generationSchema);
export const targetInfo: Record<VisualTarget, { label: string; title: string; aspect: Aspect; instruction: string }> = {
  moodboard: { label: "Vizuelni smjer", title: "Istraži atmosferu svoje ideje", aspect: "4:3", instruction: "Napravi moodboard: povezanu kompoziciju materijala, oblika, tekstura i fotografskih detalja koji predstavljaju karakter ove ideje. Bez logotipa i suvišnih natpisa." },
  palette: { label: "Paleta boja", title: "Pogledaj kako tvoje boje žive zajedno", aspect: "4:3", instruction: "Napravi vizuelnu studiju zadate palete: velike plohe boja, teksture i jednostavne geometrijske kompozicije. Poštuj HEX vrijednosti kao smjernice. Bez dodatnih natpisa. Prikaži odnos primarne, sekundarne i akcentne boje." },
  logo: { label: "Logotip", title: "Generiši znak iz svoje ideje", aspect: "1:1", instruction: "Predloži jednostavan originalan znak i naziv robne marke na čistoj svijetloj pozadini, bez mockupa i dodatnog teksta. Znak treba da bude prepoznatljiv u maloj veličini i da funkcioniše u jednoj boji. Izbjegni postojeće logotipe i generičke simbole." },
  typography: { label: "Tipografija", title: "Istraži karakter slova", aspect: "3:4", instruction: "Napravi tipografski plakat s nazivom i sloganom iz briefa. Prikaži jasnu hijerarhiju naslova i teksta, skladne razmake i slova č, ć, đ, š, ž. Navedeni fontovi su vizuelna smjernica; ovo je skica rasporeda za kasniju preciznu obradu." },
  letterhead: { label: "Memorandum", title: "Generiši primjenu na memorandumu", aspect: "3:4", instruction: "Napravi ravni prikaz dizajna poslovnog memoranduma: naziv u zaglavlju, mali znak, prostrana površina za sadržaj, tanka razdjelna linija i zadati kontakt u podnožju. Koristi paletu i karakter tipografije iz briefa. Bez perspektive i fotografskog mockupa. Ne izmišljaj kontakt podatke." },
  social: { label: "Društvena objava", title: "Pretvori identitet u objavu", aspect: "1:1", instruction: "Napravi dizajn društvene objave s nazivom robne marke i zadatim sloganom. Koristi zadatu paletu, izražajnu kompoziciju i jasnu hijerarhiju. Bez izmišljenih ponuda i kontakt podataka. Ostavi dovoljno praznog prostora." },
};
export function withoutCapabilities<T extends Generation>(state: T): T { return { ...state, job: null, request: null }; }
export function cleanVisuals(visuals: z.infer<typeof visualsSchema>) { return Object.fromEntries(Object.entries(visuals).map(([key, value]) => [key, withoutCapabilities(value)])); }
export const playgroundSchema = z.object({ generation: generationSchema, history: z.array(resultSchema), starred: z.array(z.string().max(100)).default([]) });
export const playgroundBackupSchema = playgroundSchema.extend({ format: z.literal("forma-playground"), version: z.literal(1) });
export type PlaygroundData = z.infer<typeof playgroundSchema>;

/** The active result and every earlier result remain in the project. */
export function amendGeneration(current: Generation, patch: Partial<Generation>, retainAlternatives = true): Generation {
  let alternatives = patch.alternatives ?? current.alternatives;
  if (retainAlternatives && patch.result && current.result && patch.result.id !== current.result.id) {
    alternatives = [current.result, ...alternatives].filter((item, index, all) => item.id !== patch.result!.id && all.findIndex(other => other.id === item.id) === index);
  }
  return { ...current, ...patch, alternatives: retainAlternatives ? alternatives : [] };
}
/** Importing or generating never silently evicts an older experiment. */
export function mergeExperiments(current: GenerationResult[], incoming: GenerationResult[]) {
  const seen = new Set<string>();
  return [...incoming, ...current].filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id); return true;
  });
}
export function generationHistory(value: Generation | undefined): GenerationResult[] {
  if (!value) return [];
  return mergeExperiments(value.alternatives, value.result ? [value.result] : [])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
}
export function visualKey(target: VisualTarget, id: string) { return `${target}-${id}`; }
export function cleanPlayground(data: PlaygroundData) { return { ...data, generation: withoutCapabilities(data.generation) }; }
