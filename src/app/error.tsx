"use client";
import { useI18n } from "@/components/language-provider";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useI18n();
 return <main className="error-page"><span className="eyebrow">{t("NEŠTO JE ZAPINJALO")}</span><h1>{t("Pokušajmo ponovo.")}</h1><p>{t("Tvoji sačuvani projekti ostaju u ovom pregledniku.")}</p><button className="button primary" onClick={reset}>{t("Ponovo učitaj")}</button></main>; }
