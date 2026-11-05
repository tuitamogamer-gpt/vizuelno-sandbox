import {test,expect,api,signIn} from "./fixtures";
import {newGeneration} from "../../src/lib/generation";

test("projects follow a Google account across devices; offline conflicts preserve both versions",async({page,context,browser,persona,request})=>{
 const who=await persona("Ana Petrović");await signIn(context,who);await page.goto("/studio");
 await page.getByRole("button",{name:"Novi projekat",exact:true}).click();await page.getByLabel("Radni naziv projekta").fill("Studio List");await expect(page.getByLabel("Ime i prezime",{exact:true})).toHaveValue("Ana Petrović");await page.getByRole("button",{name:"Kreiraj projekat",exact:true}).click();
 await page.getByLabel("Tvoja ideja, ukratko").fill("Mala knjižara za naš kraj.");
 await expect(page.locator(".cloud-status")).toHaveText("Sačuvano na nalogu");const editorUrl=page.url();const id=new URL(editorUrl).searchParams.get("project")!;
 const second=await browser.newContext(),device=await second.newPage();await signIn(second,who);await device.goto(editorUrl);await expect(device.getByLabel("Tvoja ideja, ukratko")).toHaveValue("Mala knjižara za naš kraj.");
 await second.setOffline(true);await device.getByLabel("Tvoja ideja, ukratko").fill("Moja offline dorada za drugi uređaj.");await expect(device.locator(".cloud-status")).toHaveText("Na ovom uređaju");
 await page.getByLabel("Tvoja ideja, ukratko").fill("Prvi uređaj: susreti čitalaca u knjižari.");await expect(page.locator(".cloud-status")).toHaveText("Sačuvano na nalogu");
 await second.setOffline(false);await expect(device.getByRole("button",{name:"Izaberi verziju"})).toBeVisible();await expect(device.getByLabel("Tvoja ideja, ukratko")).toHaveValue("Moja offline dorada za drugi uređaj.");await device.getByRole("button",{name:"Izaberi verziju"}).click();await device.getByRole("button",{name:"Sačuvaj moje izmjene kao kopiju"}).click();await expect(device.getByRole("dialog")).not.toBeVisible();
 await expect.poll(async()=> (await(await api(request,who,"/api/workspace/documents")).json()).documents.filter((d:{deleted:boolean})=>!d.deleted).length).toBe(2);
 await expect(device.getByLabel("Tvoja ideja, ukratko")).toHaveValue("Prvi uređaj: susreti čitalaca u knjižari.");const docs=(await(await api(request,who,"/api/workspace/documents")).json()).documents;const copy=docs.find((d:{id:string})=>d.id!==id);expect((await(await api(request,who,`/api/workspace/documents/${copy.id}`)).json()).document.data.description).toBe("Moja offline dorada za drugi uređaj.");
 await device.goto("/studio?view=account");await device.getByLabel("Broj indeksa").fill("2026/42");await device.getByRole("button",{name:"Sačuvaj podatke"}).click();await expect(device.getByRole("status")).toContainText("Podaci o predmetu su sačuvani");await device.getByRole("button",{name:"Pregled",exact:true}).click();await device.getByRole("button",{name:"Moj nalog",exact:true}).click();await expect(device.getByLabel("Broj indeksa")).toHaveValue("2026/42");await device.screenshot({path:"artifacts/accounts/account-desktop.png",fullPage:true,animations:"disabled"});await device.setViewportSize({width:390,height:844});expect(await device.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await device.screenshot({path:"artifacts/accounts/account-mobile.png",fullPage:true,animations:"disabled"});
 await second.close();
});

test("students submit frozen work and receive the teacher's contextual review",async({page,context,browser,persona})=>{
 const student=await persona("Ana Dizajn"),teacher=await persona("Profesor Dizajna",{teacher:true});await signIn(context,student);await page.goto("/studio");await page.getByRole("button",{name:/EDUKATIVNI PRIMJER/}).click();await page.getByRole("button",{name:/Pregled i izvoz/}).click();await page.getByRole("button",{name:"Predaj nastavniku na pregled"}).click();await expect(page.getByRole("button",{name:"Ova verzija je već predata"})).toBeDisabled();
 const staff=await browser.newContext(),desk=await staff.newPage();await signIn(staff,teacher);await desk.goto("/studio?view=teacher");await expect(desk.locator(".teacher-submission")).toHaveCount(1);await desk.screenshot({path:"artifacts/accounts/teacher-desktop.png",fullPage:true,animations:"disabled"});await desk.locator(".teacher-submission").click();await expect(desk.getByTitle("Knjiga identiteta predate verzije")).toBeVisible();
 await desk.getByRole("button",{name:"PDF predate verzije",exact:true}).click();
 const pdfDialog=desk.getByRole("dialog",{name:"PDF za prvi kolokvijum"});await expect(pdfDialog.getByLabel("Autor / autorka")).toHaveValue("Primjer za vježbu");
 const pdfDownload=desk.waitForEvent("download");await pdfDialog.getByRole("button",{name:"Preuzmi PDF",exact:true}).click();
 const pdf=await pdfDownload;expect(pdf.suggestedFilename()).toBe("bora-kolokvijum-01-verzija-1.pdf");await pdf.saveAs("artifacts/accounts/submitted-version.pdf");
 await pdfDialog.getByRole("button",{name:"Zatvori prozor"}).click();
 await desk.getByLabel("Komentar studentu").fill("Paleta podržava ideju. Pojednostavi znak da ostane čitljiv u maloj veličini.");await desk.getByLabel("Status rada").selectOption("changes_requested");await desk.getByRole("button",{name:"Sačuvaj pregled"}).click();await expect(desk.getByRole("dialog")).not.toBeVisible();
 await page.getByRole("button",{name:"Predaje i komentari",exact:true}).click();await expect(page.locator(".feedback-comment")).toContainText("Pojednostavi znak");await page.getByRole("button",{name:"Pogledaj predatu verziju"}).click();await expect(page.getByTitle("Knjiga identiteta predate verzije")).toBeVisible();await page.keyboard.press("Escape");await page.screenshot({path:"artifacts/accounts/feedback-desktop.png",fullPage:true,animations:"disabled"});
 await desk.setViewportSize({width:390,height:844});await desk.getByRole("tab",{name:"Studenti i napredak"}).click();expect(await desk.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await desk.screenshot({path:"artifacts/accounts/teacher-mobile.png",fullPage:true,animations:"disabled"});await staff.close();
});

test("Playground images and favorites survive a fresh device without exposing another account",async({page,context,browser,persona,request})=>{
 const who=await persona("Student Vizuali"),other=await persona("Drugi Student");await signIn(context,who);await page.goto("/studio?view=playground");
 const visual={id:"test-image",image:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZWQAAAAASUVORK5CYII=",input:{model:"ideogram-4.5",aspect:"1:1",prompt:"Testni vizual za studentski identitet"},createdAt:new Date().toISOString()};
 const archive={format:"forma-playground",version:1,generation:{...newGeneration(),result:visual},history:[visual],starred:[visual.id]};await page.getByLabel("Uvezi Playground arhivu").setInputFiles({name:"arhiva.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(archive))});await expect(page.locator(".experiment-card")).toHaveCount(1);await expect(page.locator(".cloud-status")).toHaveText("Sačuvano na nalogu");
 const remote=await(await api(request,who,"/api/workspace/documents/playground")).json();expect(remote.document.data.history[0].image).toMatch(/^asset:/);expect(remote.document.data.starred).toEqual([visual.id]);
 const second=await browser.newContext(),device=await second.newPage();await signIn(second,who);await device.goto("/studio?view=playground");await expect(device.locator(".experiment-card")).toHaveCount(1);await expect(device.getByRole("button",{name:/Favoriti 1/})).toBeVisible();await expect(device.locator(".experiment-card img")).toHaveAttribute("src",/^data:image\/png;base64,/);await second.close();
 const stranger=await browser.newContext(),blank=await stranger.newPage();await signIn(stranger,other);await blank.goto("/studio?view=playground");await expect(blank.locator(".experiment-card")).toHaveCount(0);expect((await api(request,other,"/api/workspace/documents/playground")).status()).toBe(404);await stranger.close();
});

test("moving guest projects is an explicit selection and leaves the original local work intact",async({page,context,persona,request})=>{
 const who=await persona("Student Prenos");await page.goto("/pristup");await page.getByLabel("Pristupni kod",{exact:true}).fill(process.env.ACCESS_CODE!);await page.getByRole("button",{name:"Uđi u studio"}).click();await page.getByRole("button",{name:/EDUKATIVNI PRIMJER/}).click();const guestId=new URL(page.url()).searchParams.get("project");await expect(page.getByRole("status").filter({hasText:"Lokalno sačuvano"})).toBeVisible();
 await signIn(context,who);await page.goto("/studio");await page.getByRole("button",{name:"Prenesi projekte",exact:true}).click();const dialog=page.getByRole("dialog");await expect(dialog.getByRole("checkbox").first()).not.toBeChecked();await dialog.getByRole("checkbox").first().check();await dialog.getByRole("button",{name:"Prenesi izabrane radove"}).click();await expect(dialog).not.toBeVisible();
 await expect.poll(async()=>(await(await api(request,who,"/api/workspace/documents")).json()).documents.length).toBe(1);const docs=(await(await api(request,who,"/api/workspace/documents")).json()).documents;expect(docs[0].id).not.toBe(guestId);
 const original=await page.evaluate(async id=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open("keyval-store");r.onsuccess=()=>resolve(r.result);});return new Promise(resolve=>{const r=db.transaction("keyval").objectStore("keyval").get(`forma:project:${id}`);r.onsuccess=()=>resolve(r.result);});},guestId);expect(original).toBeTruthy();
});

test("Russian account, submission and teacher review screens keep original student content", async ({ page, context, browser, persona }) => {
  const { createTranslator } = await import("../../src/lib/i18n/core");
  const ru = createTranslator("ru"), en = createTranslator("en");
  const student = await persona("Анна Студент"), teacher = await persona("Преподаватель", { teacher: true });
  await signIn(context, student);
  await context.addCookies([{ name: "forma_language", value: "ru", domain: "localhost", path: "/" }]);
  await page.goto("/studio");
  await page.getByRole("button", { name: new RegExp(ru("EDUKATIVNI PRIMJER")) }).click();
  await page.locator(".step-nav button").nth(6).click();
  await page.getByRole("button", { name: ru("Predaj nastavniku na pregled"), exact: true }).click();
  await expect(page.getByRole("button", { name: ru("Ova verzija je već predata") })).toBeDisabled();
  const staff = await browser.newContext();
  try {
    await signIn(staff, teacher);
    await staff.addCookies([{ name: "forma_language", value: "ru", domain: "localhost", path: "/" }]);
    const desk = await staff.newPage();
    await desk.goto("/studio?view=teacher");
    await expect(desk.getByRole("heading", { name: ru("Pregled studija") + "." })).toBeVisible();
    await desk.locator(".teacher-submission").click();
    await expect(desk.getByTitle(ru("Knjiga identiteta predate verzije"))).toBeVisible();
    const preview = desk.frameLocator(".submission-preview");
    await expect(preview.getByRole("heading", { name: "01 / Отправная точка" })).toBeVisible();
    await expect(preview.getByRole("heading", { name: "Целевая аудитория" })).toBeVisible();
    const comment = "Оригинальный отзыв преподавателя / Original feedback.";
    await desk.getByLabel(ru("Komentar studentu")).fill(comment);
    await desk.getByLabel(ru("Status rada")).selectOption("changes_requested");
    await desk.getByRole("button", { name: ru("Sačuvaj pregled") }).click();
    await expect(desk.getByRole("dialog")).not.toBeVisible();
    await page.goto("/studio?view=submissions");
    await expect(page.locator(".feedback-comment")).toHaveText(comment);
    await page.locator(".language-selector select").selectOption("en");
    await expect(page.locator(".feedback-comment")).toHaveText(comment);
    await expect(page.locator(".feedback-card .submission-badge")).toHaveText(en("Potrebna dorada"));
    await page.goto("/studio?view=account");
    await expect(page.getByRole("heading", { name: en("Moj nalog") + "." })).toBeVisible();
    await expect(page.getByLabel(en("Broj indeksa"), { exact: true })).toHaveValue("VK-2026");
    await expect(page.locator(".verified-account strong")).toHaveText("Анна Студент");
  } finally { await staff.close(); }
});
