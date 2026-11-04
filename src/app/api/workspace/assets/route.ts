import { createHash } from "node:crypto";
import { z } from "zod";
import { imageData } from "@/lib/generation";
import { member, json, failure, readJson, CloudError, rateLimit } from "@/lib/cloud/http";
import { transaction } from "@/lib/db";
import { MAX_STORAGE_BYTES, garbageCollect } from "@/lib/cloud/documents";
export async function POST(request:Request){try{
 const account=await member(request);await rateLimit(`asset:${account.id}`,150);
 const {image}=z.object({image:imageData.refine(value=>value.length>0)}).parse(await readJson(request,3_010_000));
 const hash=createHash("sha256").update(image).digest("hex"),mime=image.slice(5,image.indexOf(";")),bytes=Buffer.from(image.slice(image.indexOf(",")+1),"base64");
 if(bytes.length<1||bytes.length>2_250_000)throw new CloudError("Vizual je prevelik ili neispravan.",413);
 await transaction(async client=>{await client.query("SELECT user_id FROM forma_members WHERE user_id=$1 FOR UPDATE",[account.id]);const found=await client.query("SELECT hash FROM forma_assets WHERE owner_id=$1 AND hash=$2",[account.id,hash]);if(found.rowCount)return;
 await garbageCollect(client,account.id);const used=await client.query("SELECT COALESCE(sum(byte_size),0)::bigint AS bytes FROM forma_assets WHERE owner_id=$1",[account.id]);if(Number(used.rows[0].bytes)+bytes.length>MAX_STORAGE_BYTES)throw new CloudError("Prostor na nalogu je popunjen. Preuzmi rezervnu kopiju i obrati se nastavniku.",413);
 await client.query("INSERT INTO forma_assets(owner_id,hash,mime,data,byte_size) VALUES($1,$2,$3,$4,$5)",[account.id,hash,mime,bytes,bytes.length]);});return json({hash});
}catch(e){return failure(e);}}
