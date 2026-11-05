import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createTranslator, type Locale } from "../../src/lib/i18n/core";

const chooser = (page: Page) => page.locator(".language-selector select");
test.beforeEach(async ({ context, page }, info) => {
  await context.setExtraHTTPHeaders({
    "x-vercel-forwarded-for": `198.51.100.${(info.testId.split("").reduce((n, c) => n + c.charCodeAt(0), 0) % 250) + 1}`,
  });
  await page.route("**/api/ai/status", (route) =>
    route.fulfill({ json: { available: false } }),
  );
});
async function login(page: Page, locale: Locale) {
  const t = createTranslator(locale);
  await page.goto("/pristup");
  await chooser(page).selectOption(locale);
  await page
    .getByLabel(t("Pristupni kod"), { exact: true })
    .fill(process.env.ACCESS_CODE!);
  await page
    .getByRole("button", { name: t("Uđi u studio"), exact: true })
    .click();
  await expect(page).toHaveURL(/\/studio$/, { timeout: 20000 });
  await expect(
    page.getByRole("heading", { name: t("Tvoj prostor za dobre ideje.") }),
  ).toBeVisible();
}

test("Serbian is default; English and Russian persist across pages, reloads and login errors", async ({
  page,
}) => {
  await page.goto("/pristup");
  await expect(chooser(page)).toHaveValue("sr");
  await expect(page.locator("html")).toHaveAttribute("lang", "sr-Latn");
  await expect(chooser(page).locator("option")).toHaveText([
    "Srpski",
    "English",
    "Русский",
  ]);
  for (const language of ["en", "ru"] as const) {
    const t = createTranslator(language);
    await chooser(page).selectOption(language);
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(
      page.getByLabel(t("Pristupni kod"), { exact: true }),
    ).toBeVisible();
    await page
      .getByLabel(t("Pristupni kod"), { exact: true })
      .fill("incorrect-code");
    await page
      .getByRole("button", { name: t("Uđi u studio"), exact: true })
      .click();
    await expect(page.locator("#login-error")).not.toContainText(
      "Kod nije ispravan",
    );
    await expect(page.locator("#login-error")).not.toBeEmpty();
    await page.reload();
    await expect(chooser(page)).toHaveValue(language);
    await expect(page).toHaveTitle(t("Forma — Vizuelno komuniciranje"));
    const response = await page.request.get("/pristup");
    expect(await response.text()).toContain(`<html lang="${language}"`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `artifacts/i18n/login-${language}-mobile.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await chooser(page).selectOption("sr");
  await page.reload();
  await expect(page.getByLabel("Pristupni kod", { exact: true })).toBeVisible();
});

test("switching languages preserves edits, step, Playground draft and translated exports", async ({
  page,
}) => {
  test.setTimeout(100_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const en = createTranslator("en"),
    ru = createTranslator("ru");
  await login(page, "en");
  await page
    .getByRole("button", { name: en("Novi projekat"), exact: true })
    .click();
  await page
    .getByLabel(en("Radni naziv projekta"))
    .fill("Моя идея / Studio List");
  await page
    .getByLabel(en("Ime i prezime"), { exact: true })
    .fill("Анна / Ana");
  await page
    .getByRole("button", { name: en("Kreiraj projekat"), exact: true })
    .click();
  const prose = "Moja originalna ideja. Мой текст. My words remain mine.";
  await page.getByLabel(en("Tvoja ideja, ukratko")).fill(prose);
  await page.locator(".step-nav button").nth(1).click();
  await page.getByLabel(en("Vizija"), { exact: true }).fill(prose);
  await chooser(page).selectOption("ru");
  await expect(page.locator(".step-nav [aria-current=step]")).toContainText(
    "Стратегия",
  );
  await expect(page.getByLabel(ru("Vizija"), { exact: true })).toHaveValue(
    prose,
  );
  await page.reload();
  await expect(chooser(page)).toHaveValue("ru");
  await expect(page.getByLabel(ru("Vizija"), { exact: true })).toHaveValue(
    prose,
  );
  await page.locator(".step-nav button").nth(0).click();
  await expect(page.getByLabel(ru("Tvoja ideja, ukratko"))).toHaveValue(prose);
  for (let step = 0; step < 7; step++) {
    await page.locator(".step-nav button").nth(step).click();
    await expect(page.locator(".step-heading h2")).not.toBeEmpty();
    expect(await page.locator(".step-heading h2").innerText()).toMatch(
      /[а-яё]/i,
    );
  }
  await page
    .getByRole("button", { name: ru("PDF za prvi kolokvijum"), exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", {
      name: ru("PDF za prvi kolokvijum"),
      exact: true,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/i18n/pdf-russian-mobile.png",
    fullPage: true,
  });
  const downloadPromise = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: ru("Preuzmi PDF"), exact: true })
    .click();
  const download = await downloadPromise;
  await download.saveAs("artifacts/i18n/student-russian.pdf");
  expect(
    (await readFile((await download.path())!)).subarray(0, 5).toString(),
  ).toBe("%PDF-");
  await dialog.getByRole("button", { name: ru("Zatvori prozor") }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const selectorBox = await chooser(page).boundingBox();
  expect(selectorBox!.x + selectorBox!.width).toBeLessThanOrEqual(390);
  expect(selectorBox!.y).toBeLessThan(60);
  await page.getByRole("button", { name: ru("Otvori navigaciju") }).click();
  await page
    .getByRole("button", { name: ru("Playground"), exact: true })
    .click();
  await expect(page.locator(".breadcrumb strong")).toHaveText(ru("Playground"));
  await page.locator(".prompt-starters button").first().click();
  const prompt = page.locator(".playground-console textarea");
  await expect(prompt).toHaveValue(/[а-яё]/i);
  await prompt.fill(prose);
  await chooser(page).selectOption("en");
  await expect(prompt).toHaveValue(prose);
  await page.reload();
  await expect(prompt).toHaveValue(prose);
  await page.screenshot({
    path: "artifacts/i18n/playground-english-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: en("Vodič za identitet"), exact: true })
    .click();
  await expect(page.locator(".guide-page")).toBeVisible();
  await chooser(page).selectOption("ru");
  await page.screenshot({
    path: "artifacts/i18n/guide-russian-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: ru("Poveži Google nalog"), exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: ru("Nastavi s Google nalogom"),
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/postavke");
  await expect(
    page.getByRole("heading", { name: ru("Poveži kreativni alat") + "." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: ru("← Nazad u Formu") }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
