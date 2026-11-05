import { serverLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/core";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticated } from "@/lib/auth";
import { enrolledAccount } from "@/lib/accounts";
import ApiSettings from "@/components/api-settings";
export default async function SettingsPage() {
  if (!(await authenticated()) && !(await enrolledAccount())) redirect("/pristup");
  const t = createTranslator(await serverLocale());
  return <main className="standalone-settings"><Link className="text-link" href="/studio">{t("← Nazad u Formu")}</Link><ApiSettings /></main>;
}
