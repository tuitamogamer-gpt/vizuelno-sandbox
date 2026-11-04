"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Check, ChevronDown, Download, FolderOpen, Grid2X2, HardDrive, Info, LoaderCircle, LogOut, Menu, Plus, Sparkles, X } from "lucide-react";
import { Project, exampleProject, newProject } from "@/lib/project";
import { exportProject, importProject, loadProjects, removeProject, saveProject } from "@/lib/storage";
import { exportLanding, exportLogo } from "@/lib/export";
import { FormaMark } from "./brand";
import Dashboard, { Guide } from "./dashboard";
import Dialog from "./dialog";
import Editor, { Field } from "./editor";
import AiAtelier from "./ai-atelier";
import Report from "./report";

type View = "home" | "projects" | "guide" | "atelier" | "editor";
export default function Studio() {
  const router = useRouter();
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
  const [newAuthor,setNewAuthor]=useState("");
  const [creating,setCreating]=useState(false);
  const [printProject,setPrintProject]=useState<Project|null>(null);
  const importRef=useRef<HTMLInputElement>(null);
  const saveQueue=useRef<Promise<void>>(Promise.resolve());
  const saveVersion=useRef(0);
  const savedError=useRef(false);
  const projectsRef=useRef(projects);
  const failedSaves=useRef(new Set<string>());
  useEffect(()=>{projectsRef.current=projects;},[projects]);
  const active=projects.find(p=>p.id===activeId)||null;
  useEffect(()=>{ let cancelled=false; loadProjects().then(data=>{if(!cancelled)setProjects(data);}).catch(()=>{if(!cancelled)setStorageError("Podaci iz preglednika nisu dostupni. Provjeri dozvole za lokalno čuvanje ili uvezi rezervnu kopiju. Postojeći zapisi nisu obrisani.");}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;}; },[]);
  useEffect(()=>{ if(!toast)return;const t=setTimeout(()=>setToast(""),5000);return()=>clearTimeout(t); },[toast]);
  useEffect(()=>{ const warn=(event:BeforeUnloadEvent)=>{if(savedError.current||saveState==="saving"){event.preventDefault();}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn); },[saveState]);
  function navigate(next:View){setView(next);setMobileMenu(false);setExportMenu(false);window.scrollTo({top:0,behavior:"instant"});}
  function open(id:string){setActiveId(id);setStep(0);navigate("editor");}
  function changeStep(next:number){setStep(next);window.scrollTo({top:0,behavior:"instant"});}
  function update(patch:Partial<Project>){
    const selected=active||(view==="atelier"?projects[0]:null);if(!selected)return;
    const current=projectsRef.current.find(p=>p.id===selected.id);if(!current)return;
    const next={...current,...patch,updatedAt:new Date().toISOString()};
    projectsRef.current=projectsRef.current.map(p=>p.id===next.id?next:p);
    setProjects(prev=>prev.map(p=>p.id===next.id?next:p));setSaveState("saving");
    const version=++saveVersion.current;
    saveQueue.current=saveQueue.current.catch(()=>{}).then(()=>saveProject(next)).then(()=>{failedSaves.current.delete(next.id);savedError.current=failedSaves.current.size>0;if(version===saveVersion.current)setSaveState(savedError.current?"error":"saved");}).catch(()=>{failedSaves.current.add(next.id);setSaveState("error");savedError.current=true;setToast("Čuvanje nije uspjelo. Preuzmi JSON kopiju projekta prije zatvaranja.");});
  }
  async function add(p:Project){
    try{await saveProject(p);setProjects(prev=>[p,...prev]);open(p.id);return true;}
    catch{setToast("Projekat nije moguće sačuvati. Omogući lokalno čuvanje u pregledniku.");return false;}
  }
  async function create(event:React.FormEvent){event.preventDefault();if(!newName.trim()||!newAuthor.trim())return;setCreating(true);const ok=await add(newProject(newName.trim(),newAuthor.trim()));if(ok){setNewModal(false);setNewName("");setNewAuthor("");}setCreating(false);}
  async function duplicate(p:Project){await add({...p,id:crypto.randomUUID(),name:`${p.name.slice(0,190)} — kopija`,aiJob:null,aiRequest:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});}
  async function importFile(file?:File){if(!file)return;try{const p=await importProject(file);if(await add(p))setToast("Projekat je uvezen kao nova kopija.");}catch(e){setToast(e instanceof Error?e.message:"Uvoz nije uspio.");}}
  async function deleteProject(){if(!deleteTarget)return;try{await saveQueue.current;await removeProject(deleteTarget.id);setProjects(prev=>prev.filter(p=>p.id!==deleteTarget.id));if(activeId===deleteTarget.id){setActiveId(null);navigate("projects");}setDeleteTarget(null);setToast("Projekat je obrisan iz ovog preglednika.");}catch{setToast("Brisanje nije uspjelo. Pokušaj ponovo.");}}
  async function logout(){await saveQueue.current;if(savedError.current){setToast("Prvo preuzmi rezervnu kopiju: posljednje izmjene nisu sačuvane.");return;}try{const r=await fetch("/api/auth/logout",{method:"POST"});if(!r.ok)throw new Error();router.push("/pristup");router.refresh();}catch{setToast("Odjava nije uspjela. Provjeri vezu.");}}
  async function print(){if(!active)return;setPrintProject(active);setExportMenu(false);await document.fonts.ready;await new Promise(r=>setTimeout(r,120));window.print();}
  const createModal=()=>setNewModal(true);
  const nav=[{view:"home" as View,label:"Pregled",icon:Grid2X2},{view:"projects" as View,label:"Moji projekti",icon:FolderOpen},{view:"guide" as View,label:"Vodič za identitet",icon:BookOpen},{view:"atelier" as View,label:"AI atelje",icon:Sparkles}];
  return <><div className="app-shell"><aside className={`sidebar ${mobileMenu?"mobile-open":""}`}><Link href="/studio" className="wordmark"><FormaMark/><span>forma<span className="wordmark-dot">.</span></span></Link><span className="sidebar-subtitle">IDEJAMA DAJEMO OBLIK.</span><button className="mobile-close icon-button" onClick={()=>setMobileMenu(false)} aria-label="Zatvori navigaciju"><X size={20}/></button><div className="sidebar-course"><span className="course-icon">Vk<span>↗︎</span></span><div>Vizuelno<br/>komuniciranje<span>STUDENTSKI STUDIO</span></div></div><span className="nav-caption">RADNI PROSTOR</span><nav>{nav.map(item=><button key={item.view} onClick={()=>navigate(item.view)} className={view===item.view||(view==="editor"&&item.view==="projects")?"active":""}><item.icon size={18} strokeWidth={1.7}/>{item.label}{item.view==="projects"&&<span className="nav-count">{projects.length}</span>}{item.view==="atelier"&&<span className="nav-dot"/>}</button>)}</nav><div className="sidebar-tip"><span className="sidebar-tip-mark">“</span><p>Jednostavno ne znači<br/>bez ideje.</p><span>ZNAČENJE PRIJE OBLIKA</span></div><div className="sidebar-bottom"><button className="local-storage" onClick={()=>setStorageModal(true)}><HardDrive size={16}/><span>Sačuvano lokalno<small>Na ovom uređaju</small></span><Info size={14}/></button><div className="user-line"><span className="user-avatar">VK</span><div>Studentski pristup<small>Akademska 2026/27.</small></div><button className="icon-button" onClick={logout} aria-label="Odjavi se"><LogOut size={16}/></button></div></div></aside>{mobileMenu&&<button className="mobile-backdrop" onClick={()=>setMobileMenu(false)} aria-label="Zatvori meni"/>}
    <div className="main-shell"><header className="topbar"><div className="topbar-left"><button className="mobile-toggle icon-button" aria-label="Otvori navigaciju" onClick={()=>setMobileMenu(true)}><Menu size={22}/></button>{view==="editor"?<><button className="icon-button" onClick={()=>navigate("projects")} aria-label="Nazad na projekte"><ArrowLeft size={17}/></button><span className="breadcrumb">Moji projekti <span>/</span><strong>{active?.name||"Projekat"}</strong></span></>:<span className="breadcrumb">Studio <span>/</span><strong>{nav.find(x=>x.view===view)?.label}</strong></span>}</div><div className="topbar-right">{view==="editor"&&<span className={`save-status ${saveState}`} role="status">{saveState==="saving"?<LoaderCircle size={14} className="spin"/>:saveState==="error"?<Info size={14}/>:<Check size={14}/>}<span>{saveState==="saving"?"Čuvanje...":saveState==="error"?"Čuvanje nije uspjelo":"Lokalno sačuvano"}</span></span>}{view==="editor"&&active?<div className="export-menu-wrap"><button className="button secondary small" onClick={()=>setExportMenu(!exportMenu)} aria-expanded={exportMenu}><Download size={15}/>Izvezi<ChevronDown size={13}/></button>{exportMenu&&<><button className="menu-dismiss" onClick={()=>setExportMenu(false)} aria-label="Zatvori izvoz"/><div className="card-menu export-dropdown"><button onClick={()=>{void print();}}>Dokument / PDF</button><button onClick={()=>{exportProject(active);setExportMenu(false);}}>Projekat za nastavak (.json)</button><button onClick={()=>{exportLogo(active);setExportMenu(false);}}>Logotip (.svg)</button><button onClick={()=>{exportLanding(active);setExportMenu(false);}}>Osnova stranice (.html)</button></div></>}</div>:<span className="topbar-course">KOLOKVIJUM <strong>01</strong></span>}<span className="topbar-avatar">VK</span></div></header>
    <main id="main-content">{storageError&&<div className="storage-error" role="alert"><Info size={20}/><p>{storageError}</p></div>}{loading?<div className="loading-state"><LoaderCircle className="spin" size={25}/><p>Pripremamo tvoj radni prostor...</p></div>:<>{(view==="home"||view==="projects")&&<Dashboard projects={projects} open={open} create={createModal} importFile={()=>importRef.current?.click()} example={()=>{void add(exampleProject());}} guide={()=>navigate("guide")} duplicate={duplicate} remove={setDeleteTarget} backup={exportProject} all={view==="projects"}/>} {view==="guide"&&<Guide create={createModal}/>} {view==="atelier"&&<AiAtelier projects={projects} selectedId={activeId} select={setActiveId} update={update} notify={setToast} create={createModal}/>} {view==="editor"&&active&&<Editor key={active.id} project={active} step={step} setStep={changeStep} update={update} exportBackup={()=>exportProject(active)} exportLogo={()=>exportLogo(active)} exportLanding={()=>exportLanding(active)} print={()=>{void print();}} ai={()=>navigate("atelier")} notify={setToast}/>}</>}</main></div>
    <input type="file" ref={importRef} className="visually-hidden" accept=".json,application/json" aria-label="Uvezi Forma projekat" onChange={e=>{void importFile(e.target.files?.[0]);e.target.value="";}}/>
    {toast&&<div className="toast" role="status"><Info size={17}/><span>{toast}</span><button className="icon-button" onClick={()=>setToast("")} aria-label="Zatvori obavještenje"><X size={16}/></button></div>}
    {newModal&&<Dialog title="Daj svojoj ideji početak." onClose={()=>setNewModal(false)}><p className="modal-intro">Dovoljan je radni naziv. Sve ostalo gradimo korak po korak.</p><form onSubmit={create}><Field label="Radni naziv projekta" value={newName} onChange={setNewName} maxLength={200} placeholder="npr. Studio List, Moja priča..."/><Field label="Ime i prezime" value={newAuthor} onChange={setNewAuthor} maxLength={200} placeholder="Autor/ka identiteta"/><div className="modal-note"><Info size={16}/>Projekat se čuva u ovom pregledniku. Za drugi uređaj koristi izvoz i uvoz projekta.</div><div className="modal-actions"><button type="button" className="button ghost" onClick={()=>setNewModal(false)}>Odustani</button><button className="button primary" disabled={creating||!newName.trim()||!newAuthor.trim()}>{creating?<LoaderCircle size={16} className="spin"/>:<Plus size={16}/>}Kreiraj projekat</button></div></form></Dialog>}
    {deleteTarget&&<Dialog title="Obriši projekat?" onClose={()=>setDeleteTarget(null)}><p className="modal-intro">Projekat „{deleteTarget.name}“ biće obrisan iz ovog preglednika. Ova radnja se ne može poništiti. Prethodno možeš preuzeti rezervnu kopiju.</p><button className="button secondary" onClick={()=>exportProject(deleteTarget)}><Download size={16}/>Preuzmi kopiju</button><div className="modal-actions"><button className="button ghost" onClick={()=>setDeleteTarget(null)}>Zadrži projekat</button><button className="button danger" onClick={deleteProject}>Obriši projekat</button></div></Dialog>}
    {storageModal&&<Dialog title="Tvoj rad ostaje kod tebe." onClose={()=>setStorageModal(false)}><div className="storage-explanation"><HardDrive size={34}/><p>Projekti i slike čuvaju se u ovom pregledniku na ovom uređaju. Ne šalju se nastavniku automatski i ne sinhronizuju se između uređaja.</p><p><strong>Za nastavak na drugom računaru:</strong> izvezi projekat kao JSON, a zatim ga uvezi u Formu na drugom uređaju.</p><p><strong>Na zajedničkom računaru:</strong> preuzmi JSON kopiju i obriši svoj projekat prije odlaska. Odjava zaključava aplikaciju, ali ne briše lokalne projekte.</p><p><strong>Za predaju:</strong> izvezi dokument kao PDF i predaj ga kroz dogovoreni kanal.</p><p className="small-muted">Brisanje podataka preglednika uklanja lokalne projekte. Redovno preuzimaj rezervnu kopiju.</p></div><div className="modal-actions"><button className="button primary" onClick={()=>setStorageModal(false)}>Razumijem<Check size={16}/></button></div></Dialog>}
    </div>{printProject&&<Report project={printProject}/>}</>;
}
