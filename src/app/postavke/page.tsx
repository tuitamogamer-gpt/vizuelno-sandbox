import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticated } from "@/lib/auth";
import { enrolledAccount } from "@/lib/accounts";
import ApiSettings from "@/components/api-settings";
export default async function SettingsPage() {
  if (!(await authenticated()) && !(await enrolledAccount())) redirect("/pristup");
  return <main className="standalone-settings"><Link className="text-link" href="/studio">← Nazad u Formu</Link><ApiSettings /></main>;
}
