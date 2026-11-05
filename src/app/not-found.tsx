"use client";
import { useI18n } from "@/components/language-provider";
import Link from "next/link";
export default function NotFound() {
  const { t } = useI18n();
 return <main className="error-page"><span className="eyebrow">{t("404 / IZVAN FORMATA")}</span><h1>{t("Ova stranica još nema formu.")}</h1><Link className="button primary" href="/studio">{t("Nazad u studio →")}</Link></main>; }
