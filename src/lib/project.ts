import { z } from "zod";
import { createTranslator, formatLocales, locales, type Locale } from "./i18n/core";
import { generationHistory, imageData, visualsSchema, visualTargets, targetInfo, VisualTarget } from "./generation";

const short = z.string().max(200);
const text = z.string().max(6000);
export const fonts = ["DM Sans", "Space Grotesk", "Libre Baskerville", "Georgia", "Arial", "Courier New", "Noto Sans"] as const;
export const shapes = ["spark", "circle", "arch", "diamond", "none"] as const;
export const projectSchema = z.object({
  version: z.literal(1), id: z.string().uuid(), name: short, author: short,
  kind: z.enum(["new", "redesign"]), description: text, audience: text,
  vision: text, mission: text, strategy: text, goals: z.array(short).max(5), slogan: short,
  colors: z.array(z.object({ hex: z.string().regex(/^#[a-fA-F0-9]{6}$/), name: z.string().max(60) })).min(2).max(4),
  colorReason: text, logoShape: z.enum(shapes), logoText: z.string().max(12), logoImage: imageData,
  logoReason: text, headingFont: z.enum(fonts), bodyFont: z.enum(fonts), typeReason: text,
  contact: short, address: short, website: short, applicationNote: text,
  sources: text, reflection: text, aiPrompt: text, aiDisclosure: text,
  visuals: visualsSchema.default({}),
  pdfVisualIds: z.array(z.string().min(1).max(160)).default([]),
  aiImage: imageData.default(""),
  aiJob: z.object({ id: z.string().max(100), token: z.string().max(2000), status: z.enum(["queued","running","completed","failed"]) }).nullable().default(null),
  aiRequest: z.object({ prompt: text, quoteToken: z.string().max(2000), requestId: z.string().uuid() }).nullable().default(null),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
});
export type Project = z.infer<typeof projectSchema>;
export type ProjectPatch = Partial<Project> | ((current: Project) => Partial<Project>);
export const backupSchema = z.object({ format: z.literal("forma-project"), version: z.literal(1), project: projectSchema });
export const steps = [
  { label: "Polazište", caption: "Dobra priča počinje idejom", icon: "lightbulb" },
  { label: "Strategija", caption: "Prvo smisao. Onda oblik.", icon: "compass" },
  { label: "Paleta boja", caption: "Boje koje govore tvoju priču", icon: "palette" },
  { label: "Logotip", caption: "Jedan znak. Jasna poruka.", icon: "shapes" },
  { label: "Tipografija", caption: "Daj svom identitetu glas", icon: "type" },
  { label: "Primjena", caption: "Iz studija u stvarni svijet", icon: "layout" },
  { label: "Pregled i izvoz", caption: "Poveži sve u jednu cjelinu", icon: "check" },
] as const;
export function newProject(name = "", author = "", kind: Project["kind"] = "new", locale: Locale = "sr"): Project {
  const t = createTranslator(locale);
  const now = new Date().toISOString();
  return { version: 1, id: crypto.randomUUID(), name, author, kind, description: "", audience: "", vision: "", mission: "", strategy: "", goals: ["", "", ""], slogan: "", colors: [{ hex: "#244D3E", name: t("Primarna") }, { hex: "#F2E9D8", name: t("Sekundarna") }, { hex: "#DD6846", name: t("Akcent") }], colorReason: "", logoShape: "spark", logoText: "", logoImage: "", logoReason: "", headingFont: locale === "ru" ? "Noto Sans" : "Space Grotesk", bodyFont: locale === "ru" ? "Noto Sans" : "DM Sans", typeReason: "", contact: "", address: "", website: "", applicationNote: "", sources: "", reflection: "", aiPrompt: "", aiDisclosure: "", visuals: {}, pdfVisualIds: [], aiImage: "", aiJob: null, aiRequest: null, createdAt: now, updatedAt: now };
}
export function exampleProject(locale: Locale = "sr"): Project {
  const t = createTranslator(locale);
  const project = { ...newProject("Bora", t("Primjer za vježbu"), "new", locale), description: "Mala robna marka prirodnih proizvoda za njegu, inspirisana biljkama našeg podneblja. Ovo je izmišljeni edukativni primjer, a ne studentski rad.", audience: "Ljudi koji biraju jednostavnu njegu, razumljive sastojke i odgovornu ambalažu.", vision: "Svijet u kojem briga o sebi ide ruku pod ruku s brigom o prirodi.", mission: "Pravimo male serije proizvoda za svakodnevnu njegu, koristeći lokalne biljne sastojke i povratnu ambalažu.", strategy: "Počinjemo sa tri proizvoda. Povjerenje gradimo transparentnim porijeklom sastojaka, direktnim kontaktom i jednostavnom vizuelnom komunikacijom.", goals: ["Razviti tri proizvoda u prvoj godini.", "Uspostaviti saradnju sa dva lokalna uzgajivača.", "Uvesti povratnu ambalažu za cijelu liniju."], slogan: "Priroda. Bliže tebi.", colorReason: "Tamnozelena povezuje identitet s biljnim porijeklom. Topla krem boja donosi smirenost, a terakota ističe važne informacije. Tamni tekst na svijetloj pozadini ostaje čitljiv.", logoText: "b", logoReason: "Radijalni znak asocira na listove i rast. Jednostavna forma ostaje prepoznatljiva u maloj veličini i u jednoj boji. Ovo je početni predložak za dalju autorsku doradu.", typeReason: "Space Grotesk daje naslovima savremen, jasan karakter. DM Sans je neutralan i čitljiv za duže opise proizvoda. Oba fonta podržavaju č, ć, ž, š i đ.", contact: "zdravo@bora.example", address: "Banja Luka, BiH", website: "bora.example", applicationNote: "Memorandum koristi dosta praznog prostora i malu verziju logotipa. Na društvenim mrežama primarna boja ostaje dominantna, a akcent vodi pogled na poruku.", sources: "Edukativni primjer aplikacije Forma. Geometrijski znak je početni predložak. Fontovi DM Sans i Space Grotesk: Google Fonts, SIL Open Font License.", reflection: "Isti odnos boja i fontova povezuje sve primjene. Prije konačne predaje dodatno bih testirao znak na maloj ambalaži i doradio njegov autorski karakter." };
  const fields = ["description", "audience", "vision", "mission", "strategy", "slogan", "colorReason", "logoReason", "typeReason", "applicationNote", "sources", "reflection", "address"] as const;
  for (const key of fields) project[key] = t(project[key]);
  project.goals = project.goals.map(value => t(value));
  if (locale === "ru") {
    project.typeReason = t("Noto Sans podržava ćirilicu. Različite veličine i debljine slova povezuju jasne naslove i čitljiv osnovni tekst.");
    project.sources = t("Edukativni primjer aplikacije Forma. Geometrijski znak je početni predložak. Font Noto Sans: Google Fonts, SIL Open Font License.");
  }
  return project;
}
export function checklist(p: Project) {
  return [
    { label: "Radni naziv, autor i opis ideje", done: !!(p.name.trim() && p.author.trim() && p.description.trim()), step: 0 },
    { label: "Vizija, misija i strategija", done: !!(p.vision.trim() && p.mission.trim() && p.strategy.trim()), step: 1 },
    { label: "Najmanje 3 konkretna cilja", done: p.goals.filter(g => g.trim()).length >= 3, step: 1 },
    { label: "Paleta od 2–4 boje s obrazloženjem", done: !!p.colorReason.trim(), step: 2 },
    { label: "Logotip i objašnjenje značenja", done: !!(p.logoReason.trim() && (p.logoImage || p.logoText.trim() || p.name.trim())), step: 3 },
    { label: "Tipografija i razlog izbora", done: !!p.typeReason.trim(), step: 4 },
    { label: "Memorandum i obrazloženje primjene", done: !!p.applicationNote.trim(), step: 5 },
    { label: "Izvori i osvrt na vlastiti rad", done: !!(p.sources.trim() && p.reflection.trim()), step: 6 },
  ];
}
export function progress(p: Project) { const list = checklist(p); return Math.round(list.filter(i => i.done).length / list.length * 100); }
export function relativeLuminance(hex: string) {
  const c = hex.replace("#", "").match(/.{2}/g)!.map(v => parseInt(v, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
export function contrastRatio(a: string, b: string) {
  const l1 = relativeLuminance(a), l2 = relativeLuminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
export function inkOn(bg: string) { return contrastRatio(bg, "#FFFFFF") >= contrastRatio(bg, "#17241E") ? "#FFFFFF" : "#17241E"; }
export type ContrastLevel = "AAA" | "AA" | "AA-large" | "low";
/** WCAG 2.2 thresholds: 7:1 and 4.5:1 for normal text, 3:1 for large text. */
export function contrastLevel(ratio: number): ContrastLevel { return ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA-large" : "low"; }
/** Every unordered colour pair, with the darker colour shown as text on the lighter one. */
export function contrastPairs(colors: Project["colors"]) {
  const pairs: { text: number; background: number; ratio: number }[] = [];
  for (let a = 0; a < colors.length; a++) for (let b = a + 1; b < colors.length; b++) {
    const [text, background] = relativeLuminance(colors[a].hex) <= relativeLuminance(colors[b].hex) ? [a, b] : [b, a];
    pairs.push({ text, background, ratio: contrastRatio(colors[a].hex, colors[b].hex) });
  }
  return pairs;
}
function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = hex.replace("#", "").match(/.{2}/g)!.map(v => parseInt(v, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function fromHsl(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}
/**
 * Suggests the closest shade of a text colour (same hue and saturation, different
 * lightness) that reaches the target contrast on the given background. Returns null
 * when the pair already passes. Black or white always reaches 4.5:1, so a shade exists.
 */
export function accessibleShade(text: string, background: string, target = 4.5): { hex: string; ratio: number } | null {
  if (contrastRatio(text, background) >= target) return null;
  const [h, s, l] = toHsl(text);
  let best: { hex: string; ratio: number; distance: number } | null = null;
  for (const direction of [-1, 1]) {
    for (let step = 1; ; step++) {
      const raw = l + direction * step * 0.005, hex = fromHsl(h, s, Math.min(1, Math.max(0, raw))), ratio = contrastRatio(hex, background);
      if (ratio >= target) { if (!best || step * 0.005 < best.distance) best = { hex, ratio, distance: step * 0.005 }; break; }
      if (raw <= 0 || raw >= 1) break;
    }
  }
  return best && { hex: best.hex, ratio: best.ratio };
}
export function dateLabel(date: string, locale: Locale = "sr") { return new Intl.DateTimeFormat(formatLocales[locale], { day: "numeric", month: "short" }).format(new Date(date)); }
export function creativeBrief(p: Project, style: string, locale: Locale = "sr") {
  const t = createTranslator(locale);
  return t("Kreativni brief za vizuelni identitet: {0}\n\nIdeja: {1}\nPublika: {2}\nVizija: {3}\nMisija: {4}\nSlogan: {5}\nPaleta: {6}\nVizuelni smjer: {7}\n\nPredloži jednostavan koncept znaka na čistoj pozadini, bez mockupa i dodatnog teksta. Znak treba da bude prepoznatljiv u maloj veličini i da funkcioniše u jednoj boji. Izbjegni postojeće logotipe i generičke simbole. Rezultat je skica za autorsku doradu, a ne gotov identitet.", {0: p.name || t("[naziv]"), 1: p.description || t("[opiši ideju]"), 2: p.audience || t("[definiši publiku]"), 3: p.vision || t("[napiši viziju]"), 4: p.mission || t("[napiši misiju]"), 5: p.slogan || t("[opciono]"), 6: p.colors.map(c => c.hex).join(", "), 7: style});
}

export function visualBrief(p: Project, target: VisualTarget, locale: Locale = "sr") {
  const t = createTranslator(locale);
  return t("Vizuelni identitet: {0}\nIdeja: {1}\nPublika: {2}\nVizija: {3}\nMisija: {4}\nSlogan: {5}\nPaleta: {6}\nTipografija: {7} za naslove, {8} za tekst.\nKarakter znaka: {9}\nKontakt: {10}\n\n{11}\n\nOvo je skica za autorsku doradu. Vizuelni smjer: jasan, promišljen i dosljedan.", {0: p.name || t("[naziv]"), 1: p.description.slice(0, 700) || t("[opiši ideju]"), 2: p.audience.slice(0, 400) || t("[definiši publiku]"), 3: p.vision.slice(0, 400) || t("[napiši viziju]"), 4: p.mission.slice(0, 400) || t("[napiši misiju]"), 5: p.slogan || t("bez slogana"), 6: p.colors.map(c => `${c.name} ${c.hex}`).join(", "), 7: p.headingFont, 8: p.bodyFont, 9: p.logoReason.slice(0, 500) || t("jednostavan i prepoznatljiv"), 10: [p.contact, p.address, p.website].filter(Boolean).join(" · ") || t("bez kontakta"), 11: t(targetInfo[target].instruction)}).slice(0, 6000);
}

/** Bundled web fonts without Cyrillic glyphs; the browser would substitute another font. */
export const fontsWithoutCyrillic: readonly Project["headingFont"][] = ["DM Sans", "Space Grotesk", "Libre Baskerville"];
/** Approximate sentence count: a new sentence starts after .!?… and a capital letter, so "npr. sapun" stays one sentence. */
export function sentenceCount(text: string) {
  return text.trim().split(/[.!?…]+["“”»’)]*\s+(?=["„“«(]?[A-ZČĆĐŠŽА-ЯЁ])/).filter(part => /[A-Za-zČĆĐŠŽčćđšžА-яЁё]/.test(part)).length;
}
export type ReviewHint = { id: string; text: string; step: number };
/** Gentle checks before submission. They never block export, change the checklist or grade the work. */
export function reviewHints(p: Project, locale: Locale = "sr"): ReviewHint[] {
  const t = createTranslator(locale), hints: ReviewHint[] = [];
  const vision = sentenceCount(p.vision), mission = sentenceCount(p.mission);
  if (vision > 2) hints.push({ id: "vision", step: 1, text: t("Broj rečenica u viziji: {0}. Smjernica s nastave je jedna do dvije rečenice.", { 0: vision }) });
  if (mission > 2) hints.push({ id: "mission", step: 1, text: t("Broj rečenica u misiji: {0}. Smjernica s nastave je jedna do dvije rečenice.", { 0: mission }) });
  if (!contrastPairs(p.colors).some(pair => pair.ratio >= 4.5)) hints.push({ id: "contrast", step: 2, text: t("Nijedan par boja nema kontrast od najmanje 4,5:1 za manji tekst. Provjeri parove u koraku Paleta boja.") });
  const shown = [p.name, p.logoText, p.slogan, p.description, p.audience, p.vision, p.mission, p.strategy, ...p.goals, p.applicationNote, p.contact, p.address].join(" ");
  if (/[Ѐ-ӿ]/.test(shown)) for (const font of new Set([p.headingFont, p.bodyFont])) if (fontsWithoutCyrillic.includes(font)) hints.push({ id: `cyrillic-${font}`, step: 4, text: t("Tekst projekta sadrži ćirilicu, a font {0} nema ćirilična slova. Izaberi Noto Sans ili drugi font s ćirilicom.", { 0: font }) });
  if (!(p.contact.trim() || p.address.trim() || p.website.trim())) hints.push({ id: "contact", step: 5, text: t("Memorandum nema kontakt podataka. Za vježbu možeš unijeti izmišljen kontakt, adresu ili web stranicu.") });
  const aiVisuals = !!p.aiImage || visualTargets.some(target => generationHistory(p.visuals[target]).length > 0);
  if (aiVisuals && !p.aiDisclosure.trim()) hints.push({ id: "ai-empty", step: 6, text: t("Projekat sadrži AI vizuale, a opis upotrebe AI alata je prazan. Navedi alat, svrhu i svoje dorade.") });
  // Generated visuals add a disclosure line with this placeholder, in the language used at the time.
  if (locales.some(language => p.aiDisclosure.includes(createTranslator(language)("[opiši izmjene]")))) hints.push({ id: "ai-placeholder", step: 6, text: t("Opis upotrebe AI alata još sadrži mjesto za tvoje dorade u uglastim zagradama. Opiši šta si sam/a promijenio/la.") });
  return hints;
}
