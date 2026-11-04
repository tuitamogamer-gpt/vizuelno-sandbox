import { redirect } from "next/navigation";
import { authenticated } from "@/lib/auth";
import Login from "@/components/login";
export default async function AccessPage() {
  if (await authenticated()) redirect("/studio");
  return <Login />;
}
