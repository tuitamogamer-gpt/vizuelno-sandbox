import { z } from "zod";
import { enrolledAccount } from "../accounts";
import { sameOrigin } from "../auth";
import { getDb } from "../db";
export class CloudError extends Error { constructor(message:string,public status=400,public details?:Record<string,unknown>){super(message);} }
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, no-store","Vary":"Cookie"}});
export function failure(error:unknown){
 if(error instanceof CloudError)return json({error:error.message,...error.details},error.status);
 if(error instanceof z.ZodError)return json({error:"Podaci nisu ispravni. Provjeri unos i pokušaj ponovo."},400);
 console.error("Forma cloud request failed", error instanceof Error ? error.name : "UnknownError");
 return json({error:"Čuvanje na nalogu trenutno nije dostupno. Lokalna kopija ostaje sačuvana; pokušaj ponovo."},503);
}
export async function readJson(request:Request,max=900_000):Promise<unknown>{
 if(Number(request.headers.get("content-length")||0)>max)throw new CloudError("Zahtjev je prevelik.",413);
 if(!request.body)throw new CloudError("Nedostaju podaci.");
 const reader=request.body.getReader(),parts:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw new CloudError("Zahtjev je prevelik.",413);}parts.push(value);}}
 finally{reader.releaseLock();}
 try{return JSON.parse(Buffer.concat(parts).toString("utf8"));}catch{throw new CloudError("Podaci nisu čitljivi.");}
}
export async function member(request:Request,instructor=false){
 if(!["GET","HEAD"].includes(request.method)&&!sameOrigin(request))throw new CloudError("Nedozvoljen zahtjev.",403);
 const account=await enrolledAccount(request.headers);
 if(!account)throw new CloudError("Prijavi se Google nalogom i pridruži se predmetu.",401);
 if(instructor&&account.role!=="instructor")throw new CloudError("Ovaj pregled je dostupan nastavniku.",403);
 return account;
}
export async function rateLimit(key:string,max:number,seconds=60){
 const result=await getDb().query(`INSERT INTO forma_api_limits(key,count,resets_at) VALUES($1,1,now()+$2*interval '1 second')
 ON CONFLICT(key) DO UPDATE SET count=CASE WHEN forma_api_limits.resets_at<=now() THEN 1 ELSE forma_api_limits.count+1 END,
 resets_at=CASE WHEN forma_api_limits.resets_at<=now() THEN now()+$2*interval '1 second' ELSE forma_api_limits.resets_at END RETURNING count`,[key,seconds]);
 if(result.rows[0].count>max)throw new CloudError("Previše zahtjeva. Sačekaj minut i pokušaj ponovo.",429);
}
