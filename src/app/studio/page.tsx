import { redirect } from "next/navigation";
import { authenticated } from "@/lib/auth";
import { viewer, accountSession } from "@/lib/accounts";
import Studio from "@/components/studio";
export default async function StudioPage() {
  const current=await viewer();
  if (!current.account && !(await authenticated())) redirect(await accountSession()?"/upis":"/pristup");
  return <Studio viewer={current}/>;
}
