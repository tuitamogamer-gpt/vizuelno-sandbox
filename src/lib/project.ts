import { z } from "zod";
import { imageData, visualsSchema, targetInfo, VisualTarget } from "./generation";

const short = z.string().max(200);
const text = z.string().max(6000);
export const fonts = ["DM Sans", "Space Grotesk", "Libre Baskerville", "Georgia", "Arial", "Courier New"] as const;
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
export function newProject(name = "", author = "", kind: Project["kind"] = "new"): Project {
  const now = new Date().toISOString();
  return { version: 1, id: crypto.randomUUID(), name, author, kind, description: "", audience: "", vision: "", mission: "", strategy: "", goals: ["", "", ""], slogan: "", colors: [{ hex: "#244D3E", name: "Primarna" }, { hex: "#F2E9D8", name: "Sekundarna" }, { hex: "#DD6846", name: "Akcent" }], colorReason: "", logoShape: "spark", logoText: "", logoImage: "", logoReason: "", headingFont: "Space Grotesk", bodyFont: "DM Sans", typeReason: "", contact: "", address: "", website: "", applicationNote: "", sources: "", reflection: "", aiPrompt: "", aiDisclosure: "", visuals: {}, aiImage: "", aiJob: null, aiRequest: null, createdAt: now, updatedAt: now };
}
export function exampleProject(): Project {
  return { ...newProject("Bora", "Primjer za vježbu"), description: "Mala robna marka prirodnih proizvoda za njegu, inspirisana biljkama našeg podneblja. Ovo je izmišljeni edukativni primjer, a ne studentski rad.", audience: "Ljudi koji biraju jednostavnu njegu, razumljive sastojke i odgovornu ambalažu.", vision: "Svijet u kojem briga o sebi ide ruku pod ruku s brigom o prirodi.", mission: "Pravimo male serije proizvoda za svakodnevnu njegu, koristeći lokalne biljne sastojke i povratnu ambalažu.", strategy: "Počinjemo sa tri proizvoda. Povjerenje gradimo transparentnim porijeklom sastojaka, direktnim kontaktom i jednostavnom vizuelnom komunikacijom.", goals: ["Razviti tri proizvoda u prvoj godini.", "Uspostaviti saradnju sa dva lokalna uzgajivača.", "Uvesti povratnu ambalažu za cijelu liniju."], slogan: "Priroda. Bliže tebi.", colorReason: "Tamnozelena povezuje identitet s biljnim porijeklom. Topla krem boja donosi smirenost, a terakota ističe važne informacije. Tamni tekst na svijetloj pozadini ostaje čitljiv.", logoText: "b", logoReason: "Radijalni znak asocira na listove i rast. Jednostavna forma ostaje prepoznatljiva u maloj veličini i u jednoj boji. Ovo je početni predložak za dalju autorsku doradu.", typeReason: "Space Grotesk daje naslovima savremen, jasan karakter. DM Sans je neutralan i čitljiv za duže opise proizvoda. Oba fonta podržavaju č, ć, ž, š i đ.", contact: "zdravo@bora.example", address: "Banja Luka, BiH", website: "bora.example", applicationNote: "Memorandum koristi dosta praznog prostora i malu verziju logotipa. Na društvenim mrežama primarna boja ostaje dominantna, a akcent vodi pogled na poruku.", sources: "Edukativni primjer aplikacije Forma. Geometrijski znak je početni predložak. Fontovi DM Sans i Space Grotesk: Google Fonts, SIL Open Font License.", reflection: "Isti odnos boja i fontova povezuje sve primjene. Prije konačne predaje dodatno bih testirao znak na maloj ambalaži i doradio njegov autorski karakter." };
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
export function dateLabel(date: string) { return new Intl.DateTimeFormat("sr-Latn", { day: "numeric", month: "short" }).format(new Date(date)); }
export function creativeBrief(p: Project, style: string) {
  return `Kreativni brief za vizuelni identitet: ${p.name || "[naziv]"}\n\nIdeja: ${p.description || "[opiši ideju]"}\nPublika: ${p.audience || "[definiši publiku]"}\nVizija: ${p.vision || "[napiši viziju]"}\nMisija: ${p.mission || "[napiši misiju]"}\nSlogan: ${p.slogan || "[opciono]"}\nPaleta: ${p.colors.map(c => c.hex).join(", ")}\nVizuelni smjer: ${style}\n\nPredloži jednostavan koncept znaka na čistoj pozadini, bez mockupa i dodatnog teksta. Znak treba da bude prepoznatljiv u maloj veličini i da funkcioniše u jednoj boji. Izbjegni postojeće logotipe i generičke simbole. Rezultat je skica za autorsku doradu, a ne gotov identitet.`;
}

export function visualBrief(p: Project, target: VisualTarget) {
  return `Vizuelni identitet: ${p.name || "[naziv]"}
Ideja: ${p.description.slice(0, 700) || "[opiši ideju]"}
Publika: ${p.audience.slice(0, 400) || "[definiši publiku]"}
Vizija: ${p.vision.slice(0, 400) || "[napiši viziju]"}
Misija: ${p.mission.slice(0, 400) || "[napiši misiju]"}
Slogan: ${p.slogan || "bez slogana"}
Paleta: ${p.colors.map(c => `${c.name} ${c.hex}`).join(", ")}
Tipografija: ${p.headingFont} za naslove, ${p.bodyFont} za tekst.
Karakter znaka: ${p.logoReason.slice(0, 500) || "jednostavan i prepoznatljiv"}
Kontakt: ${[p.contact, p.address, p.website].filter(Boolean).join(" · ") || "bez kontakta"}

${targetInfo[target].instruction}

Ovo je skica za autorsku doradu. Vizuelni smjer: jasan, promišljen i dosljedan.`.slice(0, 6000);
}
