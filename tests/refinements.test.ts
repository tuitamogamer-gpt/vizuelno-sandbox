import test from "node:test";
import assert from "node:assert/strict";
import { strFromU8, unzipSync, zipSync } from "fflate";
import { exampleProject } from "../src/lib/project";
import { amendGeneration, GenerationResult, generationHistory, generationSchema, imageExtension, isPending, mergeExperiments, newGeneration, playgroundSchema, removeFromHistory, resultSchema } from "../src/lib/generation";
import { parseLocation, resolveLocation, studioUrl } from "../src/lib/navigation";
import { nextTabIndex } from "../src/lib/tabs";
import { importPlayground } from "../src/lib/storage";
import { identityKitFiles, identityBookHtml } from "../src/lib/identity-kit";
const result=(id:string):GenerationResult=>({id,image:"data:image/png;base64,aGVsbG8=",input:{model:"ideogram-4.5",aspect:"1:1",prompt:`Original visual identity concept ${id}`},createdAt:new Date().toISOString()});

test("deep links restore the chosen project and step, with safe fallbacks",()=>{
  const project=exampleProject(),location={view:"editor" as const,projectId:project.id,step:5};
  assert.deepEqual(parseLocation(studioUrl(location).split("?")[1]),location);
  assert.deepEqual(resolveLocation(location,[project.id]),location);
  assert.deepEqual(resolveLocation(location,[]),{view:"projects",projectId:null,step:0});
  for(const step of ["-1","0","8","NaN","2.5"])assert.equal(parseLocation(`view=editor&step=${step}&project=not-an-id`).step,0);
  assert.equal(parseLocation("view=unknown").view,"home");
});
test("tab keys wrap around, jump to the ends and ignore other keys",()=>{
  assert.deepEqual(["ArrowRight","ArrowLeft","ArrowDown","ArrowUp","Home","End","Enter"," "].map(key=>nextTabIndex(key,0,3)),[1,2,1,2,0,2,-1,-1]);
  assert.equal(nextTabIndex("ArrowRight",2,3),0);assert.equal(nextTabIndex("ArrowLeft",1,2),0);
});
test("all project images survive generation, restores, repeated callbacks and schema parsing",()=>{
  let value=newGeneration();for(const id of ["a","b","c","d","e"])value=amendGeneration(value,{result:result(id)});
  assert.deepEqual([value.result?.id,...value.alternatives.map(item=>item.id)],["e","d","c","b","a"]);
  value=amendGeneration(value,{result:value.alternatives[3],job:null,request:null});
  assert.deepEqual([value.result?.id,...value.alternatives.map(item=>item.id)],["a","e","d","c","b"]);
  value=amendGeneration(value,{result:value.result});assert.equal(value.alternatives.length,4);
  assert.equal(generationHistory(generationSchema.parse(value)).length,5);
  assert.equal(amendGeneration(value,{result:result("f")},false).alternatives.length,0);
});
test("removing one history image keeps the others, picks the newest remaining and never revives a job",()=>{
  const dated=(id:string,day:number):GenerationResult=>({...result(id),createdAt:`2026-11-0${day}T12:00:00.000Z`});
  let value=newGeneration();[["a",1],["b",2],["c",3]].forEach(([id,day])=>{value=amendGeneration(value,{result:dated(String(id),Number(day))});});
  value={...value,job:{id:"c",token:"finished-job",status:"completed",input:value.result!.input}};
  const older=removeFromHistory(value,"a");
  assert.deepEqual(generationHistory(older).map(item=>item.id),["c","b"]);assert.equal(older.result?.id,"c");assert.equal(older.job?.id,"c");assert.equal(isPending(older),false);
  const active=removeFromHistory(value,"c");
  assert.equal(active.result?.id,"b");assert.deepEqual(active.alternatives.map(item=>item.id),["a"]);assert.equal(active.job,null);assert.equal(isPending(active),false);
  const restored=amendGeneration(value,{result:value.alternatives.find(item=>item.id==="a"),job:null,request:null});
  assert.equal(removeFromHistory(restored,"a").result?.id,"c");
  const empty=removeFromHistory(removeFromHistory(active,"b"),"a");
  assert.equal(empty.result,null);assert.deepEqual(empty.alternatives,[]);assert.equal(isPending(empty),false);
  assert.deepEqual(removeFromHistory(value,"missing"),value);
  assert.equal(generationSchema.safeParse(active).success,true);
  assert.deepEqual(["data:image/png;base64,AA==","data:image/jpeg;base64,AA==","data:image/webp;base64,AA=="].map(imageExtension),["png","jpg","webp"]);
});
test("Playground retains history beyond 24 images and deduplicates provider retries",()=>{
  const history=Array.from({length:30},(_,i)=>result(String(i)));
  const next=mergeExperiments(history,[result("new"),result("new")]);
  assert.equal(next.length,31);assert.equal(next[0].id,"new");
  for(const old of history)assert.ok(next.some(item=>item.id===old.id));
  assert.equal(playgroundSchema.parse({generation:newGeneration(),history:next}).history.length,31);
  assert.equal(resultSchema.safeParse({...result("bad"),image:""}).success,false);
});
test("Playground archive import merges safely, strips foreign capabilities and keeps an in-flight draft",async()=>{
  const visual=result("archive"),input=visual.input;
  const imported={format:"forma-playground",version:1,history:[visual],starred:[visual.id],generation:{...newGeneration(),...input,result:visual,job:{id:visual.id,token:"foreign-job",status:"completed",input},request:{...input,quoteToken:"foreign-quote",requestId:crypto.randomUUID()}}};
  const file=new File([JSON.stringify(imported)],"archive.json",{type:"application/json"});
  const empty={generation:newGeneration(),history:[],starred:[]};const restored=await importPlayground(file,empty);
  assert.equal(restored.generation.job,null);assert.equal(restored.generation.request,null);assert.deepEqual(restored.starred,[visual.id]);
  const current={generation:{...newGeneration(),prompt:"A draft changed while reading the archive",request:{...input,quoteToken:"current-quote",requestId:crypto.randomUUID()}},history:[{...visual,input:{...input,prompt:"Current saved version must remain intact"}}],starred:[]};
  const merged=await importPlayground(file,()=>current);
  assert.deepEqual(merged.generation,current.generation);assert.equal(merged.history.length,1);assert.equal(merged.history[0].input.prompt,current.history[0].input.prompt);
  await assert.rejects(()=>importPlayground(new File(['{"format":"wrong"}'],"bad.json"),empty),/Forma Playground/);
});
test("identity ZIP includes portable work, visual variants and safe HTML without session tokens",()=>{
  const p=exampleProject(),visual=result("active"),previous=result("previous");
  p.visuals.logo={...newGeneration(),result:visual,alternatives:[previous],job:{id:visual.id,token:"private-job-capability",status:"completed",input:visual.input},request:{...visual.input,quoteToken:"private-quote-capability",requestId:crypto.randomUUID()}};
  p.logoImage=visual.image;
  p.pdfVisualIds=["logo-previous"];
  const packed=zipSync(identityKitFiles(p)),files=unzipSync(packed),paths=Object.keys(files);
  for(const filename of ["projekat.forma.json","knjiga-identiteta.html","web-stranica.html","logotip.svg","logotip.png","paleta.svg","dizajn-tokeni.json","vizuali/logo-1.png","vizuali/logo-2.png","vizuali/logo-2-brief.txt","PROCITAJ-ME.txt"])assert.ok(paths.some(path=>path.endsWith('/'+filename)),filename);
  const backup=JSON.parse(strFromU8(files[paths.find(path=>path.endsWith("projekat.forma.json"))!]));
  assert.deepEqual(backup.project.pdfVisualIds,["logo-previous"]);
  assert.equal(backup.project.visuals.logo.job,null);assert.equal(backup.project.visuals.logo.request,null);assert.equal(backup.project.visuals.logo.alternatives[0].id,"previous");
  const all=Object.values(files).map(file=>strFromU8(file)).join("\n");assert.ok(!all.includes("private-job-capability"));assert.ok(!all.includes("private-quote-capability"));
  const html=identityBookHtml({...p,name:'<script>alert("x")</script>',sources:'<img src=x onerror="x">'});assert.ok(!html.includes("<script>"));assert.ok(!html.includes("<img src=x"));assert.ok(html.includes("&lt;script&gt;"));
});
