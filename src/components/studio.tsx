"use client";
import { useEffect, useRef, useState, useCallback, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BookOpen, Check, ChevronDown, Download, FolderOpen, Grid2X2, HardDrive, Info, LoaderCircle, LogOut, Menu, Plus, FlaskConical, KeyRound, Cloud, CloudCheck, UserRound, Send, Users, RefreshCw, WifiOff, Package, X } from "lucide-react";
import { Project, ProjectPatch, exampleProject, newProject } from "@/lib/project";
import { exportProject, importProject, loadProjects } from "@/lib/storage";
import { exportLanding, exportLogo } from "@/lib/export";
import { FormaMark } from "./brand";
import Dashboard, { Guide } from "./dashboard";
import Dialog from "./dialog";
import Editor, { Field } from "./editor";
import Playground from "./playground";
import ApiSettings from "./api-settings";
import { GenerationResult, VisualTarget, cleanVisuals, isPending, models, newGeneration, targetInfo, amendGeneration } from "@/lib/generation";
import PdfExport from "./pdf-export";

import { View, parseLocation, resolveLocation, studioUrl } from "@/lib/navigation";
import { useOnline, useMobile } from "@/lib/browser-state";
import { exportIdentityKit } from "@/lib/identity-kit";
import type { Viewer } from "@/lib/account-types";
import { Workspace } from "@/lib/cloud/workspace";
import AccountPanel from "./account-panel";
import ProjectSubmission, { MySubmissions } from "./submission-panel";
import TeacherPanel from "./teacher-panel";
import DialogMigration from "./migration-dialog";
export default function Studio({viewer={account:null,googleReady:false}}:{viewer?:Viewer}) {
  const workspace=useMemo(()=>new Workspace(viewer.account?.id||null),[viewer.account?.id]);
  const sync=useSyncExternalStore(workspace.subscribe,workspace.getSnapshot,workspace.getSnapshot);
  const navigationPrefix=viewer.account?`forma:account:${viewer.account.id}:`:"forma:";
  const [conflictId,setConflictId]=useState<string|null>(null);
  const [resolving,setResolving]=useState(false);
  const [loggingOut,setLoggingOut]=useState(false);
  const [migrating,setMigrating]=useState(false);
  const [legacyCount,setLegacyCount]=useState(0);
  const router = useRouter();
  const online = useOnline(), isMobile = useMobile();
  const sidebarRef = useRef<HTMLElement>(null);
  const lastSteps = useRef<Record<string,number>>({});
  const [resume,setResume] = useState<{id:string;step:number}|null>(null);
  const [packing,setPacking] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view,setView]=useState<View>("home");
  const [step,setStep]=useState(0);
  const [loading,setLoading]=useState(true);
  const [storageError,setStorageError]=useState("");
  const [saveState,setSaveState]=useState<"saved"|"saving"|"error">("saved");
  const [toast,setToast]=useState("");
  const [newModal,setNewModal]=useState(false);
  const [deleteTarget,setDeleteTarget]=useState<Project|null>(null);
  const [storageModal,setStorageModal]=useState(false);
  const [mobileMenu,setMobileMenu]=useState(false);
  const [exportMenu,setExportMenu]=useState(false);
  const [newName,setNewName]=useState("");
  const [newAuthor,setNewAuthor]=useState(viewer.account?.name||"");
  const [creating,setCreating]=useState(false);
  const [pdfProject,setPdfProject]=useState<Project|null>(null);
  const importRef=useRef<HTMLInputElement>(null);
  const saveQueue=useRef<Promise<unknown>>(Promise.resolve());
  const saveVersion=useRef(0);
  const savedError=useRef(false);
  const projectsRef=useRef(projects);
  const failedSaves=useRef(new Set<string>());
  useEffect(()=>{projectsRef.current=projects;},[projects]);
  const active=projects.find(p=>p.id===activeId)||null;
  const remember=useCallback((id:string,nextStep:number)=>{lastSteps.current[id]=nextStep;setResume({id,step:nextStep});try{localStorage.setItem(navigationPrefix+"last-steps",JSON.stringify(lastSteps.current));localStorage.setItem(navigationPrefix+"resume",JSON.stringify({id,step:nextStep}));}catch{}},[navigationPrefix]);
  useEffect(()=>{ let cancelled=false;workspace.start();const unsubscribe=workspace.subscribe(()=>{if(!cancelled){projectsRef.current=workspace.projects();setProjects(workspace.projects());}}); workspace.initialize().then(data=>{
    if(cancelled)return;projectsRef.current=data;setProjects(data);
    const next=resolveLocation(parseLocation(window.location.search),data.map(p=>p.id));
    setView(next.view);setActiveId(next.projectId);setStep(next.step);
    window.history.replaceState(null,"",studioUrl(next));
    try { const saved=JSON.parse(localStorage.getItem(navigationPrefix+"last-steps")||"{}"); for(const p of data) if(Number.isInteger(saved[p.id])&&saved[p.id]>=0&&saved[p.id]<=6)lastSteps.current[p.id]=saved[p.id];const last=JSON.parse(localStorage.getItem(navigationPrefix+"resume")||"null");if(last&&data.some(p=>p.id===last.id))setResume({id:last.id,step:lastSteps.current[last.id]||0}); }catch{}
    if(next.view==="editor"&&next.projectId)remember(next.projectId,next.step);
  }).catch(()=>{if(!cancelled)setStorageError("Podaci iz preglednika nisu dostupni. Provjeri dozvole za lokalno čuvanje ili uvezi rezervnu kopiju. Postojeći zapisi nisu obrisani.");}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;unsubscribe();workspace.stop();}; },[remember,workspace,navigationPrefix]);
  useEffect(()=>{if(!viewer.account)return;let cancelled=false;loadProjects().then(data=>{if(!cancelled)setLegacyCount(data.length);}).catch(()=>{});return()=>{cancelled=true;};},[viewer.account]);
  useEffect(()=>{
    function back(){const next=resolveLocation(parseLocation(window.location.search),projectsRef.current.map(p=>p.id));setView(next.view);setActiveId(next.projectId);setStep(next.step);setMobileMenu(false);setExportMenu(false);if(next.view==="editor"&&next.projectId)remember(next.projectId,next.step);window.scrollTo({top:0,behavior:"instant"});}
    window.addEventListener("popstate",back);return()=>window.removeEventListener("popstate",back);
  },[remember]);
  useEffect(()=>{
    if(!mobileMenu||!isMobile)return;
    const before=document.activeElement as HTMLElement|null,previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";sidebarRef.current?.querySelector<HTMLButtonElement>("nav button")?.focus();
    function keys(event:KeyboardEvent){if(event.key==="Escape"){setMobileMenu(false);return;}if(event.key!=="Tab")return;const nodes=Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]')||[]).filter(el=>el.offsetParent!==null);const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
    document.addEventListener("keydown",keys);return()=>{document.removeEventListener("keydown",keys);document.body.style.overflow=previousOverflow;before?.focus();};
  },[mobileMenu,isMobile]);
  useEffect(()=>{ if(!toast)return;const t=setTimeout(()=>setToast(""),5000);return()=>clearTimeout(t); },[toast]);
  useEffect(()=>{ const warn=(event:BeforeUnloadEvent)=>{if(savedError.current||saveState==="saving"){event.preventDefault();}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn); },[saveState]);

  function navigate(next:View,id=activeId,nextStep=step){
    setView(next);if(next==="editor"){setActiveId(id);setStep(nextStep);if(id)remember(id,nextStep);}
    setMobileMenu(false);setExportMenu(false);
    const url=studioUrl({view:next,projectId:id,step:nextStep});if(window.location.pathname+window.location.search!==url)window.history.pushState(null,"",url);
    window.scrollTo({top:0,behavior:"instant"});
  }
  function open(id:string,desiredStep?:number){if(!projectsRef.current.some(project=>project.id===id)){setToast("Trenutni projekat nije na nalogu. Predatu verziju možeš otvoriti u Predajama i komentarima.");return;}navigate("editor",id,desiredStep??lastSteps.current[id]??0);}
  function changeStep(next:number){navigate("editor",activeId,next);}
  function updateProject(id: string, patch: ProjectPatch) {
    const current=projectsRef.current.find(p=>p.id===id);if(!current)return Promise.resolve(false);
    const changes=typeof patch==="function"?patch(current):patch;
    const next={...current,...changes,updatedAt:new Date().toISOString()};
    projectsRef.current=projectsRef.current.map(p=>p.id===next.id?next:p);
    setProjects(prev=>prev.map(p=>p.id===next.id?next:p));setSaveState("saving");
    const version=++saveVersion.current;
    saveQueue.current=workspace.saveProject(next).then(()=>{failedSaves.current.delete(next.id);savedError.current=failedSaves.current.size>0;if(version===saveVersion.current)setSaveState(savedError.current?"error":"saved");return true;}).catch(()=>{failedSaves.current.add(next.id);setSaveState("error");savedError.current=true;setToast("Čuvanje nije uspjelo. Preuzmi JSON kopiju projekta prije zatvaranja.");return false;});
    return saveQueue.current as Promise<boolean>;
  }
  function update(patch: ProjectPatch) { return active?updateProject(active.id, patch):Promise.resolve(false); }
  async function applyExperiment(id: string, target: VisualTarget, result: GenerationResult) {
    const current=projectsRef.current.find(p=>p.id===id);
    if(!current) { setToast("Izaberi postojeći projekat."); return false; }
    if(current.visuals[target] && isPending(current.visuals[target]!)) { setToast("U tom koraku se već generiše vizual. Sačekaj završetak prije dodavanja eksperimenta."); return false; }
    const line=`${targetInfo[target].label}: ${models[result.input.model].label}, preko Pika API Club (Playground). Autorske dorade: [opiši izmjene].`;
    const saved=await updateProject(id, p=>({ visuals:{...p.visuals,[target]:amendGeneration(p.visuals[target]||newGeneration(),{...result.input,result,job:null,request:null})}, ...(target==="logo"?{logoImage:result.image}:{}), aiDisclosure:p.aiDisclosure.includes(line)?p.aiDisclosure:`${p.aiDisclosure}\n${line}`.trim().slice(0,6000) }));
    if(!saved)return false;
    setToast(`Vizual je dodat projektu „${current.name}“ · ${targetInfo[target].label}.`);return true;
  }
  async function add(p:Project){
    try{await workspace.saveProject(p);open(p.id,0);return true;}
    catch{setToast("Projekat nije moguće sačuvati. Omogući lokalno čuvanje u pregledniku.");return false;}
  }
  async function create(event:React.FormEvent){event.preventDefault();if(!newName.trim()||!newAuthor.trim())return;setCreating(true);const ok=await add(newProject(newName.trim(),newAuthor.trim()));if(ok){setNewModal(false);setNewName("");setNewAuthor(viewer.account?.name||"");}setCreating(false);}
  async function duplicate(p:Project){await add({...p,id:crypto.randomUUID(),name:`${p.name.slice(0,190)} — kopija`,visuals:cleanVisuals(p.visuals),aiJob:null,aiRequest:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});}
  async function importFile(file?:File){if(!file)return;try{const p=await importProject(file);if(await add(p))setToast("Projekat je uvezen kao nova kopija.");}catch(e){setToast(e instanceof Error?e.message:"Uvoz nije uspio.");}}
  async function deleteProject(){if(!deleteTarget)return;try{await saveQueue.current;await workspace.removeProject(deleteTarget.id);projectsRef.current=projectsRef.current.filter(p=>p.id!==deleteTarget.id);setProjects(prev=>prev.filter(p=>p.id!==deleteTarget.id));if(activeId===deleteTarget.id){setActiveId(null);navigate("projects");}setDeleteTarget(null);setToast(viewer.account?"Projekat je uklonjen. Brisanje se sinhronizuje s nalogom.":"Projekat je obrisan iz ovog preglednika.");}catch{setToast("Brisanje nije uspjelo. Pokušaj ponovo.");}}
  async function logout(){if(loggingOut)return;setLoggingOut(true);await saveQueue.current;if(savedError.current){setLoggingOut(false);setToast("Prvo preuzmi rezervnu kopiju: posljednje izmjene nisu sačuvane.");return;}try{if(viewer.account)await workspace.ensureSynced();workspace.stop();const r=await fetch("/api/auth/logout",{method:"POST"});if(!r.ok)throw new Error("Odjava nije uspjela. Provjeri vezu.");if(viewer.account){await workspace.clearAccountCache();localStorage.removeItem(navigationPrefix+"last-steps");localStorage.removeItem(navigationPrefix+"resume");}router.push("/pristup");router.refresh();}catch(e){setLoggingOut(false);workspace.start();setToast(e instanceof Error?e.message:"Odjava nije uspjela. Provjeri vezu.");}}
  function exportPdf(){if(!active)return;setPdfProject(active);setExportMenu(false);}
  async function kit(){if(!active||packing)return;setPacking(true);setExportMenu(false);try{await exportIdentityKit(active);setToast("Paket identiteta je spreman za preuzimanje.");}catch{setToast("Paket nije moguće pripremiti. Preuzmi JSON kopiju projekta.");}finally{setPacking(false);}}
  const createModal=()=>setNewModal(true);
  const nav=[{view:"home" as View,label:"Pregled",icon:Grid2X2},{view:"projects" as View,label:"Moji projekti",icon:FolderOpen},{view:"guide" as View,label:"Vodič za identitet",icon:BookOpen},{view:"playground" as View,label:"Playground",icon:FlaskConical},{view:"account" as View,label:viewer.account?"Moj nalog":"Poveži Google nalog",icon:UserRound},...(viewer.account?[{view:"submissions" as View,label:"Predaje i komentari",icon:Send}]:[]),...(viewer.account?.role==="instructor"?[{view:"teacher" as View,label:"Nastavnički pregled",icon:Users}]:[]),{view:"settings" as View,label:"API postavke",icon:KeyRound}];
  return <><a className="skip-link" href="#main-content">Preskoči na sadržaj</a><div className="app-shell"><aside ref={sidebarRef} inert={isMobile&&!mobileMenu} role={isMobile&&mobileMenu?"dialog":undefined} aria-modal={isMobile&&mobileMenu?true:undefined} aria-label="Glavna navigacija" className={`sidebar ${mobileMenu?"mobile-open":""}`}><Link href="/studio" className="wordmark" onClick={event=>{event.preventDefault();navigate("home");}}><FormaMark/><span>forma<span className="wordmark-dot">.</span></span></Link><span className="sidebar-subtitle">IDEJAMA DAJEMO OBLIK.</span><button className="mobile-close icon-button" onClick={()=>setMobileMenu(false)} aria-label="Zatvori navigaciju"><X size={20}/></button><div className="sidebar-course"><span className="course-icon">Vk<span><ArrowUpRight size={12}/></span></span><div>Vizuelno<br/>komuniciranje<span>STUDENTSKI STUDIO</span></div></div><span className="nav-caption">RADNI PROSTOR</span><nav>{nav.map(item=><button key={item.view} onClick={()=>navigate(item.view)} className={view===item.view||(view==="editor"&&item.view==="projects")?"active":""}><item.icon size={18} strokeWidth={1.7}/>{item.label}{item.view==="projects"&&<span className="nav-count">{projects.length}</span>}{item.view==="playground"&&<span className="nav-dot"/>}</button>)}</nav><div className="sidebar-tip"><span className="sidebar-tip-mark">“</span><p>Jednostavno ne znači<br/>bez ideje.</p><span>ZNAČENJE PRIJE OBLIKA</span></div><div className="sidebar-bottom"><button className="local-storage" onClick={()=>viewer.account?navigate("account"):setStorageModal(true)}>{viewer.account?<Cloud size={16}/>:<HardDrive size={16}/>}<span>{viewer.account?"Povezan nalog":"Sačuvano lokalno"}<small>{viewer.account?"Projekti na svim uređajima":"Na ovom uređaju"}</small></span><Info size={14}/></button><div className="user-line"><span className="user-avatar">VK</span><div>{viewer.account?.name||"Studentski pristup"}<small>{viewer.account?.role==="instructor"?"Nastavnik":viewer.account?"Google nalog":"Akademska 2026/27."}</small></div><button className="icon-button" onClick={logout} disabled={loggingOut} aria-label="Odjavi se"><LogOut size={16}/></button></div></div></aside>{mobileMenu&&<button className="mobile-backdrop" onClick={()=>setMobileMenu(false)} aria-label="Zatvori meni"/>}
    <div className="main-shell" inert={isMobile&&mobileMenu}><header className="topbar"><div className="topbar-left"><button className="mobile-toggle icon-button" aria-label="Otvori navigaciju" onClick={()=>setMobileMenu(true)}><Menu size={22}/></button>{view==="editor"?<><button className="icon-button" onClick={()=>navigate("projects")} aria-label="Nazad na projekte"><ArrowLeft size={17}/></button><span className="breadcrumb">Moji projekti <span>/</span><strong>{active?.name||"Projekat"}</strong></span></>:<span className="breadcrumb">Studio <span>/</span><strong>{nav.find(x=>x.view===view)?.label}</strong></span>}</div><div className="topbar-right">{viewer.account&&<button className={`cloud-status ${sync.phase}`} onClick={()=>navigate("account")} title={sync.message||"Stanje sinhronizacije"}>{sync.phase==="syncing"||sync.phase==="loading"?<LoaderCircle size={15} className="spin"/>:sync.phase==="saved"?<CloudCheck size={15}/>:<Cloud size={15}/>}<span>{sync.phase==="saved"?"Sačuvano na nalogu":sync.phase==="syncing"?"Sinhronizacija...":sync.phase==="offline"?"Na ovom uređaju":sync.phase==="conflict"?"Različite verzije":"Provjeri čuvanje"}</span></button>}{view==="editor"&&<span className={`save-status ${saveState}`} role="status">{saveState==="saving"?<LoaderCircle size={14} className="spin"/>:saveState==="error"?<Info size={14}/>:<Check size={14}/>}<span>{saveState==="saving"?"Čuvanje...":saveState==="error"?"Čuvanje nije uspjelo":"Lokalno sačuvano"}</span></span>}{view==="editor"&&active?<div className="export-menu-wrap"><button className="button secondary small" onClick={()=>setExportMenu(!exportMenu)} aria-expanded={exportMenu}><Download size={15}/>Izvezi<ChevronDown size={13}/></button>{exportMenu&&<><button className="menu-dismiss" onClick={()=>setExportMenu(false)} aria-label="Zatvori izvoz"/><div className="card-menu export-dropdown"><button disabled={packing} onClick={()=>{void kit();}}><Package size={15}/>{packing?"Priprema paketa...":"Komplet identiteta (.zip)"}</button><button onClick={exportPdf}>Kolokvijum 01 (.pdf)</button><button onClick={()=>{exportProject(active);setExportMenu(false);}}>Projekat za nastavak (.json)</button><button onClick={()=>{exportLogo(active);setExportMenu(false);}}>Logotip (.svg)</button><button onClick={()=>{exportLanding(active);setExportMenu(false);}}>Osnova stranice (.html)</button></div></>}</div>:<span className="topbar-course">KOLOKVIJUM <strong>01</strong></span>}<span className="topbar-avatar">VK</span></div></header>
    <main id="main-content" tabIndex={-1}>{viewer.account&&sync.phase==="error"&&<div className="cloud-notice" role="alert"><Cloud size={18}/><span>{sync.message}</span><button className="button secondary small" onClick={()=>{void workspace.sync();}}>Pokušaj ponovo</button></div>}{viewer.account&&sync.conflicts.map(item=><div className="cloud-notice conflict" key={item.id}><Info size={18}/><span>„{item.name}“ ima različite verzije na dva uređaja. Tvoje izmjene su sačuvane lokalno.</span><button className="button secondary small" onClick={()=>setConflictId(item.id)}>Izaberi verziju</button></div>)}{viewer.account&&legacyCount>0&&view==="home"&&<div className="migration-notice"><HardDrive size={24}/><div><strong>Na ovom uređaju imaš {legacyCount} lokalnih projekata.</strong><p>Izaberi svoje radove i prenesi ih na ovaj Google nalog.</p></div><button className="button secondary small" onClick={()=>setMigrating(true)}>Prenesi projekte</button><button className="icon-button" aria-label="Sakrij ponudu za prenos" onClick={()=>setLegacyCount(0)}><X size={17}/></button></div>}{!online&&<div className="offline-notice" role="status"><WifiOff size={18}/><span>Trenutno si bez interneta. Nastavi pisati i uređivati projekat; AI generisanje će biti dostupno kada se veza vrati.</span></div>}{storageError&&<div className="storage-error" role="alert"><Info size={20}/><p>{storageError}</p></div>}{loading?<div className="loading-state"><LoaderCircle className="spin" size={25}/><p>Pripremamo tvoj radni prostor...</p></div>:<>{(view==="home"||view==="projects")&&<Dashboard projects={projects} open={open} create={createModal} importFile={()=>importRef.current?.click()} example={()=>{void add(exampleProject());}} guide={()=>navigate("guide")} duplicate={duplicate} remove={setDeleteTarget} backup={exportProject} all={view==="projects"} resume={resume} cloud={!!viewer.account}/>} {view==="guide"&&<Guide create={createModal}/>} <div hidden={view!=="playground"}><Playground projects={projects} apply={applyExperiment} notify={setToast} workspace={workspace}/></div> {view==="settings"&&<ApiSettings/>}{view==="account"&&<AccountPanel viewer={viewer} workspace={workspace} sync={sync} notify={setToast}/>} {view==="submissions"&&viewer.account&&<MySubmissions open={open}/>} {view==="teacher"&&viewer.account?.role==="instructor"&&<TeacherPanel/>} {view==="editor"&&active&&<Editor key={active.id} project={active} step={step} setStep={changeStep} update={update} exportBackup={()=>exportProject(active)} exportLogo={()=>exportLogo(active)} exportLanding={()=>exportLanding(active)} exportPdf={exportPdf} exportKit={()=>{void kit();}} packing={packing} cloud={!!viewer.account} submission={viewer.account?<ProjectSubmission project={active} workspace={workspace} notify={setToast}/>:undefined}/>}</>}</main></div>
    <input type="file" ref={importRef} className="visually-hidden" accept=".json,application/json" aria-label="Uvezi Forma projekat" onChange={e=>{void importFile(e.target.files?.[0]);e.target.value="";}}/>
    {toast&&<div className="toast" role="status"><Info size={17}/><span>{toast}</span><button className="icon-button" onClick={()=>setToast("")} aria-label="Zatvori obavještenje"><X size={16}/></button></div>}
    {migrating&&<DialogMigration workspace={workspace} onClose={()=>setMigrating(false)} onDone={()=>{setLegacyCount(0);setMigrating(false);setToast("Izabrani projekti su kopirani u tvoj nalog. Sinhronizacija je u toku.");}}/>}
    {conflictId&&<Dialog title="Sačuvaj pravi nastavak rada." onClose={()=>{if(!resolving)setConflictId(null);}}><p className="modal-intro">Na nalogu je druga verzija. Preuzimanjem verzije s naloga zamijenićeš lokalne izmjene ovog rada. Za projekat možeš prvo napraviti zasebnu kopiju.</p>{conflictId!=="playground"&&<button className="button primary" disabled={resolving} onClick={async()=>{setResolving(true);try{await workspace.keepCopy(conflictId);setConflictId(null);setToast("Lokalne izmjene su sačuvane kao zaseban projekat.");}catch(e){setToast(e instanceof Error?e.message:"Kopija nije sačuvana.");}finally{setResolving(false);}}}>Sačuvaj moje izmjene kao kopiju</button>}{conflictId==="playground"&&<p className="modal-intro">Prvo preuzmi svoju Playground arhivu ako želiš sačuvati lokalne eksperimente.</p>}<div className="modal-actions"><button className="button ghost" disabled={resolving} onClick={()=>setConflictId(null)}>Zadrži lokalno za sada</button><button className="button secondary" disabled={resolving} onClick={async()=>{setResolving(true);try{await workspace.useRemote(conflictId);setConflictId(null);setToast("Preuzeta je verzija s naloga.");}catch(e){setToast(e instanceof Error?e.message:"Verzija nije preuzeta.");}finally{setResolving(false);}}}>{resolving?<LoaderCircle size={16} className="spin"/>:<RefreshCw size={16}/>}Preuzmi verziju s naloga</button></div></Dialog>}
    {newModal&&<Dialog title="Daj svojoj ideji početak." onClose={()=>setNewModal(false)}><p className="modal-intro">Dovoljan je radni naziv. Sve ostalo gradimo korak po korak.</p><form onSubmit={create}><Field label="Radni naziv projekta" value={newName} onChange={setNewName} maxLength={200} placeholder="npr. Studio List, Moja priča..."/><Field label="Ime i prezime" value={newAuthor} onChange={setNewAuthor} maxLength={200} placeholder="Autor/ka identiteta"/><div className="modal-note"><Info size={16}/>{viewer.account?"Projekat se čuva uz tvoj Google nalog i ima lokalnu kopiju za rad bez interneta.":"Projekat se čuva u ovom pregledniku. Za drugi uređaj koristi izvoz i uvoz projekta."}</div><div className="modal-actions"><button type="button" className="button ghost" onClick={()=>setNewModal(false)}>Odustani</button><button className="button primary" disabled={creating||!newName.trim()||!newAuthor.trim()}>{creating?<LoaderCircle size={16} className="spin"/>:<Plus size={16}/>}Kreiraj projekat</button></div></form></Dialog>}
    {deleteTarget&&<Dialog title="Obriši projekat?" onClose={()=>setDeleteTarget(null)}><p className="modal-intro">Projekat „{deleteTarget.name}“ {viewer.account?"biće uklonjen s naloga i povezanih uređaja. Predate verzije ostaju sačuvane.":"biće obrisan iz ovog preglednika."} Ova radnja se ne može poništiti. Prethodno možeš preuzeti rezervnu kopiju.</p><button className="button secondary" onClick={()=>exportProject(deleteTarget)}><Download size={16}/>Preuzmi kopiju</button><div className="modal-actions"><button className="button ghost" onClick={()=>setDeleteTarget(null)}>Zadrži projekat</button><button className="button danger" onClick={deleteProject}>Obriši projekat</button></div></Dialog>}
    {storageModal&&<Dialog title="Tvoj rad ostaje kod tebe." onClose={()=>setStorageModal(false)}><div className="storage-explanation"><HardDrive size={34}/><p>Projekti i slike čuvaju se u ovom pregledniku na ovom uređaju. Ne šalju se nastavniku automatski i ne sinhronizuju se između uređaja.</p><p><strong>Za nastavak na drugom računaru:</strong> izvezi projekat kao JSON, a zatim ga uvezi u Formu na drugom uređaju.</p><p><strong>Na zajedničkom računaru:</strong> preuzmi JSON kopiju i obriši svoj projekat prije odlaska. Odjava zaključava aplikaciju, ali ne briše lokalne projekte.</p><p><strong>Za predaju:</strong> izvezi dokument kao PDF i predaj ga kroz dogovoreni kanal.</p><p className="small-muted">Brisanje podataka preglednika uklanja lokalne projekte. Redovno preuzimaj rezervnu kopiju.</p></div><div className="modal-actions"><button className="button primary" onClick={()=>setStorageModal(false)}>Razumijem<Check size={16}/></button></div></Dialog>}
    </div>{pdfProject&&<PdfExport project={pdfProject} studentNumber={viewer.account?.studentNumber} group={viewer.account?.group} onClose={()=>setPdfProject(null)}/>}</>;
}
