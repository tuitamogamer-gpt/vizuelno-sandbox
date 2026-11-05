import type { Metadata } from "next";
import LanguageProvider from "@/components/language-provider";
import { serverLocale } from "@/lib/i18n/server";
import { createTranslator, htmlLanguages } from "@/lib/i18n/core";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/libre-baskerville/400.css";
import "@fontsource/libre-baskerville/700.css";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = createTranslator(await serverLocale());
  return { title: t("Forma — Vizuelno komuniciranje"), description: t("Od prve ideje do prepoznatljivog vizuelnog identiteta. Studentski studio za Vizuelno komuniciranje."), robots: { index: false, follow: false } };
}
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await serverLocale();
  return <html lang={htmlLanguages[locale]} data-scroll-behavior="smooth"><body><LanguageProvider initialLocale={locale}>{children}</LanguageProvider></body></html>;
}
