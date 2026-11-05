import { z } from "zod";
import { createTranslator, formatLocales, type Locale } from "./i18n/core";
import { imageData, visualsSchema, targetInfo, VisualTarget } from "./generation";

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
  return { version: 1, id: crypto.randomUUID(), name, author, kind, description: "", audience: "", vision: "", mission: "", strategy: "", goals: ["", "", ""], slogan: "", colors: [{ hex: "#244D3E", name: t("Primarna") }, { hex: "#F2E9D8", name: t("Sekundarna") }, { hex: "#DD6846", name: t("Akcent") }], colorReason: "", logoShape: "spark", logoText: "", logoImage: "", logoReason: "", headingFont: locale === "ru" ? "Noto Sans" : "Space Grotesk", bodyFont: locale === "ru" ? "Noto Sans" : "DM Sans", typeReason: "", contact: "", address: "", website: "", applicationNote: "", sources: "", reflection: "", aiPrompt: "", aiDisclosure: "", visuals: {}, aiImage: "", aiJob: null, aiRequest: null, createdAt: now, updatedAt: now };
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
export function contrastRatio(a: string, b: string) {
  function luminance(hex: string) {
    const c = hex.replace("#", "").match(/.{2}/g)!.map(v => parseInt(v, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  }
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}
export function inkOn(bg: string) { return contrastRatio(bg, "#FFFFFF") >= contrastRatio(bg, "#17241E") ? "#FFFFFF" : "#17241E"; }
export function dateLabel(date: string, locale: Locale = "sr") { return new Intl.DateTimeFormat(formatLocales[locale], { day: "numeric", month: "short" }).format(new Date(date)); }
export function creativeBrief(p: Project, style: string, locale: Locale = "sr") {
  const t = createTranslator(locale);
  return t("Kreativni brief za vizuelni identitet: {0}\n\nIdeja: {1}\nPublika: {2}\nVizija: {3}\nMisija: {4}\nSlogan: {5}\nPaleta: {6}\nVizuelni smjer: {7}\n\nPredloži jednostavan koncept znaka na čistoj pozadini, bez mockupa i dodatnog teksta. Znak treba da bude prepoznatljiv u maloj veličini i da funkcioniše u jednoj boji. Izbjegni postojeće logotipe i generičke simbole. Rezultat je skica za autorsku doradu, a ne gotov identitet.", {0: p.name || t("[naziv]"), 1: p.description || t("[opiši ideju]"), 2: p.audience || t("[definiši publiku]"), 3: p.vision || t("[napiši viziju]"), 4: p.mission || t("[napiši misiju]"), 5: p.slogan || t("[opciono]"), 6: p.colors.map(c => c.hex).join(", "), 7: style});
}

export function visualBrief(p: Project, target: VisualTarget, locale: Locale = "sr") {
  const t = createTranslator(locale);
  return t("Vizuelni identitet: {0}\nIdeja: {1}\nPublika: {2}\nVizija: {3}\nMisija: {4}\nSlogan: {5}\nPaleta: {6}\nTipografija: {7} za naslove, {8} za tekst.\nKarakter znaka: {9}\nKontakt: {10}\n\n{11}\n\nOvo je skica za autorsku doradu. Vizuelni smjer: jasan, promišljen i dosljedan.", {0: p.name || t("[naziv]"), 1: p.description.slice(0, 700) || t("[opiši ideju]"), 2: p.audience.slice(0, 400) || t("[definiši publiku]"), 3: p.vision.slice(0, 400) || t("[napiši viziju]"), 4: p.mission.slice(0, 400) || t("[napiši misiju]"), 5: p.slogan || t("bez slogana"), 6: p.colors.map(c => `${c.name} ${c.hex}`).join(", "), 7: p.headingFont, 8: p.bodyFont, 9: p.logoReason.slice(0, 500) || t("jednostavan i prepoznatljiv"), 10: [p.contact, p.address, p.website].filter(Boolean).join(" · ") || t("bez kontakta"), 11: t(targetInfo[target].instruction)}).slice(0, 6000);
}
