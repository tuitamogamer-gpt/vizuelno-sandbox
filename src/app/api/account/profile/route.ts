import { z } from "zod";
import { getDb } from "@/lib/db";
import { MAX_STORAGE_BYTES } from "@/lib/cloud/documents";
import { member, failure, json, readJson } from "@/lib/cloud/http";
export async function GET(request:Request){try{const account=await member(request);const result=await getDb().query("SELECT COALESCE(sum(byte_size),0)::bigint AS bytes FROM forma_assets WHERE owner_id=$1",[account.id]);return json({account,storage:{used:Number(result.rows[0].bytes),limit:MAX_STORAGE_BYTES}});}catch(e){return failure(e);}}
export async function PATCH(request:Request){try{const account=await member(request),data=z.object({studentNumber:z.string().trim().max(40),group:z.string().trim().max(80)}).parse(await readJson(request,3000));await getDb().query("UPDATE forma_members SET student_number=$2,group_name=$3,last_active=now() WHERE user_id=$1",[account.id,data.studentNumber,data.group]);return json({ok:true});}catch(e){return failure(e);}}
