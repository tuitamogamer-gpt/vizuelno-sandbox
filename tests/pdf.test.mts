import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";
import { exampleProject, newProject } from "../src/lib/project";
import { newGeneration } from "../src/lib/generation";
import { renderIdentityPdf } from "../src/lib/pdf/document";
import { pdfVisuals, type PdfOptions } from "../src/lib/pdf/options";
import type { PdfAssets } from "../src/lib/pdf/assets";

const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1sAAAAASUVORK5CYII=";
const assets: PdfAssets = { logo: pixel, headingSample: pixel, bodySample: pixel, visuals: [] };
const options: PdfOptions = { author: "Željka Đurić Čolić Ćosić Šarić", studentNumber: "24/2026", group: "Vizuelno komuniciranje", date: "2026-11-04", includeVisuals: true, includeVariants: false, includePrompts: false };
const fonts = path.resolve("public/fonts/pdf");

async function inspect(blob: Blob) {
  const data = new Uint8Array(await blob.arrayBuffer());
  assert.equal(Buffer.from(data.slice(0, 5)).toString(), "%PDF-");
  const task = getDocument({ data, useSystemFonts: false });
  const doc = await task.promise;
  const pages: string[] = [];
  let imageCount = 0;
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    assert.equal(Math.round(viewport.width), 595);
    assert.equal(Math.round(viewport.height), 842);
    const content = await page.getTextContent();
    pages.push(content.items.flatMap(item => "str" in item ? [item.str] : []).join(" ").replace(/\s+/g, " "));
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      // Protect the printable area from cut-off text and footer collisions.
      assert.ok(item.transform[4] >= 40, `Left overflow: ${item.str}`);
      assert.ok(item.transform[4] + item.width <= 557, `Right overflow: ${item.str}`);
      assert.ok(item.transform[5] >= 22 && item.transform[5] <= 817, `Vertical overflow: ${item.str}`);
    }
    const operations = await page.getOperatorList();
    imageCount += operations.fnArray.filter(fn => fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject).length;
  }
  const metadata = await doc.getMetadata();
  const outline = await doc.getOutline();
  const destinations = await doc.getDestinations();
  await task.destroy();
  return { pages, text: pages.join("\n"), info: metadata.info as { Title: string; Author: string }, outline, destinations, imageCount };
}

test("switching PDF language from Russian to English preserves Latin glyphs in the next document", async () => {
  const project = exampleProject("ru");
  await renderIdentityPdf(project, { ...options, author: "Татьяна", locale: "ru" }, assets, fonts);
  const result = await inspect(await renderIdentityPdf(project, { ...options, locale: "en" }, assets, fonts));
  assert.ok(result.text.includes("Target audience"), "Latin T must remain visible after a Cyrillic export");
  assert.ok(result.text.includes("Typography"));
  assert.ok(result.text.replace(/\s/g, "").includes("FIRSTASSESSMENT"));
});

test("PDF embeds Unicode, A4 pages, every chapter, navigation, graphics and truthful metadata", async () => {
  const result = await inspect(await renderIdentityPdf(exampleProject(), options, assets, fonts));
  assert.equal(result.pages.length, 8);
  assert.equal(result.info.Title, "Bora — Kolokvijum 01");
  assert.equal(result.info.Author, options.author);
  assert.ok(result.text.includes(options.author));
  for (const expected of ["24/2026", "Ciljna publika", "Vizija", "Misija", "Strategija", "Ciljevi", "Space Grotesk", "DM Sans", "Memorandum", "Izvori i vlastite izmjene", "Osvrt na rad"]) {
    assert.ok(result.text.toLocaleLowerCase().includes(expected.toLocaleLowerCase()), expected);
  }
  assert.ok(result.text.replace(/\s/g, "").includes("#244D3E"));
  assert.equal(result.outline?.length, 7);
  assert.equal(result.destinations.size, 7);
  assert.ok(result.outline?.every(item => Array.isArray(item.dest) && item.dest[1].name === "Fit"));
  for (const destination of result.destinations.values()) assert.ok(Math.abs(destination[3] - 777.89) < 1);
  result.pages.forEach((page, index) => assert.ok(page.includes(`${index + 1} / 8`)));
  assert.ok(result.imageCount >= 5);
});

