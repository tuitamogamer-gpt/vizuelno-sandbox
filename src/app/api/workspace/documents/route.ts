import { member, json, failure } from "@/lib/cloud/http";
import { listDocuments } from "@/lib/cloud/documents";
export async function GET(request:Request){try{const account=await member(request);return json({documents:await listDocuments(account.id)});}catch(e){return failure(e);}}
