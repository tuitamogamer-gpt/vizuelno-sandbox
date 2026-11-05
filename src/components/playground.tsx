"use client";
import { formatLocales } from "@/lib/i18n/core";
import { useI18n } from "@/components/language-provider";

import { useEffect, useRef, useState } from "react";
import { Workspace } from "@/lib/cloud/workspace";
import { ArrowDownToLine, Check, Columns2, Copy, Download, FlaskConical, LoaderCircle, Sparkles, Trash2, Star, Search, Upload, FolderOpen } from "lucide-react";
import { Generation, GenerationResult, PlaygroundData, VisualTarget, amendGeneration, isPending, mergeExperiments, modelIds, models, newGeneration, playgroundSchema, targetInfo, visualTargets } from "@/lib/generation";
import { Project, visualBrief } from "@/lib/project";
import { exportPlayground, importPlayground } from "@/lib/storage";
import AiGeneration from "./ai-generation";
import Dialog from "./dialog";
import VisualDetail from "./visual-detail";


const starters = [
  { label: "Znak", prompt: "Originalan minimalistički znak za mali arhitektonski studio LIN: dvije povezane geometrijske forme koje sugerišu prostor i ravnotežu. Tamnozelena #244D3E na toploj bijeloj pozadini. Precizne linije, ravni prikaz, bez mockupa i dodatnog teksta." },
  { label: "Plakat", prompt: "Tipografski plakat za izložbu naziva OBLIK. Velika izražajna slova, jasna hijerarhija, ritam i puno praznog prostora. Dvije boje: crna i terakota #DD6846 na toplom krem papiru. Eksperimentalni urednički dizajn, ravni prikaz plakata." },
  { label: "Materijal", prompt: "Studijska fotografija apstraktne skulpture od savijenog mat papira, meki lukovi i oštre geometrijske sjene. Maslinasta, krem i terakota. Bočno prirodno svjetlo, taktilna tekstura, jednostavna kompozicija, bez teksta." },
  { label: "Ambalaža", prompt: "Koncept ambalaže za izmišljeni biljni čaj LIST. Krem papir s utisnutom teksturom, tamnozelena geometrijska ilustracija lista, naziv LIST u jasnoj tipografiji. Jedna kutija na neutralnoj studijskoj podlozi, meko svjetlo i pažljivo poravnati elementi." },
  { label: "Moodboard", prompt: "Moodboard za savremeni kulturni centar: izrezani papir, teksture betona, ritmični geometrijski oblici i detalji urbanog prostora. Topla krem, tamna plava i jarko narandžasta. Uredna kompozicija povezanih vizuelnih referenci, bez logotipa i teksta." },
];
type Props = { workspace:Workspace; projects: Project[]; apply: (projectId: string, target: VisualTarget, result: GenerationResult) => Promise<boolean>; notify: (message: string) => void };
export default function Playground({ projects, apply, notify, workspace }: Props) {
  const { t, locale } = useI18n();

  const [data, setData] = useState<PlaygroundData | null>(null);
  const ref = useRef<PlaygroundData | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const importRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [applying, setApplying] = useState(false);
  const failed = useRef(false);
  const version = useRef(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [target, setTarget] = useState<VisualTarget>("logo");
  const [applyResult, setApplyResult] = useState<GenerationResult | null>(null);
  const [inspect, setInspect] = useState<GenerationResult | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(workspace.playground()).then(raw => {
      const next = raw === undefined ? { generation: newGeneration(), history: [], starred: [] } : playgroundSchema.parse(raw);
      if (!cancelled) { ref.current = next; setData(next); }
    }).catch(() => { if (!cancelled) setError("Playground nije moguće otvoriti. Provjeri dozvole za lokalno čuvanje. Postojeći eksperimenti nisu obrisani."); });
    const unsubscribe=workspace.subscribe(()=>{const next=workspace.playground();if(!cancelled&&next&&next!==ref.current){ref.current=next;setData(next);}});
    return () => { cancelled = true;unsubscribe(); };
  }, [workspace]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (saving || failed.current) event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [saving]);
  function save(next: PlaygroundData): Promise<boolean> {
    ref.current = next; setData(next); setSaving(true); const current = ++version.current;
    const result = workspace.savePlayground(playgroundSchema.parse(next)).then(() => { if (current === version.current) { setSaving(false); failed.current = false; setError(""); } return true; }).catch(() => { if (current === version.current) { setSaving(false); failed.current = true; setError("Čuvanje nije uspjelo. Preuzmi rezultate prije zatvaranja preglednika."); } return false; });
    queue.current=result;return result;
  }
  function change(patch: Partial<Generation>) {
    const current = ref.current; if (!current) return Promise.resolve(false);
    const history = patch.result ? mergeExperiments(current.history, [patch.result]) : current.history;
    return save({ ...current, generation: amendGeneration(current.generation, patch, false), history });
  }
  function toggle(id: string) { setSelected(current => current.includes(id) ? current.filter(item => item !== id) : current.length < 2 ? [...current, id] : [current[1], id]); }
  function star(id: string) {
    const current=ref.current!;const starred=current.starred.includes(id)?current.starred.filter(item=>item!==id):[...current.starred,id];
    const history=mergeExperiments(current.history,current.generation.result?[current.generation.result]:[]);
    void save({...current,history,starred});
  }
  async function restore(file?:File) {
    if(!file||!ref.current)return;setImporting(true);
    try { const next=await importPlayground(file,()=>ref.current!); const before=new Set(ref.current!.history.map(item=>item.id));const added=next.history.filter(item=>!before.has(item.id)).length;if(await save(next))notify(added?`Arhiva je uvezena. Dodato je ${added} vizuala; postojeći radovi su sačuvani.`:"Arhiva je pročitana. Svi vizuali su već u galeriji."); }
    catch(e){notify(e instanceof Error?e.message:"Uvoz nije uspio.");}finally{setImporting(false);}
  }
  if (!data) return <div className="loading-state">{error ? <p role="alert">{t(error)}</p> : <><LoaderCircle className="spin" /><p>{t("Otvaramo Playground...")}</p></>}</div>;
  const pair = data.history.filter(item => selected.includes(item.id));
  const locked = isPending(data.generation);
  const chosenProject=projects.find(project=>project.id===projectId)||projects[0];
  const visible=data.history.filter(item=>(filter==="all"||item.input.model===filter)&&(!favoritesOnly||data.starred.includes(item.id))&&`${item.input.prompt} ${models[item.input.model].label}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  function reuse(result:GenerationResult){void change({...result.input});setInspect(null);notify("Opis je vraćen u editor. Izaberi model i doradi svoju ideju.");document.querySelector<HTMLTextAreaElement>(".playground-console textarea")?.focus();}
  return <div className="playground-page page-enter"><div className="page-heading"><div><span className="eyebrow">{t("PROSTOR ZA SLOBODAN EKSPERIMENT")}</span><h1>{t("Playground")}<span className="orange">.</span></h1><p>{t("Jedna ideja. Četiri modela. Istraži šta sve može da nastane.")}</p></div><span className="playground-save"><Check size={14} />{saving ? t("Čuvanje...") : error ? t("Nije sačuvano") : workspace.owner?t("Galerija uz tvoj nalog"):t("Lokalni radni prostor")}</span></div>
    {error && <p className="form-error" role="alert">{t(error)}</p>}
    <div className="playground-layout"><div className="playground-console"><div className="playground-console-head"><FlaskConical size={20} /><span>{t("TVOJA IDEJA, TVOJA PRAVILA.")}</span><span>01—04</span></div>
      {chosenProject&&<details className="project-brief-source"><summary><FolderOpen size={16}/>{t("Kreni od svog projekta")}</summary><div><label>{t("Projekat")}<select value={chosenProject.id} onChange={e=>setProjectId(e.target.value)}>{projects.map(project=><option key={project.id} value={project.id}>{project.name||t("Bez naziva")}</option>)}</select></label><label>{t("Vrsta vizuala")}<select value={target} onChange={e=>setTarget(e.target.value as VisualTarget)}>{visualTargets.map(key=><option key={key} value={key}>{t(targetInfo[key].label)}</option>)}</select></label><button className="button secondary" disabled={locked} onClick={()=>{void change({prompt:visualBrief(chosenProject,target,locale),aspect:targetInfo[target].aspect});notify("Opis je sastavljen iz ideje, strategije i palete projekta.");}}><Sparkles size={15}/>{t("Sastavi opis iz projekta")}</button></div></details>}
      <div className="prompt-starters"><span>{t("Ili istraži primjer")}</span>{starters.map(item => <button disabled={locked} key={item.label} onClick={() => {void change({ prompt: t(item.prompt) });}}><Sparkles size={12} />{t(item.label)}</button>)}</div>
      <AiGeneration value={data.generation} onChange={change} title={t("Šta želiš da napraviš?")} filename="forma-playground"/>
      {data.generation.result && <button className="button secondary add-to-project" onClick={() => setApplyResult(data.generation.result)}><ArrowDownToLine size={15} />{t("Dodaj vizual projektu")}</button>}
    </div><section className="playground-gallery" aria-label={t("Galerija eksperimenata")}><div className="gallery-heading"><div><span className="eyebrow">{t("TVOJI EKSPERIMENTI")}</span><h2>{t("Od pokušaja do ideje")}<span className="orange">.</span></h2></div><span>{data.history.length.toString().padStart(2, "0")}</span></div><p className="gallery-description">{t("Sve generisane slike ostaju u istoriji. Zvjezdicom označi favorite, a dvije slike možeš izabrati za poređenje. Za PDF dodaj sliku projektu i označi je za izvoz.")}</p>
      <div className="gallery-actions"><button className="button secondary small" disabled={pair.length !== 2} onClick={() => setComparing(true)}><Columns2 size={15} />{t("Uporedi ")}{pair.length}/2</button><div><button className="button ghost small" disabled={importing} onClick={()=>importRef.current?.click()}>{importing?<LoaderCircle size={15} className="spin"/>:<Upload size={15}/>}{t("Uvezi arhivu")}</button><button className="button ghost small" disabled={!data.history.length} onClick={() => exportPlayground(data)}><Download size={15} />{t("Arhiva")}</button></div></div>
      {!!data.history.length&&<div className="gallery-filters"><label className="gallery-search"><Search size={16}/><input aria-label={t("Pretraži vizuale")} placeholder={t("Pretraži opis ili model...")} value={query} onChange={e=>setQuery(e.target.value)}/></label><div><select aria-label={t("Filtriraj po modelu")} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{t("Svi modeli")}</option>{modelIds.map(id=><option key={id} value={id}>{t(models[id].label)}</option>)}</select><button className={favoritesOnly?"selected":""} aria-pressed={favoritesOnly} onClick={()=>setFavoritesOnly(!favoritesOnly)}><Star size={15} fill={favoritesOnly?"currentColor":"none"}/>{t("Favoriti ")}<span>{data.starred.length}</span></button></div></div>}
      {data.history.length ? visible.length?<div className="experiment-grid">{visible.map(item => <article key={item.id} className={`experiment-card ${selected.includes(item.id) ? "selected" : ""}`}><div className="experiment-image-wrap"><button className="experiment-image" onClick={() => setInspect(item)} aria-label={t("Pogledaj vizual: {0}", {0: models[item.input.model].label})}><img src={item.image} alt={t("Eksperiment · {0}", {0: models[item.input.model].label})} loading="lazy"/></button><button className="experiment-star" aria-pressed={data.starred.includes(item.id)} aria-label={t(data.starred.includes(item.id)?"Ukloni iz favorita: {0}":"Dodaj u favorite: {0}", {0: models[item.input.model].label})} onClick={()=>star(item.id)}><Star size={16} fill={data.starred.includes(item.id)?"currentColor":"none"}/></button><button className="experiment-choose" onClick={()=>toggle(item.id)} aria-pressed={selected.includes(item.id)} aria-label={t("Izaberi za poređenje: {0}", {0: models[item.input.model].label})}>{selected.includes(item.id)?<Check size={15}/>:<Columns2 size={15}/>}</button></div><div className="experiment-meta"><strong>{t(models[item.input.model].label)}</strong><span>{item.input.aspect} · {new Intl.DateTimeFormat(formatLocales[locale], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))}</span><p>{item.input.prompt}</p><div><button className="icon-button" disabled={locked} aria-label={t("Ponovi prompt: {0}", {0: models[item.input.model].label})} title={t("Vrati opis u editor")} onClick={() => reuse(item)}><Copy size={15} /></button><button className="icon-button" aria-label={t("Dodaj ovaj vizual projektu")} onClick={() => setApplyResult(item)}><ArrowDownToLine size={15} /></button><a className="icon-button" href={item.image} download={`forma-${item.input.model}-${item.id}.webp`} aria-label={t("Preuzmi eksperiment")}><Download size={15} /></a><button className="icon-button danger-text" aria-label={t("Ukloni eksperiment")} onClick={() => setRemoveId(item.id)}><Trash2 size={14} /></button></div></div></article>)}</div>:<div className="empty-filter"><Search size={26}/><h3>{t("Nema vizuala za ovaj izbor.")}</h3><p>{t("Probaj drugi opis, model ili prikaži cijelu galeriju.")}</p><button className="button secondary" onClick={()=>{setQuery("");setFilter("all");setFavoritesOnly(false);}}>{t("Prikaži sve vizuale")}</button></div> : <div className="playground-empty"><div className="experiment-art"><span /><span /><span /></div><span className="eyebrow">{t("OVDJE POČINJE NEŠTO NOVO")}</span><h3>{t("Ostavi prostor")}<br />{t("za iznenađenje.")}</h3><p>{t("Opiši ideju, izaberi model i provjeri cijenu. Tvoj prvi vizual pojaviće se ovdje.")}</p><div className="empty-models">{Object.values(models).map(model => <span key={model.label}>{t(model.label)}</span>)}</div></div>}
      <p className="gallery-storage-note">{t("Istorija se čuva ")}{workspace.owner?t("uz tvoj nalog"):t("na ovom uređaju")}{t(". Preuzmi arhivu za rezervnu kopiju.")}</p>
    </section></div>
    <input ref={importRef} type="file" className="visually-hidden" accept=".json,application/json" aria-label={t("Uvezi Playground arhivu")} onChange={e=>{void restore(e.target.files?.[0]);e.target.value="";}}/>
    {inspect&&<VisualDetail result={inspect} onClose={()=>setInspect(null)} onPrompt={!locked?()=>reuse(inspect):undefined}/>}
    {comparing && pair.length === 2 && <Dialog wide title={t("Ista ideja. Drugačiji pogled.")} onClose={() => setComparing(false)}><div className="compare-grid">{pair.map(item => <figure key={item.id}><img src={item.image} alt={t(models[item.input.model].label)} /><figcaption><strong>{t(models[item.input.model].label)} · {item.input.aspect}</strong><p>{item.input.prompt}</p><a href={item.image} download={`forma-${item.input.model}.webp`} className="text-link">{t("Preuzmi ")}<Download size={14} /></a></figcaption></figure>)}</div></Dialog>}
    {removeId && <Dialog title={t("Ukloni eksperiment iz galerije?")} onClose={() => setRemoveId(null)}><p className="modal-intro">{t("Prije uklanjanja možeš preuzeti sliku. Vizuali već dodati projektima ostaju sačuvani u tim projektima.")}</p><div className="modal-actions"><button className="button ghost" onClick={() => setRemoveId(null)}>{t("Zadrži")}</button><button className="button danger" onClick={() => { const current = ref.current!; void save({ ...current, history: current.history.filter(item => item.id !== removeId), starred:current.starred.filter(id=>id!==removeId), generation: current.generation.result?.id === removeId ? { ...current.generation, result: null, job: current.generation.job?.id === removeId ? null : current.generation.job } : current.generation }); setSelected(ids => ids.filter(id => id !== removeId)); setRemoveId(null); }}>{t("Ukloni")}</button></div></Dialog>}
    {applyResult && <Dialog title={t("Dodaj vizual svom projektu.")} onClose={() => {if(!applying)setApplyResult(null);}}>{chosenProject ? <><p className="modal-intro">{t("Izaberi projekat i korak. Prethodni vizual ostaje među sačuvanim varijantama; logotip će postati aktivni znak projekta.")}</p><label className="select-label">{t("Projekat")}<select value={chosenProject.id} onChange={e => setProjectId(e.target.value)}>{projects.map(project => <option key={project.id} value={project.id}>{project.name || t("Bez naziva")}</option>)}</select></label><label className="select-label">{t("Korak")}<select value={target} onChange={e => setTarget(e.target.value as VisualTarget)}>{visualTargets.map(key => <option value={key} key={key}>{t(targetInfo[key].label)}</option>)}</select></label><div className="modal-actions"><button className="button primary" disabled={applying} onClick={async () => {setApplying(true);try{if(await apply(chosenProject.id,target,applyResult))setApplyResult(null);}finally{setApplying(false);}}}>{applying?<LoaderCircle size={16} className="spin"/>:<Check size={16}/>}{t("Dodaj projektu")}</button></div></> : <p className="modal-intro">{t("Prvo kreiraj projekat u odjeljku Moji projekti. Eksperiment će ostati sačuvan ovdje.")}</p>}</Dialog>}
  </div>;
}
