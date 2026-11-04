import test from "node:test";
import assert from "node:assert/strict";
import { strFromU8, unzipSync, zipSync } from "fflate";
import { exampleProject } from "../src/lib/project";
import { amendGeneration, GenerationResult, HISTORY_LIMIT, mergeExperiments, newGeneration, playgroundSchema, resultSchema } from "../src/lib/generation";
import { parseLocation, resolveLocation, studioUrl } from "../src/lib/navigation";
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
test("three visual variants rotate and can be restored without losing the current choice",()=>{
  let value=newGeneration();for(const id of ["a","b","c","d"])value=amendGeneration(value,{result:result(id)});
  assert.deepEqual([value.result?.id,...value.alternatives.map(item=>item.id)],["d","c","b"]);
  value=amendGeneration(value,{result:value.alternatives[1],job:null,request:null});
  assert.deepEqual([value.result?.id,...value.alternatives.map(item=>item.id)],["b","d","c"]);
  value=amendGeneration(value,{result:value.result});assert.equal(value.alternatives.length,2);
  assert.equal(amendGeneration(value,{result:result("e")},false).alternatives.length,0);
});
test("automatic gallery rotation retains favorites and deduplicates repeated provider results",()=>{
  const history=Array.from({length:HISTORY_LIMIT},(_,i)=>result(String(i)));
  const next=mergeExperiments(history,[result("new"),result("new")],["23"]);
  assert.equal(next.length,HISTORY_LIMIT);assert.equal(next[0].id,"new");assert.ok(next.some(item=>item.id==="23"));assert.ok(!next.some(item=>item.id==="22"));
  assert.deepEqual(mergeExperiments(history,[result("new")],history.map(item=>item.id)),history);
  assert.equal(playgroundSchema.parse({generation:newGeneration(),history}).starred.length,0);
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
  const packed=zipSync(identityKitFiles(p)),files=unzipSync(packed),paths=Object.keys(files);
  for(const filename of ["projekat.forma.json","knjiga-identiteta.html","web-stranica.html","logotip.svg","logotip.png","paleta.svg","dizajn-tokeni.json","vizuali/logo-1.png","vizuali/logo-2.png","vizuali/logo-2-brief.txt","PROCITAJ-ME.txt"])assert.ok(paths.some(path=>path.endsWith('/'+filename)),filename);
  const backup=JSON.parse(strFromU8(files[paths.find(path=>path.endsWith("projekat.forma.json"))!]));
  assert.equal(backup.project.visuals.logo.job,null);assert.equal(backup.project.visuals.logo.request,null);assert.equal(backup.project.visuals.logo.alternatives[0].id,"previous");
  const all=Object.values(files).map(file=>strFromU8(file)).join("\n");assert.ok(!all.includes("private-job-capability"));assert.ok(!all.includes("private-quote-capability"));
  const html=identityBookHtml({...p,name:'<script>alert("x")</script>',sources:'<img src=x onerror="x">'});assert.ok(!html.includes("<script>"));assert.ok(!html.includes("<img src=x"));assert.ok(html.includes("&lt;script&gt;"));
});
