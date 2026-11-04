import { z } from "zod";
import { member, json, failure, readJson, rateLimit } from "@/lib/cloud/http";
import { submissions, submitProject } from "@/lib/cloud/submissions";
export async function GET(request:Request){try{const account=await member(request),staff=new URL(request.url).searchParams.get("scope")==="class";if(staff)await member(request,true);return json({submissions:await submissions(staff?null:account.id)});}catch(e){return failure(e);}}
export async function POST(request:Request){try{const account=await member(request);await rateLimit(`submit:${account.id}`,12);const input=z.object({projectId:z.string().uuid(),revision:z.number().int().positive()}).parse(await readJson(request,3000));return json({submission:await submitProject(account.id,input.projectId,input.revision)});}catch(e){return failure(e);}}
