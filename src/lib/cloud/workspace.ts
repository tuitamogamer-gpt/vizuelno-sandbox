"use client";
import { createTranslator, type Locale } from "../i18n/core";
import { delMany, getMany, keys, setMany } from "idb-keyval";
import { Project, projectSchema } from "../project";
import { PlaygroundData, newGeneration, playgroundSchema } from "../generation";
import { loadProjects, storeParsedProject, removeProject } from "../storage";
import { DocumentIndex, RemoteDocument } from "./schema";
import { LocalDocument, SyncError, cloudApi, packDocument, unpackDocument, uploadImages } from "./client";
type Meta={revision:number|null;mutationId:string;dirty:boolean;deleted:boolean;conflict:boolean};
export type SyncSnapshot={phase:"local"|"loading"|"syncing"|"saved"|"offline"|"error"|"conflict";pending:number;message:string;conflicts:{id:string;name:string}[];lastSyncAt:string|null};
const emptyPlayground=():PlaygroundData=>({generation:newGeneration(),history:[],starred:[]});
export class Workspace {
 private docs=new Map<string,LocalDocument>();private meta=new Map<string,Meta>();private listeners=new Set<()=>void>();private writes:Promise<unknown>=Promise.resolve();private timer:ReturnType<typeof setTimeout>|undefined;private interval:ReturnType<typeof setInterval>|undefined;private running:Promise<void>|null=null;private failed=new Set<string>();private active=false;private initialized=false;
 private snapshot:SyncSnapshot;private projectList:Project[]=[];
 constructor(readonly owner:string|null){this.snapshot={phase:owner?"loading":"local",pending:0,message:"",conflicts:[],lastSyncAt:null};}
 private prefix(){return `forma:account:${this.owner}:`;}
 private dataKey(id:string){return `${this.prefix()}document:${id}`;}
 private metaKey(id:string){return `${this.prefix()}meta:${id}`;}
 getSnapshot=()=>this.snapshot;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>this.listeners.delete(listener);};
 projects=()=>this.projectList;
 playground=()=>this.docs.get("playground")?.data as PlaygroundData|undefined;
 private emit(patch:Partial<SyncSnapshot>={}){
  this.projectList=[...this.docs.entries()].filter(([id,doc])=>doc.kind==="project"&&!this.meta.get(id)?.deleted).map(([,doc])=>doc.data as Project).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const pending=[...this.meta.values()].filter(meta=>meta.dirty).length,conflicts=[...this.meta].filter(([,meta])=>meta.conflict).map(([id])=>({id,name:id==="playground"?"Playground":(this.docs.get(id)?.data as Project|undefined)?.name||"Projekat"}));
  this.snapshot={...this.snapshot,...patch,pending,conflicts};this.listeners.forEach(listener=>listener());
 }
 private enqueue(work:()=>Promise<unknown>){const result=this.writes.catch(()=>{}).then(work);this.writes=result;return result;}
 private schedule(){if(!this.owner||!this.active)return;clearTimeout(this.timer);this.timer=setTimeout(()=>{void this.sync();},1200);}
 private onOnline=()=>{void this.sync();};private onOffline=()=>{if(this.owner)this.emit({phase:"offline",message:"Izmjene ostaju na uređaju dok se veza ne vrati."});};private onFocus=()=>{if(document.visibilityState==="visible")void this.sync();};
 start(){if(this.active)return;this.active=true;window.addEventListener("online",this.onOnline);window.addEventListener("offline",this.onOffline);document.addEventListener("visibilitychange",this.onFocus);if(this.owner)this.interval=setInterval(()=>{void this.sync();},60_000);if(this.initialized)this.schedule();}
 stop(){this.active=false;clearTimeout(this.timer);clearInterval(this.interval);window.removeEventListener("online",this.onOnline);window.removeEventListener("offline",this.onOffline);document.removeEventListener("visibilitychange",this.onFocus);}
 async initialize(){
  if(this.initialized)return this.projects();
  if(!this.owner){const projects=await loadProjects();projects.forEach(data=>this.docs.set(data.id,{kind:"project",data}));const [raw]=await getMany(["forma:playground:v1"]);this.docs.set("playground",{kind:"playground",data:raw?playgroundSchema.parse(raw):emptyPlayground()});this.initialized=true;this.emit({phase:"local"});return this.projects();}
  const stored=(await keys()).filter(key=>typeof key==="string"&&key.startsWith(this.prefix()));const values=await getMany(stored);
  stored.forEach((key,i)=>{const name=String(key);if(name.startsWith(this.prefix()+"document:")){const id=name.slice((this.prefix()+"document:").length);const raw=values[i] as LocalDocument;this.docs.set(id,raw.kind==="project"?{kind:"project",data:projectSchema.parse(raw.data)}:{kind:"playground",data:playgroundSchema.parse(raw.data)});}else if(name.startsWith(this.prefix()+"meta:"))this.meta.set(name.slice((this.prefix()+"meta:").length),values[i] as Meta);});
  this.initialized=true;this.emit({phase:navigator.onLine?"syncing":"offline"});
  await this.sync();return this.projects();
 }
 private async persist(id:string,document:LocalDocument){
  if(!this.owner){this.docs.set(id,document);this.emit();await this.enqueue(()=>document.kind==="project"?storeParsedProject(document.data):setMany([["forma:playground:v1",document.data]]));return;}
  const previous=this.meta.get(id),meta:Meta={revision:previous?.revision??null,mutationId:crypto.randomUUID(),dirty:true,deleted:false,conflict:previous?.conflict??false};
  this.docs.set(id,document);this.meta.set(id,meta);this.emit({phase:navigator.onLine?"syncing":"offline",message:""});
  try{await this.enqueue(()=>setMany([[this.dataKey(id),document],[this.metaKey(id),meta]]));this.failed.delete(id);this.schedule();}
  catch(error){this.failed.add(id);this.emit({phase:"error",message:"Lokalna kopija nije sačuvana. Preuzmi rezervnu kopiju prije zatvaranja."});throw error;}
 }
 saveProject(project:Project){return this.persist(project.id,{kind:"project",data:projectSchema.parse(project)});}
 savePlayground(data:PlaygroundData){return this.persist("playground",{kind:"playground",data:playgroundSchema.parse(data)});}
 async removeProject(id:string){
  if(!this.owner){await this.enqueue(()=>removeProject(id));this.docs.delete(id);this.emit();return;}
  const previous=this.meta.get(id),meta:Meta={revision:previous?.revision??null,mutationId:crypto.randomUUID(),dirty:true,deleted:true,conflict:previous?.conflict??false};this.meta.set(id,meta);this.emit();try{await this.enqueue(()=>setMany([[this.metaKey(id),meta]]));this.schedule();}catch(error){if(previous)this.meta.set(id,previous);else this.meta.delete(id);this.emit({phase:"error",message:"Brisanje nije sačuvano. Pokušaj ponovo."});throw error;}
 }
 async sync(){
  if(!this.owner||!this.initialized)return;
  if(this.running)return this.running;
  if(!navigator.onLine){this.onOffline();return;}
  this.running=this.runSync().finally(()=>{this.running=null;});return this.running;
 }
 private async runSync(){
  this.emit({phase:"syncing",message:""});
  try{
   await this.writes;
   // Push local changes first. The revision check catches edits from other devices.
   for(const [id] of this.meta){const meta=this.meta.get(id)!;if(!meta.dirty||meta.conflict||this.failed.has(id))continue;await this.push(id,meta);}
   const {documents}=await cloudApi<{documents:DocumentIndex[]}>("/api/workspace/documents");
   for(const item of documents){
    const meta=this.meta.get(item.id);
    if(meta?.dirty){if(item.mutationId===meta.mutationId){const next={...meta,dirty:false,revision:item.revision};this.meta.set(item.id,next);await this.enqueue(()=>setMany([[this.metaKey(item.id),next]]));}
     else if(item.revision!==meta.revision)await this.conflict(item.id);continue;}
    if(meta?.revision===item.revision)continue;
    if(item.deleted){this.docs.delete(item.id);this.meta.delete(item.id);await this.enqueue(()=>delMany([this.dataKey(item.id),this.metaKey(item.id)]));continue;}
    await this.pull(item.id,meta?.mutationId);
   }
   const conflicted=[...this.meta.values()].some(meta=>meta.conflict),pending=[...this.meta.values()].some(meta=>meta.dirty);
   this.emit({phase:conflicted?"conflict":pending?"syncing":"saved",lastSyncAt:new Date().toISOString(),message:conflicted?"Postoje izmjene s drugog uređaja. Izaberi verziju koju želiš zadržati.":""});if(pending&&!conflicted&&!this.failed.size)this.schedule();
  }catch(error){this.emit({phase:error instanceof SyncError&&error.status===0?"offline":"error",message:error instanceof Error?error.message:"Sinhronizacija nije uspjela."});}
 }
 private async conflict(id:string){const previous=this.meta.get(id);if(!previous)return;const next={...previous,conflict:true};this.meta.set(id,next);await this.enqueue(()=>setMany([[this.metaKey(id),next]]));this.emit();}
 private async push(id:string,meta:Meta){
  try{
   let updated:DocumentIndex|null;
   if(meta.deleted){const result=await cloudApi<{document:DocumentIndex|null}>(`/api/workspace/documents/${id}`,"DELETE",{revision:meta.revision,mutationId:meta.mutationId});updated=result.document;}
   else{const data=this.docs.get(id);if(!data)return;const packed=await packDocument(data);await uploadImages(packed.images);updated=await cloudApi<DocumentIndex>(`/api/workspace/documents/${id}`,"PUT",{revision:meta.revision,mutationId:meta.mutationId,document:packed.document});}
   const current=this.meta.get(id);if(!current)return;
   if(meta.deleted&&current.mutationId===meta.mutationId){this.docs.delete(id);this.meta.delete(id);await this.enqueue(()=>delMany([this.dataKey(id),this.metaKey(id)]));}
   else{const next={...current,revision:updated?.revision??null,dirty:current.mutationId!==meta.mutationId,conflict:false};this.meta.set(id,next);await this.enqueue(()=>setMany([[this.metaKey(id),next]]));}
  }catch(error){if(error instanceof SyncError&&error.status===409){await this.conflict(id);return;}throw error;}
 }
 private async pull(id:string,expectedMutation?:string,force=false){
  const remote=await cloudApi<RemoteDocument>(`/api/workspace/documents/${id}`),document=await unpackDocument(remote.document);
  const current=this.meta.get(id);if(!force&&(current?.dirty||current?.mutationId!==expectedMutation))return;
  const meta:Meta={revision:remote.revision,mutationId:remote.mutationId,dirty:false,deleted:false,conflict:false};
  this.docs.set(id,document);this.meta.set(id,meta);await this.enqueue(()=>setMany([[this.dataKey(id),document],[this.metaKey(id),meta]]));this.emit();
 }
 async useRemote(id:string){try{await this.pull(id,this.meta.get(id)?.mutationId,true);}catch(error){if(error instanceof SyncError&&error.status===404){this.docs.delete(id);this.meta.delete(id);await this.enqueue(()=>delMany([this.dataKey(id),this.metaKey(id)]));}else throw error;}this.emit({phase:"saved",message:""});}
 async keepCopy(id:string,locale:Locale="sr"){
  const suffix=createTranslator(locale)("lokalna kopija");
  const document=this.docs.get(id);if(!document)throw new Error("Nema lokalne kopije.");
  if(document.kind==="project"){const project={...document.data,id:crypto.randomUUID(),name:`${document.data.name.slice(0,200-suffix.length-3)} — ${suffix}`,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};await this.saveProject(project);await this.useRemote(id);}
  else throw new Error("Preuzmi Playground arhivu prije preuzimanja verzije s naloga.");
  await this.sync();
 }
 async ensureSynced(id?:string){await this.writes;await this.sync();if(this.failed.size||[...this.meta.entries()].some(([key,meta])=>(!id||key===id)&&meta.dirty))throw new Error("Izmjene još nisu sačuvane na nalogu. Provjeri vezu ili razriješi različite verzije rada.");return id?this.meta.get(id)?.revision:null;}
 revision(id:string){return this.meta.get(id)?.revision??null;}
 isDirty(id:string){return !!this.meta.get(id)?.dirty;}
 async clearAccountCache(){if(!this.owner)return;await this.writes;const stored=(await keys()).filter(key=>typeof key==="string"&&key.startsWith(this.prefix()));await delMany(stored);}
}
