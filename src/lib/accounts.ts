import { headers } from "next/headers";
import { accountsConfigured, getAccountAuth } from "./account-auth";
import { getDb } from "./db";
import type { Account, Viewer } from "./account-types";
export function isInstructor(email: string) { return (process.env.INSTRUCTOR_EMAILS || "").split(",").map(value=>value.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase()); }
export async function accountSession(requestHeaders?: Headers) {
  if (!accountsConfigured()) return null;
  return getAccountAuth().api.getSession({ headers: requestHeaders || await headers() });
}
export async function enrolledAccount(requestHeaders?: Headers): Promise<Account|null> {
  const session = await accountSession(requestHeaders);
  if (!session || !session.user.emailVerified) return null;
  const member = await getDb().query('SELECT student_number, group_name, joined_at FROM forma_members WHERE user_id=$1', [session.user.id]);
  if (!member.rows[0]) return null;
  return {id:session.user.id,name:session.user.name,email:session.user.email,role:isInstructor(session.user.email)?"instructor":"student",studentNumber:member.rows[0].student_number,group:member.rows[0].group_name,enrolledAt:member.rows[0].joined_at.toISOString()};
}
export async function viewer():Promise<Viewer> { return {account:await enrolledAccount(),googleReady:accountsConfigured()}; }
