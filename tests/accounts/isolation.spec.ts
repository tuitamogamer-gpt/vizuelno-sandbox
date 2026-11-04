import {test,expect,api,origin} from "./fixtures";
import {exampleProject,newProject} from "../../src/lib/project";
import {newGeneration} from "../../src/lib/generation";
const pixel="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZWQAAAAASUVORK5CYII=";

test("owned revisions, image ownership, frozen submissions and teacher-only feedback",async({request,persona})=>{
 const student=await persona("Ana Student"),other=await persona("Marko Student"),teacher=await persona("Nastavnik",{teacher:true});
 const p=exampleProject(),mutationId=crypto.randomUUID(),path=`/api/workspace/documents/${p.id}`;
 expect((await request.get(origin+path)).status()).toBe(401);
 expect((await api(request,student,"/api/course/students")).status()).toBe(403);
 expect((await api(request,student,"/api/course/submissions?scope=class")).status()).toBe(403);
 expect((await api(request,teacher,"/api/course/students")).status()).toBe(200);
 const asset=await api(request,student,"/api/workspace/assets","POST",{image:pixel});expect(asset.status()).toBe(200);const {hash}=await asset.json();
 expect(hash).toMatch(/^[a-f0-9]{64}$/);
 expect((await api(request,other,`/api/workspace/assets/${hash}`)).status()).toBe(404);
 const imageProject={...p,logoImage:`asset:${hash}`};
 const put=()=>api(request,student,path,"PUT",{revision:null,mutationId,document:{kind:"project",data:imageProject}});
 expect((await put()).status()).toBe(200);expect((await(await put()).json()).revision).toBe(1);
 expect((await api(request,other,path)).status()).toBe(404);
 const teacherDraft=await api(request,teacher,path);expect(teacherDraft.status()).toBe(404);
 expect((await(await api(request,other,"/api/workspace/documents")).json()).documents).toHaveLength(0);
 const foreign={...imageProject,id:crypto.randomUUID()};expect((await api(request,other,`/api/workspace/documents/${foreign.id}`,"PUT",{revision:null,mutationId:crypto.randomUUID(),document:{kind:"project",data:foreign}})).status()).toBe(422);
 const submit=()=>api(request,student,"/api/course/submissions","POST",{projectId:p.id,revision:1});
 const sent=await submit();expect(sent.status()).toBe(200);const {submission}=await sent.json();expect((await(await submit()).json()).submission.id).toBe(submission.id);
 expect((await api(request,other,`/api/course/submissions/${submission.id}`)).status()).toBe(404);
 expect((await api(request,other,`/api/course/submissions/${submission.id}/assets/${hash}`)).status()).toBe(404);
 expect((await api(request,teacher,`/api/course/submissions/${submission.id}/assets/${hash}`)).status()).toBe(200);
 const next={...imageProject,name:"Bora dorada"};
 expect((await api(request,student,path,"PUT",{revision:1,mutationId:crypto.randomUUID(),document:{kind:"project",data:next}})).status()).toBe(200);
 expect((await api(request,student,path,"PUT",{revision:1,mutationId:crypto.randomUUID(),document:{kind:"project",data:{...next,name:"Stari uređaj"}}})).status()).toBe(409);
 expect((await(await api(request,student,path)).json()).document.data.name).toBe("Bora dorada");
 const frozen=await(await api(request,teacher,`/api/course/submissions/${submission.id}`)).json();expect(frozen.project.name).toBe("Bora");
 const feedback={status:"changes_requested",comment:"Pojednostavi znak i provjeri kontrast.",criteria:{identity:"needs_work",concept:"clear"}};
 expect((await api(request,other,`/api/course/submissions/${submission.id}/review`,"POST",feedback)).status()).toBe(403);
 expect((await api(request,teacher,`/api/course/submissions/${submission.id}/review`,"POST",feedback)).status()).toBe(200);
 expect((await(await api(request,student,"/api/course/submissions")).json()).submissions[0].comment).toBe(feedback.comment);
 const incomplete=newProject("Nedovršeno","Ana"),incPath=`/api/workspace/documents/${incomplete.id}`;
 await api(request,student,incPath,"PUT",{revision:null,mutationId:crypto.randomUUID(),document:{kind:"project",data:incomplete}});
 expect((await api(request,student,"/api/course/submissions","POST",{projectId:incomplete.id,revision:1})).status()).toBe(422);
 const pending={...exampleProject(),visuals:{logo:{...newGeneration(),request:{model:"nano-banana-2.1",aspect:"1:1",prompt:"A test visual pending generation",quoteToken:"test-only",requestId:crypto.randomUUID()}}}};
 await api(request,student,`/api/workspace/documents/${pending.id}`,"PUT",{revision:null,mutationId:crypto.randomUUID(),document:{kind:"project",data:pending}});
 expect((await api(request,student,"/api/course/submissions","POST",{projectId:pending.id,revision:1})).status()).toBe(422);
 const deletion={revision:2,mutationId:crypto.randomUUID()};expect((await api(request,student,path,"DELETE",deletion)).status()).toBe(200);
 expect((await api(request,student,path)).status()).toBe(404);expect((await api(request,teacher,`/api/course/submissions/${submission.id}/assets/${hash}`)).status()).toBe(200);
 expect((await api(request,student,path,"PUT",{revision:2,mutationId:crypto.randomUUID(),document:{kind:"project",data:next}})).status()).toBe(409);
});

