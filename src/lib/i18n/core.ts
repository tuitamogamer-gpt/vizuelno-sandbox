import messages from "./messages.json";

export const locales = ["sr", "en", "ru"] as const;
export type Locale = (typeof locales)[number];
export const languageNames: Record<Locale, string> = {
  sr: "Srpski",
  en: "English",
  ru: "Русский",
};
export const htmlLanguages: Record<Locale, string> = {
  sr: "sr-Latn",
  en: "en",
  ru: "ru",
};
export const formatLocales: Record<Locale, string> = {
  sr: "sr-Latn",
  en: "en-GB",
  ru: "ru-RU",
};
export const localeCookie = "forma_language";
export function normalizeLocale(value?: string | null): Locale {
  return value === "en" || value === "ru" ? value : "sr";
}
export type TranslationValues = Record<string, string | number>;
type Entry = { en: string; ru: string };
const dictionary: Record<string, Entry> = messages;
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();
const escapeRegex = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = Object.entries(dictionary)
  .filter(
    ([key]) =>
      /\{\d+\}/.test(key) && key.replace(/\{\d+\}/g, "").trim().length > 15,
  )
  .map(([source, entry]) => {
    const positions = [...source.matchAll(/\{(\d+)\}/g)].map(
      (match) => match[1],
    );
    const pattern = source
      .split(/\{\d+\}/)
      .map(escapeRegex)
      .join("([\\s\\S]*?)");
    return { source, entry, positions, pattern: new RegExp(`^${pattern}$`) };
  });

/** Translate application-owned copy only. Project text and other user content bypass this function. */
export function translate(
  locale: Locale,
  message: string,
  values?: TranslationValues,
): string {
  const key = normalize(message);
  let template = locale === "sr" ? message : dictionary[key]?.[locale];
  let replacements = values;
  if (!template && !values) {
    // API errors and saved status messages remain canonical Serbian strings. Resolve
    // their templates at display time, so changing language also updates an open alert.
    for (const item of patterns) {
      const match = item.pattern.exec(key);
      if (match) {
        template = item.entry[locale as "en" | "ru"];
        replacements = Object.fromEntries(
          item.positions.map((position, i) => [position, match[i + 1]]),
        );
        break;
      }
    }
  }
  let result = template ?? key;
  if (replacements)
    result = result.replace(/\{(\w+)\}/g, (token, name: string) =>
      String(replacements?.[name] ?? token),
    );
  // Preserve intentional whitespace around inline JSX fragments and newlines in prompts.
  if (locale === "sr") return result;
  return `${message.match(/^\s*/)?.[0] || ""}${result}${message.match(/\s*$/)?.[0] || ""}`;
}

export function createTranslator(locale: Locale) {
  return (message: string, values?: TranslationValues) =>
    translate(locale, message, values);
}
export function browserLocale(): Locale {
  return typeof document === "undefined"
    ? "sr"
    : normalizeLocale(document.documentElement.lang);
}
export function localeDate(
  value: string | Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat(formatLocales[locale], options).format(
    new Date(value),
  );
}
