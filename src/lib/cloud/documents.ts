import { PoolClient } from "pg";
import { getDb, transaction } from "../db";
import { progress } from "../project";
import { CloudDocument, DocumentIndex, RemoteDocument, references } from "./schema";
import { CloudError } from "./http";
export const MAX_STORAGE_BYTES=50_000_000;
export const MAX_PROJECTS=30;
type Row={id:string;kind:"project"|"playground";revision:number;mutation_id:string;name:string;progress:number;updated_at:Date;deleted_at:Date|null;data:CloudDocument["data"]};
function index(row:Row):DocumentIndex {return {id:row.id,kind:row.kind,revision:row.revision,mutationId:row.mutation_id,name:row.name,progress:row.progress,updatedAt:row.updated_at.toISOString(),deleted:!!row.deleted_at};}
export async function listDocuments(owner:string):Promise<DocumentIndex[]>{const result=await getDb().query<Row>("SELECT id,kind,revision,mutation_id,name,progress,updated_at,deleted_at FROM forma_documents WHERE owner_id=$1 ORDER BY updated_at DESC",[owner]);return result.rows.map(index);}
export async function readDocument(owner:string,id:string):Promise<RemoteDocument>{const result=await getDb().query<Row>("SELECT * FROM forma_documents WHERE owner_id=$1 AND id=$2 AND deleted_at IS NULL",[owner,id]);if(!result.rows[0])throw new CloudError("Projekat nije pronađen.",404);const row=result.rows[0];return {...index(row),document:{kind:row.kind,data:row.data} as CloudDocument};}
export async function requireAssets(client:PoolClient,owner:string,hashes:string[]){
 if(!hashes.length)return;
 const assets=await client.query("SELECT hash FROM forma_assets WHERE owner_id=$1 AND hash=ANY($2::text[])",[owner,hashes]);
 if(assets.rowCount!==hashes.length)throw new CloudError("Neki vizuali još nisu sačuvani. Ponovi sinhronizaciju.",422);
}
export async function garbageCollect(client:PoolClient,owner:string){
 await client.query(`DELETE FROM forma_assets a WHERE a.owner_id=$1 AND a.created_at<now()-interval '24 hours'
 AND NOT EXISTS(SELECT 1 FROM forma_document_assets d WHERE d.owner_id=a.owner_id AND d.hash=a.hash)
 AND NOT EXISTS(SELECT 1 FROM forma_submission_assets s WHERE s.owner_id=a.owner_id AND s.hash=a.hash)`,[owner]);
}
export async function writeDocument(owner:string,id:string,revision:number|null,mutationId:string,document:CloudDocument){
 if(document.kind==="project"?document.data.id!==id:id!=="playground")throw new CloudError("Identifikator projekta nije ispravan.");
 return transaction(async client=>{
  await client.query("SELECT user_id FROM forma_members WHERE user_id=$1 FOR UPDATE",[owner]);
  const previous=(await client.query<Row>("SELECT * FROM forma_documents WHERE owner_id=$1 AND id=$2",[owner,id])).rows[0];
  if(previous?.mutation_id===mutationId&&!previous.deleted_at)return index(previous);
  if((previous&&previous.revision!==revision)||(!previous&&revision!==null)||previous?.deleted_at)throw new CloudError("Postoji novija verzija rada. Sačuvaj svoje izmjene kao kopiju ili preuzmi verziju s naloga.",409,{revision:previous?.revision??null});
  if(!previous&&document.kind==="project"){const count=await client.query("SELECT count(*)::integer AS count FROM forma_documents WHERE owner_id=$1 AND kind='project' AND deleted_at IS NULL",[owner]);if(count.rows[0].count>=MAX_PROJECTS)throw new CloudError("Nalog može imati do 30 projekata. Izvezi i ukloni one koji ti više nisu potrebni.",422);}
  const hashes=references(document);await requireAssets(client,owner,hashes);
  const name=document.kind==="project"?document.data.name:"Playground",completed=document.kind==="project"?progress(document.data):0;
  const result=await client.query<Row>(`INSERT INTO forma_documents(owner_id,id,kind,data,name,progress,mutation_id) VALUES($1,$2,$3,$4,$5,$6,$7)
   ON CONFLICT(owner_id,id) DO UPDATE SET data=EXCLUDED.data,name=EXCLUDED.name,progress=EXCLUDED.progress,mutation_id=EXCLUDED.mutation_id,revision=forma_documents.revision+1,updated_at=now() RETURNING *`,[owner,id,document.kind,JSON.stringify(document.data),name,completed,mutationId]);
  await client.query("DELETE FROM forma_document_assets WHERE owner_id=$1 AND document_id=$2",[owner,id]);
  if(hashes.length)await client.query("INSERT INTO forma_document_assets(owner_id,document_id,hash) SELECT $1,$2,unnest($3::text[])",[owner,id,hashes]);
  await client.query("UPDATE forma_members SET last_active=now() WHERE user_id=$1",[owner]);
  await garbageCollect(client,owner);return index(result.rows[0]);
 });
}
export async function deleteDocument(owner:string,id:string,revision:number|null,mutationId:string){
 return transaction(async client=>{
  await client.query("SELECT user_id FROM forma_members WHERE user_id=$1 FOR UPDATE",[owner]);
  const previous=(await client.query<Row>("SELECT * FROM forma_documents WHERE owner_id=$1 AND id=$2",[owner,id])).rows[0];
  if(!previous){if(revision!==null)throw new CloudError("Verzija nije dostupna.",409);return null;}
  if(previous.mutation_id===mutationId&&previous.deleted_at)return index(previous);
  if(previous.revision!==revision)throw new CloudError("Na nalogu postoji novija verzija. Brisanje je zaustavljeno.",409);
  const row=(await client.query<Row>("UPDATE forma_documents SET deleted_at=now(),updated_at=now(),revision=revision+1,mutation_id=$3 WHERE owner_id=$1 AND id=$2 RETURNING *",[owner,id,mutationId])).rows[0];
  await client.query("DELETE FROM forma_document_assets WHERE owner_id=$1 AND document_id=$2",[owner,id]);await garbageCollect(client,owner);return index(row);
 });
}
