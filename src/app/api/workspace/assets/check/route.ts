import { z } from "zod";
import { member, json, failure, readJson } from "@/lib/cloud/http";
import { hashSchema } from "@/lib/cloud/schema";
import { getDb } from "@/lib/db";
export async function POST(request:Request){try{const account=await member(request);const {hashes}=z.object({hashes:z.array(hashSchema).max(100)}).parse(await readJson(request,10000));const result=await getDb().query("SELECT hash FROM forma_assets WHERE owner_id=$1 AND hash=ANY($2::text[])",[account.id,hashes]);const found=new Set(result.rows.map(row=>row.hash));return json({missing:hashes.filter(hash=>!found.has(hash))});}catch(e){return failure(e);}}
