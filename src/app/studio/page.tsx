import { redirect } from "next/navigation";
import { authenticated } from "@/lib/auth";
import Studio from "@/components/studio";
export default async function StudioPage() {
  if (!(await authenticated())) redirect("/pristup");
  return <Studio />;
}
