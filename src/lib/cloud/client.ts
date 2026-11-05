"use client";
import { Project, projectSchema } from "../project";
import { PlaygroundData, playgroundSchema, Generation } from "../generation";
import { CloudDocument, CloudProject, CloudPlayground, documentSchema } from "./schema";
export type LocalDocument={kind:"project";data:Project}|{kind:"playground";data:PlaygroundData};
export class SyncError extends Error {constructor(message:string,public status:number){super(message);}}
export async function cloudApi<T>(path:string,method="GET",body?:unknown):Promise<T>{
 let response:Response;
 try{response=await fetch(path,{method,credentials:"same-origin",cache:"no-store",headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(35000)});}catch{throw new SyncError("Veza je prekinuta. Provjeri internet i pokušaj ponovo.",0);}
 const result=await response.json().catch(()=>({error:"Servis nije vratio čitljiv odgovor."}));
 if(!response.ok)throw new SyncError(result.error||"Sinhronizacija trenutno nije dostupna.",response.status);
 return result as T;
}
async function mapImages<T extends LocalDocument|CloudDocument>(source:T,map:(image:string)=>Promise<string>):Promise<T>{
 const document=structuredClone(source);
 const generation=async(value:Generation | undefined)=>{if(!value)return;if(value.result)value.result.image=await map(value.result.image);for(const item of value.alternatives)item.image=await map(item.image);};
 if(document.kind==="project"){if(document.data.logoImage)document.data.logoImage=await map(document.data.logoImage);if(document.data.aiImage)document.data.aiImage=await map(document.data.aiImage);for(const value of Object.values(document.data.visuals))await generation(value);}
 else{await generation(document.data.generation);for(const item of document.data.history)item.image=await map(item.image);}
 return document;
}
export async function packDocument(document:LocalDocument){
 const images=new Map<string,string>();
 const packed=await mapImages(document,async image=>{const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(image));const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,"0")).join("");images.set(hash,image);return `asset:${hash}`;});
 return {document:documentSchema.parse(packed),images};
}
export async function uploadImages(images:Map<string,string>){
 if(!images.size)return;
 const hashes=[...images.keys()];
 for(let offset=0;offset<hashes.length;offset+=100){
  const {missing}=await cloudApi<{missing:string[]}>("/api/workspace/assets/check","POST",{hashes:hashes.slice(offset,offset+100)});
  for(const hash of missing){const uploaded=await cloudApi<{hash:string}>("/api/workspace/assets","POST",{image:images.get(hash)});if(uploaded.hash!==hash)throw new SyncError("Vizual nije ispravno sačuvan.",422);}
 }
}
export async function unpackDocument(document:CloudDocument,base="/api/workspace/assets"):Promise<LocalDocument>{
 const images=new Map<string,Promise<string>>();
 const unpacked=await mapImages(document,async reference=>{
  if(!/^asset:[a-f0-9]{64}$/.test(reference))throw new SyncError("Arhiva sadrži neispravnu sliku.",422);
  const hash=reference.slice(6);
  if(!images.has(hash))images.set(hash,(async()=>{const response=await fetch(`${base}/${hash}`,{cache:"no-store",signal:AbortSignal.timeout(35000)});if(!response.ok)throw new SyncError("Vizual nije dostupan. Provjeri vezu i pokušaj ponovo.",response.status);const blob=await response.blob();if(blob.size>2_250_000)throw new SyncError("Vizual je prevelik.",413);return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new SyncError("Vizual nije moguće otvoriti.",422));reader.readAsDataURL(blob);});})());
  return images.get(hash)!;
 });
 return unpacked.kind==="project"?{kind:"project",data:projectSchema.parse(unpacked.data)}:{kind:"playground",data:playgroundSchema.parse(unpacked.data)};
}
export async function unpackProject(project:CloudProject,base:string){return (await unpackDocument({kind:"project",data:project},base)).data as Project;}
export type {CloudProject,CloudPlayground};
