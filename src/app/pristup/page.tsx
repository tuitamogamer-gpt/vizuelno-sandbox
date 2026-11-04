import { redirect } from "next/navigation";
import { authenticated } from "@/lib/auth";
import { enrolledAccount } from "@/lib/accounts";
import { accountsConfigured } from "@/lib/account-auth";
import Login from "@/components/login";
export default async function AccessPage({searchParams}:{searchParams:Promise<{auth_error?:string}>}) {
  const authError=(await searchParams).auth_error === "1";
  if (!authError && (await enrolledAccount() || await authenticated())) redirect("/studio");
  return <Login googleReady={accountsConfigured()} authError={authError}/>;
}
