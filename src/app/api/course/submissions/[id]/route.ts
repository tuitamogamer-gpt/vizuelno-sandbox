import { z } from "zod";
import { member, json, failure, CloudError } from "@/lib/cloud/http";
import { getDb } from "@/lib/db";
import { cloudProjectSchema } from "@/lib/cloud/schema";
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{const account=await member(request),id=z.string().uuid().parse((await context.params).id);const row=(await getDb().query("SELECT owner_id,data FROM forma_submissions WHERE id=$1",[id])).rows[0];if(!row||(row.owner_id!==account.id&&account.role!=="instructor"))throw new CloudError("Predaja nije pronađena.",404);return json({project:cloudProjectSchema.parse(row.data)});}catch(e){return failure(e);}}
