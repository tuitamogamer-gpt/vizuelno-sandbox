import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { newProject, exampleProject, projectSchema, contrastRatio, progress, backupSchema } from "../src/lib/project";
import { escapeHtml, landingHtml, logoSvg } from "../src/lib/export";
import { createSession, validSession, verifyCode, signTicket, readTicket, sameOrigin } from "../src/lib/auth";
import { allowAttempt } from "../src/lib/rate-limit";
import { imageInput, safeMediaUrl, quoteImage, pikaRequest } from "../src/lib/pika";

test("course requirements drive completion, while blank work has no completed steps",()=>{
  assert.equal(progress(newProject()),0); assert.equal(progress(exampleProject()),100);
  assert.equal(progress({...exampleProject(),goals:["one","two",""]}),88);
  assert.equal(projectSchema.parse(exampleProject()).colors.length,3);
});
test("import rejects executable images, CSS injection, excessive colors and invalid IDs",()=>{
  const p=exampleProject();
  for(const patch of [{logoImage:'data:image/svg+xml;base64,PHN2Zz4='},{colors:[{hex:'red;display:none',name:'bad'},{hex:'#ffffff',name:'ok'}]},{id:'../other'},{headingFont:'Arial; color:red'},{goals:Array(6).fill('goal')}]) assert.equal(projectSchema.safeParse({...p,...patch}).success,false);
  assert.equal(backupSchema.safeParse({format:"forma-project",version:1,project:p}).success,true);
});
test("contrast ratios follow WCAG luminance formula",()=>{
  assert.equal(contrastRatio("#000000","#FFFFFF"),21);
  assert.equal(contrastRatio("#123456","#123456"),1);
  assert.ok(contrastRatio("#FFFFFF","#FFFF00")<1.1);
});
test("HTML and SVG exports escape student-provided text",()=>{
  const p={...exampleProject(),name:'<script>alert("x")</script>',description:'</p><img src=x onerror=alert(1)>',logoText:'<x>'};
  assert.ok(!landingHtml(p).includes('<script>'));
  assert.ok(!landingHtml(p).includes('<img src=x'));
  assert.ok(logoSvg(p).includes('&lt;x&gt;'));
  assert.equal(escapeHtml('"<&'),"&quot;&lt;&amp;");
});
test("server sessions and AI capabilities reject tampering and cross-session use",async()=>{
  process.env.SESSION_SECRET=randomBytes(48).toString("hex"); process.env.ACCESS_CODE="test-only-code";
  assert.equal(verifyCode("wrong"),false);assert.equal(verifyCode("test-only-code"),true);
  const token=await createSession(); assert.equal(await validSession(token),true);assert.equal(await validSession(token+'x'),false);
  const receipt=await signTicket("student-a","job",{jobId:"media_test"});
  assert.equal((await readTicket(receipt,"student-a","job")).jobId,"media_test");
  await assert.rejects(()=>readTicket(receipt,"student-b","job"));
  await assert.rejects(()=>readTicket(receipt,"student-a","quote"));
});
test("same-origin validation works behind Next's internal listen address",()=>{
  assert.equal(sameOrigin(new Request("http://0.0.0.0:3001/api/auth/login",{headers:{host:"localhost:3001",origin:"http://localhost:3001"}})),true);
  assert.equal(sameOrigin(new Request("https://school.example/api/auth/login",{headers:{host:"school.example",origin:"https://evil.example"}})),false);
  assert.equal(sameOrigin(new Request("https://school.example/api/auth/login")),false);
});
test("per-instance login limiter expires and enforces limits",()=>{
  const key=randomBytes(12).toString("hex");
  assert.equal(allowAttempt(key,2,1000),true);assert.equal(allowAttempt(key,2,1001),true);assert.equal(allowAttempt(key,2,1002),false);assert.equal(allowAttempt(key,2,901001),true);
});
test("Pika uses one fixed-size image and only trusted media hosts",()=>{
  assert.deepEqual(imageInput("brief"),{prompt:"brief",num_images:1,aspect_ratio:"1:1",output_format:"png",resolution:"1K",thinking_level:"minimal"});
  assert.equal(safeMediaUrl("https://cdn.pika.art/v2/media/example/output.png").hostname,"cdn.pika.art");
  for(const url of ["http://127.0.0.1/","https://evil.example/image.png","https://cdn.pika.art.evil.example/img.png","https://api.dev.pika.art/billing/balance","https://x:secret@cdn.pika.art/img.png"])assert.throws(()=>safeMediaUrl(url));
});
test("Pika quote checks credit and configured per-image ceiling without submitting",async()=>{
  const original=global.fetch;const previous=process.env.PIKA_API_KEY;process.env.PIKA_API_KEY="test-only-provider-key";
  let price=50000,balance=100000;const calls:string[]=[];
  global.fetch=async(input)=>{const url=String(input);calls.push(url);return Response.json(url.includes("/quote")?{micro_usd:price,sell_usd:"0.05"}:{balance_micro_usd:balance,postpaid:null});};
  try{
    assert.equal((await quoteImage("A thoughtful logo concept")).micro_usd,50000);
    balance=10;await assert.rejects(()=>quoteImage("A thoughtful logo concept"),/kredit/);
    balance=1000000;price=500000;await assert.rejects(()=>quoteImage("A thoughtful logo concept"),/dozvoljeni/);
    assert.ok(calls.every(url=>url.includes("/quote")||url.includes("/balance")));
  }finally{global.fetch=original;if(previous===undefined)delete process.env.PIKA_API_KEY;else process.env.PIKA_API_KEY=previous;}
});
test("known failed Pika submissions remain terminal jobs, not uncertain network attempts",async()=>{
  const original=global.fetch;const previous=process.env.PIKA_API_KEY;process.env.PIKA_API_KEY="test-only-provider-key";
  global.fetch=async()=>Response.json({id:"media_rejected",status:"failed",error:{code:"insufficient_balance"}},{status:403});
  try{const job=await pikaRequest("/v1/media/google/gemini-3.1-flash-image/text-to-image",{method:"POST",body:imageInput("A thoughtful logo concept"),idempotencyKey:"test-only-idempotency"});assert.equal(job.status,"failed");assert.equal(job.id,"media_rejected");}
  finally{global.fetch=original;if(previous===undefined)delete process.env.PIKA_API_KEY;else process.env.PIKA_API_KEY=previous;}
});
