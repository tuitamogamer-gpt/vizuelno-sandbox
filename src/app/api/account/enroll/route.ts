import { z } from "zod";
import { accountSession } from "@/lib/accounts";
import { authenticated, sameOrigin, verifyCode } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { CloudError, failure, json, rateLimit, readJson } from "@/lib/cloud/http";
export async function POST(request:Request){try{
 if(!sameOrigin(request))throw new CloudError("Nedozvoljen zahtjev.",403);
 const session=await accountSession(request.headers);if(!session||!session.user.emailVerified)throw new CloudError("Potrebna je prijava potvrđenim Google nalogom.",401);
 await rateLimit(`enroll:${session.user.id}`,8,900);
 const data=z.object({code:z.string().max(128).default(""),studentNumber:z.string().trim().max(40),group:z.string().trim().max(80)}).parse(await readJson(request,3000));
 if(!await authenticated()&&!verifyCode(data.code))throw new CloudError("Kod predmeta nije ispravan.",401);
 await getDb().query("INSERT INTO forma_members(user_id,student_number,group_name) VALUES($1,$2,$3) ON CONFLICT(user_id) DO NOTHING",[session.user.id,data.studentNumber,data.group]);
 return json({enrolled:true});
}catch(e){return failure(e);}}
