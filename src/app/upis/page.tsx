export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { accountSession,enrolledAccount } from "@/lib/accounts";
import { authenticated } from "@/lib/auth";
import Enrollment from "@/components/enrollment";
export default async function EnrollmentPage(){const session=await accountSession();if(!session)redirect("/pristup");if(!session.user.emailVerified)redirect("/pristup?auth_error=1");if(await enrolledAccount())redirect("/studio");return <Enrollment name={session.user.name} email={session.user.email} hasCourseAccess={await authenticated()}/>;}