test("PDF flows long text and URLs over pages, preserves the end, and labels incomplete work", async () => {
  const project = newProject("Dug tekst", options.author);
  project.description = `${"Čitljivost i jasna ideja povezuju sve odluke. ".repeat(133)}KRAJ OPISA`;
  project.sources = `https://example.test/${"dokumentacija".repeat(420)} KRAJ IZVORA`;
  project.reflection = "Posljednja rečenica: č ć đ š ž / Ч Ћ Ђ Ш Ж.";
  const result = await inspect(await renderIdentityPdf(project, options, assets, fonts));
  assert.ok(result.pages.length > 8);
  assert.ok(result.text.includes("KRAJ OPISA"));
  assert.ok(result.text.includes("KRAJ IZVORA"));
  assert.ok(result.text.includes(project.reflection));
  assert.ok(result.text.includes("Nije uneseno."));
  assert.ok(result.text.includes("Ciljevi nisu uneseni."));
});

test("PDF keeps a single cover for maximum-length project and student details", async () => {
  const project = exampleProject();
  project.name = "Dugačak naziv projekta ".repeat(10).slice(0, 200);
  project.slogan = "Slogan koji povezuje jasnu ideju i dosljedan identitet. ".repeat(4).slice(0, 200);
  const details = { ...options, author: "Dugačko ime i prezime ".repeat(10).slice(0, 200), studentNumber: "2026/".repeat(8), group: "Studijski program i grupa ".repeat(4).slice(0, 80) };
  const output = await inspect(await renderIdentityPdf(project, details, assets, fonts));
  assert.equal(output.pages.length, 8);
  assert.ok(output.pages[0].includes("Broj indeksa"));
  assert.ok(output.pages[1].includes("Polazište"));
});

test("PDF includes selected visuals and optional variants/prompts, without generation capabilities", async () => {
  const project = exampleProject();
  const input = { model: "ideogram-4.5" as const, aspect: "3:4" as const, prompt: "Jedinstveni prompt za vizuelni identitet." };
  const result = { id: "visual-one", image: pixel, input, createdAt: "2026-11-04T12:00:00Z" };
  project.visuals.moodboard = { ...newGeneration(), result, alternatives: [{ ...result, id: "visual-two", input: { ...input, prompt: "Ranija varijanta za istraživanje." } }], job: { id: "job", token: "NE-IZVOZI-JOB-TOKEN", status: "completed", input } };
  assert.equal(pdfVisuals(project, { ...options, includeVisuals: false }).length, 0);
  assert.equal(pdfVisuals(project, options).length, 1);
  const withPrompts = { ...options, includeVariants: true, includePrompts: true, submission: { version: 3, createdAt: "2026-11-03T10:00:00Z" } };
  const visuals = pdfVisuals(project, withPrompts);
  assert.equal(visuals.length, 2);
  assert.ok(!JSON.stringify(visuals).includes("NE-IZVOZI"));
  const output = await inspect(await renderIdentityPdf(project, withPrompts, { ...assets, visuals: visuals.map(v => ({ ...v, width: 300, height: 400 })) }, fonts));
  assert.ok(output.text.includes("Sačuvana predaja · verzija 3"));
  assert.ok(output.text.includes("Ideogram 4.5"));
  assert.ok(output.text.includes(input.prompt));
  assert.ok(output.text.includes("Ranija varijanta za istraživanje."));
  assert.ok(!output.text.includes("NE-IZVOZI-JOB-TOKEN"));
  assert.ok(output.imageCount >= 7);
});

test("English and Russian PDFs localize every chapter and metadata while preserving student prose", async () => {
  const project = exampleProject();
  project.name = "Моя идея / My idea";
  project.description = "Оригинальный текст студента. Moja ideja ostaje ista.";
  for (const locale of ["en", "ru"] as const) {
    const result = await inspect(await renderIdentityPdf(project, { ...options, locale }, assets, fonts));
    assert.equal(result.pages.length, 8);
    assert.equal(result.info.Title, `${project.name} — ${locale === "en" ? "Assessment 01" : "Коллоквиум 01"}`);
    assert.ok(result.text.includes(project.description));
    assert.ok(result.text.includes(locale === "en" ? "Target audience" : "Целевая аудитория"));
    assert.ok(result.text.replace(/\s/g, "").includes(locale === "en" ? "DOCUMENTCONTENTS" : "СОДЕРЖАНИЕДОКУМЕНТА"));
    for (const source of ["PRVI KOLOKVIJUM", "AUTOR / AUTORKA", "SADRŽAJ DOKUMENTA", "Odabrani logotip projekta", "Kontakt podaci nisu uneseni."]) assert.ok(!result.text.includes(source), source);
    assert.ok(result.outline?.[0].title.includes(locale === "en" ? "Starting point" : "Отправная точка"));
    assert.equal(result.outline?.length, 7);
  }
});
