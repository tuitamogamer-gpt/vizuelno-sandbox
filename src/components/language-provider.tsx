"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { Globe2 } from "lucide-react";
import {
  createTranslator,
  htmlLanguages,
  languageNames,
  localeCookie,
  locales,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/core";

const LanguageContext = createContext({
  locale: "sr" as Locale,
  t: createTranslator("sr"),
  setLocale: (() => {}) as (locale: Locale) => void,
});
export function useI18n() {
  return useContext(LanguageContext);
}

export default function LanguageProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, changeLocale] = useState(initialLocale);
  const value = useMemo(
    () => ({
      locale,
      t: createTranslator(locale),
      setLocale(next: Locale) {
        const language = normalizeLocale(next);
        changeLocale(language);
        document.documentElement.lang = htmlLanguages[language];
        document.title = createTranslator(language)(
          "Forma — Vizuelno komuniciranje",
        );
        document.cookie = `${localeCookie}=${language}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      },
    }),
    [locale],
  );
  return (
    <LanguageContext.Provider value={value}>
      <div className="language-corner">
        <LanguageSelector />
      </div>
      {children}
    </LanguageContext.Provider>
  );
}

export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="language-selector">
      <Globe2 size={16} aria-hidden="true" />
      <span className="visually-hidden">{t("Jezik interfejsa")}</span>
      {/* Compact code for small screens; the native select stays on top for input. */}
      <span className="language-code" aria-hidden="true">
        {locale.toUpperCase()}
      </span>
      <select
        value={locale}
        onChange={(event) => setLocale(normalizeLocale(event.target.value))}
        aria-label={t("Jezik interfejsa")}
      >
        {locales.map((language) => (
          <option
            key={language}
            value={language}
            lang={htmlLanguages[language]}
          >
            {languageNames[language]}
          </option>
        ))}
      </select>
    </label>
  );
}
