import { z } from "zod";
import { member, json, failure, readJson, rateLimit } from "@/lib/cloud/http";
import { reviewSubmission } from "@/lib/cloud/submissions";
const schema=z.object({status:z.enum(["changes_requested","reviewed"]),comment:z.string().trim().min(5).max(6000),criteria:z.partialRecord(z.enum(["concept","identity","typography","application","reasoning"]),z.enum(["clear","needs_work"]))});
export async function POST(request:Request,context:{params:Promise<{id:string}>}){try{const account=await member(request,true),id=z.string().uuid().parse((await context.params).id);await rateLimit(`review:${account.id}`,60);return json({submission:await reviewSubmission(id,account.id,schema.parse(await readJson(request,30000)))});}catch(e){return failure(e);}}
