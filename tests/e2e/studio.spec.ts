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
  await page.getByRole("button",{name:"Otvori navigaciju"}).click();await page.getByRole("button",{name:"AI atelje",exact:true}).click();await expect(page.getByText("Generisanje čeka nastavnikov API ključ.",{exact:false})).toBeVisible();expect(errors).toEqual([]);
});
test("AI quote, explicit single submit, polling, result and adoption work without a paid provider call",async({page})=>{
  let submissions=0;
  await page.route("**/api/ai/status",route=>route.fulfill({json:{available:true,model:"Nano Banana 2"}}));
  await page.route("**/api/ai/quote",route=>route.fulfill({json:{token:"mock-quote",price:0.07,model:"Nano Banana 2"}}));
  await page.route("**/api/ai/generate",route=>{submissions++;return route.fulfill({json:{id:"media_mock",token:"mock-job",status:"queued"}});});
  await page.route("**/api/ai/job",route=>route.fulfill({json:{id:"media_mock",status:"completed"}}));
  const png=await page.evaluate(()=>{const c=document.createElement("canvas");c.width=16;c.height=16;const ctx=c.getContext("2d")!;ctx.fillStyle="#244D3E";ctx.fillRect(0,0,16,16);return c.toDataURL("image/png").split(",")[1];});
  await page.route("**/api/ai/result",route=>route.fulfill({contentType:"image/png",body:Buffer.from(png,"base64")}));
  await login(page);await page.getByRole("button",{name:/EDUKATIVNI PRIMJER/}).click();await page.getByRole("button",{name:"AI atelje",exact:true}).click();
  await page.getByRole("button",{name:"Provjeri cijenu skice"}).click();await expect(page.getByText("$0.0700")).toBeVisible();expect(submissions).toBe(0);
  await page.getByRole("button",{name:"Generiši jednu skicu"}).click();await expect(page.getByAltText("AI skica za Bora")).toBeVisible();expect(submissions).toBe(1);
  await page.getByRole("button",{name:"Koristi kao logotip"}).click();await page.getByRole("button",{name:/Moji projekti/}).click();await page.getByRole("button",{name:"Otvori projekat Bora"}).click();await expect(page.locator(".board-primary img")).toHaveAttribute("src",/^data:image\/webp;base64,/);
  await page.reload();await page.getByRole("button",{name:"Otvori projekat Bora"}).click();await expect(page.locator(".board-primary img")).toBeVisible();expect(submissions).toBe(1);
});
