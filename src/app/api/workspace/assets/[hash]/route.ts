import { member, failure, CloudError } from "@/lib/cloud/http";
import { hashSchema } from "@/lib/cloud/schema";
import { getDb } from "@/lib/db";
export async function GET(request:Request,context:{params:Promise<{hash:string}>}){try{const account=await member(request),hash=hashSchema.parse((await context.params).hash);const result=await getDb().query("SELECT mime,data FROM forma_assets WHERE owner_id=$1 AND hash=$2",[account.id,hash]);if(!result.rows[0])throw new CloudError("Vizual nije pronađen.",404);const row=result.rows[0];return new Response(new Uint8Array(row.data),{headers:{"Content-Type":row.mime,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Vary":"Cookie"}});}catch(e){return failure(e);}}
