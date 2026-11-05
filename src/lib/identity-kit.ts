import { createTranslator, htmlLanguages, browserLocale, type Locale } from "./i18n/core";
import { strToU8, zip } from "fflate";
import { Project, projectSchema } from "./project";
import { models, targetInfo, visualTargets } from "./generation";
import { escapeHtml, landingHtml, logoSvg } from "./export";
import { downloadBlob, projectBackup, slug } from "./storage";

function imageFile(data: string) {
  const [type, base64] = data.split(",");
  const extension = type.includes("image/png") ? "png" : type.includes("image/jpeg") ? "jpg" : "webp";
  return { extension, bytes: Uint8Array.from(atob(base64), char => char.charCodeAt(0)) };
}
export function identityBookHtml(project: Project, locale: Locale = "sr") {
  const t = createTranslator(locale), h = (value: string) => escapeHtml(t(value));
  const p = projectSchema.parse(project), e = escapeHtml;
  const paragraph = (value: string) => `<p>${e(value || t("Nije uneseno."))}</p>`;
  const visual = (key: typeof visualTargets[number]) => {
    const result = p.visuals[key]?.result;
    return result ? `<figure><img src="${result.image}" alt="${h(targetInfo[key].label)}"><figcaption>${h(targetInfo[key].label)} · ${models[result.input.model].label} · ${h("AI skica")}</figcaption></figure>` : "";
  };
  return `<!doctype html><html lang="${htmlLanguages[locale]}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(p.name)} — ${h("knjiga identiteta")}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f5f4ef;color:#24382e;font:15px/1.8 '${p.bodyFont}',Arial,sans-serif}main{max-width:960px;margin:auto;padding:60px 40px}header{border-bottom:1px solid #cbd5c4;padding-bottom:35px;margin-bottom:45px}header>small{letter-spacing:.15em;text-transform:uppercase}h1,h2,h3{font-family:'${p.headingFont}',Arial,sans-serif;line-height:1.25}h1{font-size:clamp(42px,7vw,72px);letter-spacing:-.05em;margin:20px 0}h2{font-size:28px;border-top:1px solid #cbd5c4;padding-top:25px;margin-top:45px}h3{font-size:18px}p{white-space:pre-line;overflow-wrap:anywhere}svg{max-width:100%;height:auto}.logo{background:${p.colors[1].hex};padding:25px;border-radius:8px}.colors{display:flex;flex-wrap:wrap;gap:18px;margin:25px 0}.color{flex:1;min-width:120px}.color i{display:block;height:100px;border:1px solid #0002;border-radius:5px}.color strong,.color span{display:block}.columns{display:grid;grid-template-columns:1fr 1fr;gap:30px}.specimen{font-size:35px}.letter{background:white;border:1px solid #d9e0d1;padding:35px;margin:25px 0;min-height:430px;display:flex;flex-direction:column}.letter svg{max-width:220px}.letter footer{border-top:2px solid ${p.colors[0].hex};padding-top:15px;margin-top:auto;font-size:12px}figure{margin:30px 0;break-inside:avoid}figure img{max-width:100%;max-height:520px;object-fit:contain}figcaption{font-size:12px;color:#53654c}main>footer{border-top:1px solid #cbd5c4;margin-top:50px;padding-top:20px;font-size:12px;color:#53654c}@media(max-width:600px){main{padding:30px 20px}.columns{grid-template-columns:1fr}.letter{padding:22px}}@media print{@page{size:A4;margin:17mm}body{background:#fff;font-size:10pt;print-color-adjust:exact;-webkit-print-color-adjust:exact}main{padding:0;max-width:none}h2{break-after:avoid;font-size:18pt}header{break-inside:avoid}figure img{max-height:110mm}.letter,.colors{break-inside:avoid}}
  </style></head><body><main><header><small>${h("Vizuelno komuniciranje · Knjiga identiteta")}</small><h1>${e(p.name)}</h1><p>${e(p.slogan)}</p><p>${h("Autor/ka:")} ${e(p.author)}</p></header><div class="logo">${logoSvg(p, locale)}</div>
  <section><h2>${h("01 / Polazište")}</h2>${paragraph(p.description)}<h3>${h("Ciljna publika")}</h3>${paragraph(p.audience)}${visual("moodboard")}</section>
  <section><h2>${h("02 / Strategija")}</h2><div class="columns"><div><h3>${h("Vizija")}</h3>${paragraph(p.vision)}</div><div><h3>${h("Misija")}</h3>${paragraph(p.mission)}</div></div><h3>${h("Strategija")}</h3>${paragraph(p.strategy)}<h3>${h("Ciljevi")}</h3><ol>${p.goals.filter(Boolean).map(goal => `<li>${e(goal)}</li>`).join("")}</ol></section>
  <section><h2>${h("03 / Paleta boja")}</h2><div class="colors">${p.colors.map(color => `<div class="color"><i style="background:${color.hex}"></i><strong>${e(color.name)}</strong><span>${color.hex}</span></div>`).join("")}</div>${paragraph(p.colorReason)}${visual("palette")}</section>
  <section><h2>${h("04 / Logotip")}</h2><div class="logo">${logoSvg(p, locale)}</div>${paragraph(p.logoReason)}${p.visuals.logo?.result?.image !== p.logoImage ? visual("logo") : ""}</section>
  <section><h2>${h("05 / Tipografija")}</h2><div class="columns"><div><h3>${e(p.headingFont)} · ${h("naslovi")}</h3><p class="specimen" style="font-family:'${p.headingFont}',Arial,sans-serif">${h("Aa Bb Čć Đđ Šš Žž")}</p></div><div><h3>${e(p.bodyFont)} · ${h("tekst")}</h3>${paragraph(p.description)}</div></div>${paragraph(p.typeReason)}${visual("typography")}</section>
  <section><h2>${h("06 / Primjena")}</h2><div class="letter">${logoSvg(p, locale)}<h3>${h("Poštovani,")}</h3>${paragraph(p.mission)}<p>${h("Srdačno,")}<br>${e(p.name)}</p><footer>${[p.contact,p.address,p.website].map(e).filter(Boolean).join(" · ")}</footer></div>${paragraph(p.applicationNote)}${visual("letterhead")}${visual("social")}</section>
  <section><h2>${h("07 / Proces i izvori")}</h2><h3>${h("Izvori i vlastite izmjene")}</h3>${paragraph(p.sources)}<h3>${h("Upotreba AI alata")}</h3>${paragraph(p.aiDisclosure)}<h3>${h("Osvrt na rad")}</h3>${paragraph(p.reflection)}</section><footer>${e(p.author)} · ${e(p.name)} · ${h("Razvijeno u studiju Forma. Za PDF otvori štampu u pregledniku. Odabrani fontovi prikazuju se ako su instalirani na uređaju.")}</footer></main></body></html>`;
}
export function identityKitFiles(project: Project, locale: Locale = "sr"): Record<string, Uint8Array> {
  const t = createTranslator(locale);
  const p = projectSchema.parse(project), root = slug(p.name).slice(0, 60);
  const files: Record<string, Uint8Array> = {};
  const text = (path: string, value: string) => { files[`${root}/${path}`] = strToU8(value); };
  text("projekat.forma.json", projectBackup(p));
  text("knjiga-identiteta.html", identityBookHtml(p, locale));
  text("web-stranica.html", landingHtml(p, locale));
  text("logotip.svg", logoSvg(p, locale));
  text("paleta.svg", `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="240" viewBox="0 0 800 240">${p.colors.map((color,i) => `<rect x="${i*800/p.colors.length}" width="${800/p.colors.length}" height="160" fill="${color.hex}"/><text x="${i*800/p.colors.length+16}" y="192" font-family="Arial" font-size="17" fill="#24382e">${escapeHtml(color.name)}</text><text x="${i*800/p.colors.length+16}" y="222" font-family="Arial" font-size="15" fill="#24382e">${color.hex}</text>`).join("")}</svg>`);
  text("dizajn-tokeni.json", JSON.stringify({ name:p.name,colors:p.colors,typography:{heading:p.headingFont,body:p.bodyFont} },null,2));
  if(p.logoImage){const image=imageFile(p.logoImage);files[`${root}/logotip.${image.extension}`]=image.bytes;}
  for(const target of visualTargets){const state=p.visuals[target];if(!state)continue;const variants=[state.result,...state.alternatives].filter(item=>item!==null);for(const [index,result] of variants.entries()){const image=imageFile(result.image);files[`${root}/vizuali/${target}-${index+1}.${image.extension}`]=image.bytes;text(`vizuali/${target}-${index+1}-brief.txt`,`${t(targetInfo[target].label)}\n${index===0?t("Odabrana varijanta"):t("Prethodna varijanta")}\n${t("Model:")} ${models[result.input.model].label}\n${t("Format:")} ${result.input.aspect}\n${t("Datum:")} ${result.createdAt}\n\n${result.input.prompt}`);}}
  text("PROCITAJ-ME.txt", t("{0} — komplet vizuelnog identiteta\nAutor/ka: {1}\n\n• projekat.forma.json: uvezi u Formu za nastavak uređivanja.\n• knjiga-identiteta.html: pregled cjelokupnog rada; otvori u pregledniku i sačuvaj kao PDF.\n• logotip.svg: znak ili SVG s ugrađenom rasterskom slikom. AI slika se ovim ne pretvara u vektore.\n• paleta.svg i dizajn-tokeni.json: tačne boje i nazivi fontova.\n• vizuali/: odabrani i prethodni vizuali, s opisima korištenim za generisanje.\n• web-stranica.html: osnova za drugi kolokvijum.\n\nU HTML dokumentima odabrani fontovi prikazuju se ako su instalirani. Font datoteke nisu dio paketa. Za PDF s ugrađenim fontovima koristi izvoz dokumenta direktno iz aplikacije.\n\nPredaj rad kroz kanal dogovoren na nastavi. Provjeri obrazloženja, izvore i autorske izmjene prije predaje.\n", {0: p.name, 1: p.author}));
  return files;
}
export async function exportIdentityKit(project: Project, locale: Locale = browserLocale()) {
  const files=identityKitFiles(project, locale);
  const bytes=await new Promise<Uint8Array>((resolve,reject)=>zip(files,{level:0},(error,data)=>error?reject(error):resolve(data)));
  downloadBlob(new Uint8Array(bytes).buffer,`${slug(project.name).slice(0,60)}-identitet.zip`,"application/zip");
}
