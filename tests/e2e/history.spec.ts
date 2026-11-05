import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { exampleProject } from "../../src/lib/project";
import { amendGeneration, newGeneration, type GenerationResult } from "../../src/lib/generation";
import { createTranslator } from "../../src/lib/i18n/core";

async function inspectPdf(file: string) {
  const { getDocument, OPS } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: new Uint8Array(await readFile(file)), useSystemFonts: false });
  const pdf = await task.promise;
  let text = "", images = 0;
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n), content = await page.getTextContent();
    text += content.items.flatMap(item => "str" in item ? [item.str] : []).join(" ");
    images += (await page.getOperatorList()).fnArray.filter(fn => fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject).length;
  }
  await task.destroy();
  return { text, images };
}

for (const locale of ["sr", "en", "ru"] as const) {
  test(`${locale}: history, persistent PDF selection and exported images agree`, async ({ page, context }) => {
    test.setTimeout(100_000);
    const t = createTranslator(locale), errors: string[] = [], paid: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await context.setExtraHTTPHeaders({ "x-vercel-forwarded-for": `203.0.113.${["sr", "en", "ru"].indexOf(locale) + 10}` });
    await page.route("**/api/ai/status", route => route.fulfill({ json: { available: false } }));
    await page.route("**/api/ai/{quote,generate}", route => { paid.push(route.request().url()); return route.abort(); });
    await page.goto("/pristup");
    await page.locator(".language-selector select").selectOption(locale);
    await page.getByLabel(t("Pristupni kod"), { exact: true }).fill(process.env.ACCESS_CODE!);
    await page.getByRole("button", { name: t("Uđi u studio"), exact: true }).click();
    await expect(page).toHaveURL(/\/studio$/);
    const images = await page.evaluate(() => ["#cf5a35", "#274f40", "#654389", "#b29727", "#3457a9"].map(colour => {
      const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 64;
      const ctx = canvas.getContext("2d")!; ctx.fillStyle = colour; ctx.fillRect(0, 0, 64, 64);
      return canvas.toDataURL("image/webp");
    }));
    const project = exampleProject(locale);
    let generation = newGeneration();
    for (let n = 1; n <= 5; n++) {
      const result: GenerationResult = { id: `history-${n}`, image: images[n - 1], createdAt: `2026-11-0${n}T12:00:00Z`,
        input: { model: "ideogram-4.5", aspect: "1:1", prompt: `Original student prompt number ${n}. Текст студента.` } };
      generation = amendGeneration(generation, { result });
    }
    project.visuals.logo = generation; project.logoImage = images[4];
    await page.getByLabel(t("Uvezi Forma projekat")).setInputFiles({ name: "history.forma.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify({ format: "forma-project", version: 1, project })) });
    await expect(page.getByRole("heading", { name: "Bora", exact: true })).toBeVisible();
    await page.locator(".step-nav button").nth(3).click();
    const history = page.getByRole("region", { name: t("Istorija generisanih slika") });
    await expect(history.locator(".history-card")).toHaveCount(5);
    await expect(history.locator("input:checked")).toHaveCount(0);
    await history.getByRole("checkbox", { name: t("Uključi u PDF: {0}", { 0: t("Slika {0}", { 0: 1 }) }), exact: true }).check();
    await history.locator(".history-restore").last().click();
    await expect(history.locator(".history-restore").last()).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(history.locator(".history-card")).toHaveCount(5);
    await expect(history.locator("input:checked")).toHaveCount(1);
    await page.setViewportSize({ width: 390, height: 844 });
    await history.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `artifacts/history/${locale}-mobile.png`, fullPage: true });
    await page.getByRole("button", { name: t("Izvezi"), exact: true }).click();
    await page.getByRole("button", { name: t("Kolokvijum 01 (.pdf)"), exact: true }).click();
    const dialog = page.getByRole("dialog"), picker = dialog.locator(".pdf-image-picker");
    await expect(picker.getByRole("checkbox")).toHaveCount(5);
    await expect(picker.locator("input:checked")).toHaveCount(1);
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await dialog.getByRole("checkbox", { name: new RegExp(t("Dodaj promptove u prilogu")) }).check();
    const downloaded = page.waitForEvent("download");
    await dialog.getByRole("button", { name: t("Preuzmi PDF"), exact: true }).click();
    const file = await downloaded; await file.saveAs(`artifacts/history/${locale}-selected.pdf`);
    const pdf = await inspectPdf((await file.path())!);
    expect(pdf.images).toBe(3); // Two type samples and only the checked, older logo.
    expect(pdf.text).toContain("Original student prompt number 1.");
    for (const n of [2, 3, 4, 5]) expect(pdf.text).not.toContain(`Original student prompt number ${n}.`);
    if (locale === "sr") {
      await picker.getByRole("button", { name: t("Poništi izbor") }).click();
      const emptyDownload = page.waitForEvent("download");
      await dialog.getByRole("button", { name: t("Preuzmi PDF"), exact: true }).click();
      const empty = await inspectPdf((await (await emptyDownload).path())!);
      expect(empty.images).toBe(2); expect(empty.text).not.toContain("Original student prompt");
      await picker.getByRole("checkbox").first().check();
      const logoDownload = page.waitForEvent("download");
      await dialog.getByRole("button", { name: t("Preuzmi PDF"), exact: true }).click();
      const logo = await inspectPdf((await (await logoDownload).path())!);
      expect(logo.images).toBe(5); // Selected current logo appears on cover, logo page and letterhead.
      expect(logo.text).toContain("Original student prompt number 5.");
      expect(logo.text).not.toContain("Original student prompt number 1.");
    }
    await dialog.getByRole("button", { name: t("Zatvori prozor") }).click();
    await page.reload();
    await expect(history.locator("input:checked")).toHaveCount(1);
    if (locale === "sr") await expect(history.getByRole("checkbox").first()).toBeChecked();
    expect(errors).toEqual([]); expect(paid).toEqual([]);
  });
}
