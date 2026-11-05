import { createTranslator, formatLocales, type Locale } from "../i18n/core";
import type { Project } from "../project";
import {
  models,
  generationHistory,
  targetInfo,
  visualKey,
  visualTargets,
  type VisualTarget,
} from "../generation";

export type PdfOptions = {
  locale?: Locale;
  author: string;
  studentNumber: string;
  group: string;
  date: string;
  selectedVisualIds?: string[];
  includePrompts: boolean;
  submission?: { version: number; createdAt: string };
};

export type PdfVisual = {
  key: string;
  target: VisualTarget;
  image: string;
  caption: string;
  prompt: string;
  createdAt?: string;
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

// Legacy images have no provider ID. Bind their selection to their content so
// replacing a logo never automatically selects a different image for export.
function legacyKey(source: string) {
  let a = 2166136261, b = 5381;
  for (let i = 0; i < source.length; i++) {
    a = Math.imul(a ^ source.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ source.charCodeAt(i);
  }
  return `image-${source.length}-${(a >>> 0).toString(16)}-${(b >>> 0).toString(16)}`;
}

// The chooser may show all history; this function never authorizes PDF inclusion.
export function pdfCandidates(project: Project, locale: Locale = "sr"): PdfVisual[] {
  const t = createTranslator(locale);
  const output: PdfVisual[] = [];
  for (const target of visualTargets) {
    const results = generationHistory(project.visuals[target]);
    results.forEach((result, index) => {
      output.push({
        key: visualKey(target, result.id),
        target,
        image: result.image,
        caption: t("{0} · {1} · AI skica · {2} · {3}", {
          0: t(targetInfo[target].label),
          1: t("Slika {0}", { 0: results.length - index }),
          2: models[result.input.model].label,
          3: result.input.aspect,
        }),
        prompt: result.input.prompt,
        createdAt: result.createdAt,
      });
    });
  }
  if (project.aiImage && !output.some(v => v.target === "logo" && v.image === project.aiImage)) {
    output.push({
      key: legacyKey(project.aiImage),
      target: "logo",
      image: project.aiImage,
      caption: t("Logotip · Ranija AI skica"),
      prompt: project.aiPrompt,
    });
  }
  if (project.logoImage && !output.some(v => v.target === "logo" && v.image === project.logoImage)) {
    output.push({ key: legacyKey(project.logoImage), target: "logo", image: project.logoImage,
      caption: t("Logotip projekta"), prompt: "" });
  }
  return output;
}

// Empty means empty, including for older projects. Only explicit selections
// enter figures, the prompt appendix, the cover and the letterhead.
export function pdfVisuals(project: Project, options: PdfOptions): PdfVisual[] {
  const selected = new Set(options.selectedVisualIds ?? project.pdfVisualIds);
  return pdfCandidates(project, options.locale).filter(visual => selected.has(visual.key));
}
