import { accountsConfigured, getAccountAuth } from "@/lib/account-auth";
async function handle(request:Request){
  if(!accountsConfigured())return Response.json({error:"Google prijava još nije uključena. Lokalni studio je dostupan putem koda."},{status:503});
  return getAccountAuth().handler(request);
}
export const GET=handle;
export const POST=handle;
export const runtime="nodejs";