test("verified Google session still requires course enrollment, OAuth state and logout revocation",async({request,persona,page,context})=>{
 const newcomer=await persona("Novi student",{enrolled:false}),unverified=await persona("Nepotvrđen",{enrolled:false,verified:false});
 expect((await api(request,newcomer,"/api/workspace/documents")).status()).toBe(401);
 expect((await api(request,newcomer,"/api/account/enroll","POST",{code:"wrong",studentNumber:"",group:""})).status()).toBe(401);
 expect((await api(request,unverified,"/api/account/enroll","POST",{code:process.env.ACCESS_CODE,studentNumber:"",group:""})).status()).toBe(401);
 expect((await api(request,newcomer,"/api/account/enroll","POST",{code:process.env.ACCESS_CODE,studentNumber:"2026/04",group:"Četvrtak"})).status()).toBe(200);
 const profile=await(await api(request,newcomer,"/api/account/profile")).json();expect(profile.account.studentNumber).toBe("2026/04");expect(profile.account.role).toBe("student");
 const forbidden=await request.patch(origin+"/api/account/profile",{headers:{Cookie:`${newcomer.cookie.name}=${newcomer.cookie.value}`,Origin:"https://other.example"},data:{studentNumber:"bad",group:"bad"}});expect(forbidden.status()).toBe(403);
 const oauth=await request.post(origin+"/api/auth/sign-in/social",{headers:{Origin:origin},data:{provider:"google",callbackURL:"/upis"}});expect(oauth.status()).toBe(200);const {url}=await oauth.json();const target=new URL(url);expect(target.origin).toBe("https://accounts.google.com");expect(target.searchParams.get("redirect_uri")).toBe(origin+"/api/auth/callback/google");expect(target.searchParams.get("state")?.length).toBeGreaterThan(10);expect(target.searchParams.get("code_challenge")?.length).toBeGreaterThan(20);
 await context.addCookies([newcomer.cookie]);await page.goto("/studio?view=account");await expect(page.getByRole("heading",{name:"Moj nalog."})).toBeVisible();
 await page.getByRole("button",{name:"Odjavi se"}).click();await expect(page).toHaveURL(/\/pristup$/);
 expect((await api(request,newcomer,"/api/workspace/documents")).status()).toBe(401);
 const keys=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open("keyval-store");r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return new Promise<IDBValidKey[]>((resolve,reject)=>{const r=db.transaction("keyval").objectStore("keyval").getAllKeys();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});});expect(keys.some(key=>String(key).startsWith(`forma:account:${newcomer.id}:`))).toBe(false);
});

test("first Google visit opens enrollment and the course code activates the account",async({page,context,persona})=>{
 const newcomer=await persona("Novi polaznik",{enrolled:false});await context.addCookies([newcomer.cookie]);await page.goto("/studio");await expect(page).toHaveURL(/\/upis$/);await page.getByLabel("Kod predmeta").fill("wrong");await page.getByRole("button",{name:"Pridruži se predmetu"}).click();await expect(page.locator(".enrollment-page").getByRole("alert")).toContainText("Kod predmeta nije ispravan");await page.getByLabel("Kod predmeta").fill(process.env.ACCESS_CODE!);await page.getByLabel("Broj indeksa",{exact:false}).fill("24/2026");await page.getByRole("button",{name:"Pridruži se predmetu"}).click();await expect(page).toHaveURL(/\/studio$/);await expect(page.getByRole("button",{name:"Moj nalog",exact:true})).toBeVisible();
});
