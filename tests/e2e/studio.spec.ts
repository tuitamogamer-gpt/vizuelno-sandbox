import { test, expect, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function login(page:Page){await page.goto("/pristup");await page.getByLabel("Pristupni kod",{exact:true}).fill(process.env.ACCESS_CODE!);await page.getByRole("button",{name:"Uđi u studio"}).click();await expect(page).toHaveURL(/\/studio$/);await expect(page.getByRole("heading",{name:"Tvoj prostor za dobre ideje."})).toBeVisible();}
test("locked pages, wrong code, same-origin protection, login and logout",async({page,request})=>{
  await page.goto("/studio");await expect(page).toHaveURL(/\/pristup$/);
  expect((await request.get("/api/ai/status")).status()).toBe(401);
  expect((await request.post("/api/auth/login",{headers:{origin:"https://other.example"},data:{code:"wrong"}})).status()).toBe(403);
  await page.getByLabel("Pristupni kod",{exact:true}).fill("incorrect-code");await page.getByRole("button",{name:"Uđi u studio"}).click();await expect(page.locator("#login-error")).toContainText("Kod nije ispravan");
  await login(page);expect((await page.request.get("/api/ai/status")).status()).toBe(200);
  const cookies=await page.context().cookies();expect(cookies.find(c=>c.name==="vk_session")?.httpOnly).toBe(true);
  await page.getByRole("button",{name:"Odjavi se"}).click();await expect(page).toHaveURL(/\/pristup$/);await page.goto("/studio");await expect(page).toHaveURL(/\/pristup$/);
});
test("student edits persist, export/import round trips and removal only affects the selected project",async({page})=>{
  await login(page);await page.getByRole("button",{name:"Novi projekat",exact:true}).click();await page.getByLabel("Radni naziv projekta").fill("Studio List");await page.getByLabel("Ime i prezime",{exact:true}).fill("Student Test");await page.getByRole("button",{name:"Kreiraj projekat",exact:true}).click();
  await page.getByLabel("Tvoja ideja, ukratko").fill("Lokalni studio za biljke i odgovornu svakodnevicu.");await page.getByLabel("Kome se obraćaš?").fill("Ljubiteljima zelenila u malim stanovima.");
  await page.getByRole("button",{name:"Strategija",exact:false}).click();await page.getByLabel("Vizija",{exact:true}).fill("Zeleniji dom za svakoga.");await page.getByLabel("Misija",{exact:true}).fill("Uzgajamo biljke za male prostore.");await expect(page.getByRole("status").filter({hasText:"Lokalno sačuvano"})).toBeVisible();
  await page.reload();await page.getByRole("button",{name:"Otvori projekat Studio List"}).click();await expect(page.getByLabel("Tvoja ideja, ukratko")).toHaveValue("Lokalni studio za biljke i odgovornu svakodnevicu.");
  await page.getByRole("button",{name:"Paleta boja",exact:false}).click();await page.getByLabel("HEX boje 1").fill("#123456");await page.getByLabel("Zašto baš ove boje?").fill("Tamna plava daje kontrast krem pozadini.");await expect(page.locator(".board-primary")).toHaveCSS("background-color","rgb(18, 52, 86)");
  await page.getByRole("button",{name:"Izvezi",exact:true}).click();const downloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"Projekat za nastavak (.json)"}).click();const download=await downloadPromise;const path=await download.path();const json=JSON.parse(await readFile(path!,"utf8"));expect(json.project.colors[0].hex).toBe("#123456");expect(json.project.vision).toBe("Zeleniji dom za svakoga.");expect(json.project.aiRequest).toBeNull();
  await page.getByLabel("Uvezi Forma projekat").setInputFiles({name:"backup.forma.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(json))});await expect(page.getByLabel("Tvoja ideja, ukratko")).toHaveValue(json.project.description);
  await page.getByRole("button",{name:"Nazad na projekte"}).click();await expect(page.locator(".project-card")).toHaveCount(2);
  await page.getByRole("button",{name:"Opcije projekta Studio List"}).first().click();await page.getByRole("button",{name:"Obriši projekat",exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:"Obriši projekat",exact:true}).click();await expect(page.locator(".project-card")).toHaveCount(1);
});
test("invalid backups do not overwrite work; sample exports to printable document and layouts fit mobile",async({page})=>{
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto("/pristup");await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:"artifacts/login-desktop.png",fullPage:true,animations:"disabled"});await login(page);await page.screenshot({path:"artifacts/dashboard-desktop.png",fullPage:true,animations:"disabled"});
  await page.getByLabel("Uvezi Forma projekat").setInputFiles({name:"bad.json",mimeType:"application/json",buffer:Buffer.from('{"format":"wrong"}')});await expect(page.getByRole("status")).toContainText("nije ispravan Forma projekat");
  await page.getByRole("button",{name:"Zatvori obavještenje"}).click();await page.getByRole("button",{name:/EDUKATIVNI PRIMJER/}).click();await expect(page.getByRole("heading",{name:"Bora",exact:true})).toBeVisible();
  await page.getByRole("button",{name:/Tipografija/}).click();await page.screenshot({path:"artifacts/editor-desktop.png",fullPage:true,animations:"disabled"});
  await page.getByRole("button",{name:/Pregled i izvoz/}).click();await page.evaluate(()=>{window.print=()=>document.body.setAttribute("data-printed","true");});await page.getByRole("button",{name:"Izvezi dokument / PDF"}).click();await expect(page.locator("body")).toHaveAttribute("data-printed","true");await expect(page.locator(".print-report")).toContainText("07 / Proces i izvori");await page.pdf({path:"artifacts/example-identity.pdf",format:"A4",printBackground:true,preferCSSPageSize:true});
  await page.setViewportSize({width:390,height:844});await page.getByRole("button",{name:/Polazište/}).click();await page.screenshot({path:"artifacts/editor-mobile.png",fullPage:true,animations:"disabled"});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole("button",{name:"Otvori navigaciju"}).click();await page.getByRole("button",{name:"Pregled",exact:true}).click();await page.screenshot({path:"artifacts/dashboard-mobile.png",fullPage:true,animations:"disabled"});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole("button",{name:"Otvori navigaciju"}).click();await page.getByRole("button",{name:"Playground",exact:true}).click();await expect(page.getByText("Modeli su pripremljeni. Generisanje se aktivira",{exact:false})).toBeVisible();expect(errors).toEqual([]);
});
async function mockImages(page:Page) {
  const submissions:Array<{model:string;aspect:string;prompt:string;requestId:string}>=[];
  const quotes:Array<{model:string;aspect:string;prompt:string}>=[];
  await page.route("**/api/ai/status",route=>route.fulfill({json:{available:true}}));
  await page.route("**/api/ai/quote",route=>{quotes.push(route.request().postDataJSON());return route.fulfill({json:{token:"mock-quote",requestId:crypto.randomUUID(),expiresAt:Date.now()+60_000,price:0.07}});});
  await page.route("**/api/ai/generate",route=>{submissions.push(route.request().postDataJSON());return route.fulfill({json:{id:`media_mock-${submissions.length}`,token:`mock-job-${submissions.length}`,status:"queued"}});});
  await page.route("**/api/ai/job",route=>route.fulfill({json:{status:"completed",charge:0.065}}));
  const png=await page.evaluate(()=>{const c=document.createElement("canvas");c.width=32;c.height=32;const ctx=c.getContext("2d")!;ctx.fillStyle="#244D3E";ctx.fillRect(0,0,32,32);ctx.fillStyle="#DD6846";ctx.fillRect(8,8,16,16);return c.toDataURL("image/png").split(",")[1];});
  await page.route("**/api/ai/result",route=>route.fulfill({contentType:"image/png",body:Buffer.from(png,"base64")}));
  return {submissions,quotes};
}
test("visual steps quote the chosen model, preserve independent outputs and export without capabilities",async({page})=>{
  const {submissions,quotes}=await mockImages(page);
  await login(page);await page.getByRole("button",{name:/EDUKATIVNI PRIMJER/}).click();await page.getByRole("button",{name:/Logotip/}).click();
  await expect(page.locator('.editor input[type="file"]')).toHaveCount(0);
  await page.getByRole("button",{name:"GPT Image 2.5 OpenAI · Sunburst",exact:true}).click();
  await page.getByRole("button",{name:"Provjeri cijenu",exact:true}).click();await expect(page.getByText("$0.0700")).toBeVisible();expect(submissions).toHaveLength(0);
  await page.getByRole("button",{name:"Ideogram 4.5 Ideogram",exact:true}).click();await expect(page.getByRole("button",{name:"Generiši vizual",exact:true})).not.toBeVisible();
  await page.getByRole("button",{name:"Provjeri cijenu",exact:true}).click();await page.getByRole("button",{name:"Generiši vizual",exact:true}).click();
  await expect(page.locator('.editor .generation-result img')).toBeVisible();expect(submissions).toHaveLength(1);expect(submissions[0].model).toBe("ideogram-4.5");expect(quotes.map(q=>q.model)).toEqual(["gpt-image-2.5","ideogram-4.5"]);
  await page.getByRole("button",{name:"Postavi kao logotip"}).click();await expect(page.locator(".board-primary img")).toHaveAttribute("src",/^data:image\/webp;base64,/);
  await page.getByRole("button",{name:/Paleta boja/}).click();await page.getByRole("button",{name:"Seedream 5 Pro ByteDance · 5.0 Pro",exact:true}).click();await page.getByRole("button",{name:"Provjeri cijenu",exact:true}).click();await page.getByRole("button",{name:"Generiši vizual",exact:true}).click();await expect(page.locator('.editor .generation-result img')).toBeVisible();
  expect(submissions[1].model).toBe("seedream-5-pro");expect(submissions[1].aspect).toBe("4:3");
  await expect(page.getByRole("status").filter({hasText:"Lokalno sačuvano"})).toBeVisible();
  await page.reload();await page.getByRole("button",{name:"Otvori projekat Bora"}).click();await page.getByRole("button",{name:/Logotip/}).click();await expect(page.locator('.editor .generation-result img')).toBeVisible();expect(submissions).toHaveLength(2);
  await page.getByRole("button",{name:"Izvezi",exact:true}).click();const downloaded=page.waitForEvent("download");await page.getByRole("button",{name:"Projekat za nastavak (.json)"}).click();const path=await (await downloaded).path();const backup=JSON.parse(await readFile(path!,"utf8"));
  expect(backup.project.visuals.logo.result.input.model).toBe("ideogram-4.5");expect(backup.project.visuals.palette.result.input.model).toBe("seedream-5-pro");expect(backup.project.visuals.logo.job).toBeNull();expect(backup.project.visuals.logo.request).toBeNull();expect(JSON.stringify(backup)).not.toContain("mock-job");
  await page.getByRole("button",{name:/Primjena/}).click();await expect(page.locator(".editor").getByLabel("Opis vizuala",{exact:false})).toHaveValue(/poslovnog memoranduma/);await page.getByRole("tab",{name:"Društvena objava"}).click();await expect(page.locator(".editor").getByLabel("Opis vizuala",{exact:false})).toHaveValue(/društvene objave/);
});
test("Playground works without a project, compares models, persists history and transfers a result",async({page})=>{
  const {submissions}=await mockImages(page);const errors:string[]=[];page.on("pageerror",error=>errors.push(error.name));
  await login(page);await page.getByRole("button",{name:"Playground",exact:true}).click();
  await page.getByRole("button",{name:"Plakat",exact:true}).click();await page.getByRole("button",{name:"3:4",exact:true}).click();
  await page.getByRole("button",{name:"Provjeri cijenu",exact:true}).click();await page.getByRole("button",{name:"Generiši vizual",exact:true}).click();await expect(page.locator(".experiment-card")).toHaveCount(1);
  await page.getByRole("button",{name:"GPT Image 2.5 OpenAI · Sunburst",exact:true}).click();await page.getByRole("button",{name:"Provjeri cijenu",exact:true}).click();await page.getByRole("button",{name:"Generiši vizual",exact:true}).click();await expect(page.locator(".experiment-card")).toHaveCount(2);
  expect(submissions[0].model).toBe("nano-banana-2.1");expect(submissions[1].model).toBe("gpt-image-2.5");expect(submissions[0].prompt).toBe(submissions[1].prompt);
  await page.locator(".experiment-image").first().click();await page.locator(".experiment-image").last().click();await page.getByRole("button",{name:"Uporedi 2/2"}).click();await expect(page.getByRole("dialog").locator("img")).toHaveCount(2);await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.screenshot({path:"artifacts/playground-desktop.png",fullPage:true,animations:"disabled"});
  await page.reload();await page.getByRole("button",{name:"Playground",exact:true}).click();await expect(page.locator(".experiment-card")).toHaveCount(2);expect(submissions).toHaveLength(2);
  await page.getByRole("button",{name:"Pregled",exact:true}).click();await page.getByRole("button",{name:/EDUKATIVNI PRIMJER/}).click();await page.getByRole("button",{name:"Playground",exact:true}).click();await page.getByRole("button",{name:"Dodaj vizual projektu",exact:true}).click();await page.getByRole("dialog").getByRole("button",{name:"Dodaj projektu",exact:true}).click();
  await page.getByRole("button",{name:/Moji projekti/}).click();await page.getByRole("button",{name:"Otvori projekat Bora"}).click();await expect(page.locator(".board-primary img")).toBeVisible();
  await page.getByRole("button",{name:"Playground",exact:true}).click();await page.setViewportSize({width:390,height:844});await page.screenshot({path:"artifacts/playground-mobile.png",fullPage:true,animations:"disabled"});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test("teacher setup points to the real Vercel project and exposes no client key input",async({page})=>{
  await login(page);await page.getByRole("button",{name:"API postavke",exact:true}).click();
  await expect(page.getByRole("link",{name:/Otvori unos ključa/})).toHaveAttribute("href","https://vercel.com/tuitamogamer-7851s-projects/vizuelno-komuniciranje/settings/environment-variables");
  await page.route("**/api/ai/connection",route=>route.fulfill({status:503,json:{error:"PIKA_API_KEY još nije dodat u ovom deploymentu."}}));
  await page.getByRole("button",{name:"Provjeri Pika vezu"}).click();await expect(page.getByRole("status")).toContainText("PIKA_API_KEY još nije dodat");await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await page.goto("/postavke");await expect(page.getByRole("heading",{name:"Ključ unosiš direktno na Vercelu."})).toBeVisible();
});
test("an interrupted submit resumes the same saved request after reload, and known rejection can be corrected",async({page})=>{
  await mockImages(page);
  const submitted:Array<{requestId:string;model:string;prompt:string}>=[];
  await page.unroute("**/api/ai/generate");
  await page.route("**/api/ai/generate",route=>{
    submitted.push(route.request().postDataJSON());
    if(submitted.length===1)return route.abort("failed");
    if(submitted.length===3)return route.fulfill({status:409,json:{error:"Cijena se promijenila.",uncertain:false}});
    return route.fulfill({json:{id:"media_retry",token:"mock-job-retry",status:"queued"}});
  });
  await login(page);await page.getByRole("button",{name:"Playground",exact:true}).click();await page.getByRole("button",{name:"Znak",exact:true}).click();await page.getByRole("button",{name:"Provjeri cijenu",exact:true}).click();await page.getByRole("button",{name:"Generiši vizual",exact:true}).click();await expect(page.getByRole("button",{name:"Nastavi isti zahtjev"})).toBeVisible();
  await page.reload();await page.getByRole("button",{name:"Playground",exact:true}).click();await page.getByRole("button",{name:"Nastavi isti zahtjev"}).click();await expect(page.locator(".experiment-card")).toHaveCount(1);expect(submitted[0]).toEqual(submitted[1]);
  await page.getByRole("button",{name:"Provjeri cijenu",exact:true}).click();await page.getByRole("button",{name:"Generiši vizual",exact:true}).click();await expect(page.locator(".playground-console").getByRole("alert")).toContainText("Zahtjev nije poslat modelu.");await expect(page.getByRole("button",{name:"Nastavi isti zahtjev"})).not.toBeVisible();await expect(page.getByRole("button",{name:"Provjeri cijenu",exact:true})).toBeEnabled();await expect(page.locator(".experiment-card")).toHaveCount(1);
});
