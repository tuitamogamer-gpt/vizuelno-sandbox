import { createTranslator, formatLocales, type Locale } from "../i18n/core";
import type { Project } from "../project";
import {
  models,
  targetInfo,
  visualTargets,
  type VisualTarget,
} from "../generation";

export type PdfOptions = {
  locale?: Locale;
  author: string;
  studentNumber: string;
  group: string;
  date: string;
  includeVisuals: boolean;
  includeVariants: boolean;
  includePrompts: boolean;
  submission?: { version: number; createdAt: string };
};

export type PdfVisual = {
  key: string;
  target: VisualTarget;
  image: string;
  caption: string;
  prompt: string;
};

export const pdfChapters = [
  ["polaziste", "Polazište", "Ideja, publika i vizuelni smjer"],
  ["strategija", "Strategija", "Vizija, misija, strategija i ciljevi"],
  ["paleta", "Paleta boja", "Boje, vrijednosti i obrazloženje"],
  ["logotip", "Logotip", "Znak i značenje"],
  ["tipografija", "Tipografija", "Izbor fontova i primjeri slova"],
  ["primjena", "Primjena identiteta", "Memorandum i odabrane primjene"],
  ["proces", "Proces i izvori", "Autorstvo, AI alati i osvrt na rad"],
] as const;

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function pdfDate(value: string, locale: Locale = "sr") {
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return new Intl.DateTimeFormat(formatLocales[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// Only public, chosen results enter the document. Never copy jobs, quote tokens or API keys.
export function pdfVisuals(project: Project, options: PdfOptions): PdfVisual[] {
  const t = createTranslator(options.locale || "sr");
  if (!options.includeVisuals) return [];
  const output: PdfVisual[] = [];
  for (const target of visualTargets) {
    const generation = project.visuals[target];
    if (!generation?.result) continue;
    const results = [
      generation.result,
      ...(options.includeVariants ? generation.alternatives : []),
    ];
    const seen = new Set<string>();
    results.forEach((result, index) => {
      if (seen.has(result.id)) return;
      seen.add(result.id);
      output.push({
        key: `${target}-${result.id}`,
        target,
        image: result.image,
        caption: t("{0} · {1} · AI skica · {2} · {3}", {
          0: t(targetInfo[target].label),
          1: index
            ? t("Ranija varijanta {0}", { 0: index })
            : t("Odabrani vizual"),
          2: models[result.input.model].label,
          3: result.input.aspect,
        }),
        prompt: result.input.prompt,
      });
    });
  }
  if (project.aiImage && !project.visuals.logo?.result) {
    output.push({
      key: "legacy-logo",
      target: "logo",
      image: project.aiImage,
      caption: t("Logotip · Ranija AI skica"),
      prompt: project.aiPrompt,
    });
  }
  return output;
}
