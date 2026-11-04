import { z } from "zod";
import { member, json, failure, readJson, rateLimit } from "@/lib/cloud/http";
import { readDocument, writeDocument, deleteDocument } from "@/lib/cloud/documents";
import { documentId, mutationSchema } from "@/lib/cloud/schema";
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){try{const account=await member(request),id=documentId.parse((await context.params).id);return json(await readDocument(account.id,id));}catch(e){return failure(e);}}
export async function PUT(request:Request,context:Context){try{const account=await member(request),id=documentId.parse((await context.params).id);await rateLimit(`write:${account.id}`,100);const input=mutationSchema.parse(await readJson(request));return json(await writeDocument(account.id,id,input.revision,input.mutationId,input.document));}catch(e){return failure(e);}}
export async function DELETE(request:Request,context:Context){try{const account=await member(request),id=documentId.parse((await context.params).id);await rateLimit(`write:${account.id}`,100);const input=z.object({revision:z.number().int().positive().nullable(),mutationId:z.string().uuid()}).parse(await readJson(request,3000));return json({deleted:true,document:await deleteDocument(account.id,id,input.revision,input.mutationId)});}catch(e){return failure(e);}}
