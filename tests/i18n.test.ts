import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { strFromU8 } from "fflate";
import messages from "../src/lib/i18n/messages.json";
import {
  createTranslator,
  normalizeLocale,
  htmlLanguages,
} from "../src/lib/i18n/core";
import { exampleProject, newProject, visualBrief } from "../src/lib/project";
import { identityBookHtml, identityKitFiles } from "../src/lib/identity-kit";
import { landingHtml } from "../src/lib/export";

test("Serbian is the default; both additional languages have complete, valid placeholders", () => {
  for (const value of [undefined, null, "", "de", "ru-RU", "<script>"])
    assert.equal(normalizeLocale(value), "sr");
  assert.equal(normalizeLocale("en"), "en");
  assert.equal(normalizeLocale("ru"), "ru");
  assert.equal(htmlLanguages.sr, "sr-Latn");
  for (const [key, values] of Object.entries(messages)) {
    for (const language of ["en", "ru"] as const) {
      assert.ok(values[language].trim(), `${language}: ${key}`);
      assert.deepEqual(
        [...values[language].matchAll(/\{\d+\}/g)].map((m) => m[0]).sort(),
        [...key.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort(),
        `${language}: ${key}`,
      );
    }
  }
  const en = createTranslator("en"),
    ru = createTranslator("ru");
  assert.equal(en("Jezik interfejsa"), "Interface language");
  assert.equal(ru("Jezik interfejsa"), "Язык интерфейса");
  assert.equal(en("  Novi projekat "), "  New project ");
  assert.equal(en("Boja {0}", { 0: 3 }), "Colour 3");
  assert.match(
    ru(
      "Slika „Studentov vizual“ nije čitljiva. Izaberi drugu varijantu ili isključi AI vizuale i pokušaj ponovo.",
    ),
    /изображение «Studentov vizual»/,
  );
  assert.equal(en("Unknown provider error"), "Unknown provider error");
});

test("every literal translation call has English and Russian copy", () => {
  function files(dir: string): string[] {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .flatMap((entry) =>
        entry.isDirectory()
          ? files(path.join(dir, entry.name))
          : /\.tsx?$/.test(entry.name)
            ? [path.join(dir, entry.name)]
            : [],
      );
  }
  const missing: string[] = [];
  for (const file of files("src")) {
    const ast = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    function visit(node: ts.Node) {
      if (
        ts.isCallExpression(node) &&
        ["t", "h"].includes(node.expression.getText()) &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const key = node.arguments[0].text.replace(/\s+/g, " ").trim();
        if (!(key in messages)) missing.push(`${file}: ${key}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  assert.deepEqual(missing, []);
});

test("localized presets, briefs and export labels preserve student-authored content", () => {
  const original = exampleProject();
  const studentText =
    'Studentov rad / Моя идея / <script>alert("test")</script>';
  const project = { ...original, name: "Моя идея", description: studentText };
  const snapshot = JSON.stringify(project);
  for (const locale of ["en", "ru"] as const) {
    const t = createTranslator(locale),
      example = exampleProject(locale);
    assert.equal(example.description, t(original.description));
    assert.equal(
      newProject("", "", "new", locale).colors[0].name,
      t("Primarna"),
    );
    const brief = visualBrief(project, "typography", locale);
    assert.ok(brief.includes(studentText));
    assert.ok(!brief.startsWith("Vizuelni identitet:"));
    assert.ok(!brief.includes("Napravi tipografski plakat"));
    for (const html of [
      identityBookHtml(project, locale),
      landingHtml(project, locale),
    ]) {
      assert.ok(html.includes(`lang="${locale}"`));
      assert.ok(html.includes("Studentov rad / Моя идея / &lt;script&gt;"));
      assert.ok(!html.includes("<script>"));
      assert.ok(!html.includes("Upoznaj našu priču"));
    }
    const files = identityKitFiles(project, locale);
    const readme = strFromU8(
      Object.entries(files).find(([name]) =>
        name.endsWith("PROCITAJ-ME.txt"),
      )![1],
    );
    assert.ok(readme.startsWith("Моя идея"));
    assert.ok(!readme.includes("komplet vizuelnog identiteta"));
    assert.equal(JSON.stringify(project), snapshot);
  }
  assert.equal(exampleProject("ru").bodyFont, "Noto Sans");
});
