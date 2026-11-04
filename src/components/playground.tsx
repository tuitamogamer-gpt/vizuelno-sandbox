"use client";
import { useEffect, useRef, useState } from "react";
import { get, set } from "idb-keyval";
import { ArrowDownToLine, Check, Columns2, Copy, Download, FlaskConical, LoaderCircle, Sparkles, Trash2 } from "lucide-react";
import { Generation, GenerationResult, PlaygroundData, VisualTarget, isPending, models, newGeneration, playgroundSchema, targetInfo, visualTargets, withoutCapabilities } from "@/lib/generation";
import { Project } from "@/lib/project";
import { downloadBlob } from "@/lib/storage";
import AiGeneration from "./ai-generation";
import Dialog from "./dialog";

const storageKey = "forma:playground:v1";
const starters = [
  { label: "Znak", prompt: "Originalan minimalistički znak za mali arhitektonski studio LIN: dvije povezane geometrijske forme koje sugerišu prostor i ravnotežu. Tamnozelena #244D3E na toploj bijeloj pozadini. Precizne linije, ravni prikaz, bez mockupa i dodatnog teksta." },
  { label: "Plakat", prompt: "Tipografski plakat za izložbu naziva OBLIK. Velika izražajna slova, jasna hijerarhija, ritam i puno praznog prostora. Dvije boje: crna i terakota #DD6846 na toplom krem papiru. Eksperimentalni urednički dizajn, ravni prikaz plakata." },
  { label: "Materijal", prompt: "Studijska fotografija apstraktne skulpture od savijenog mat papira, meki lukovi i oštre geometrijske sjene. Maslinasta, krem i terakota. Bočno prirodno svjetlo, taktilna tekstura, jednostavna kompozicija, bez teksta." },
];
export default function Playground({ projects, apply, notify }: { projects: Project[]; apply: (projectId: string, target: VisualTarget, result: GenerationResult) => void; notify: (message: string) => void }) {
  const [data, setData] = useState<PlaygroundData | null>(null);
  const ref = useRef<PlaygroundData | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const failed = useRef(false);
  const version = useRef(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState("");
  const [target, setTarget] = useState<VisualTarget>("logo");
  const [applyResult, setApplyResult] = useState<GenerationResult | null>(null);
  useEffect(() => {
    let cancelled = false;
    get(storageKey).then(raw => {
      const next = raw === undefined ? { generation: newGeneration(), history: [] } : playgroundSchema.parse(raw);
      if (!cancelled) { ref.current = next; setData(next); }
    }).catch(() => { if (!cancelled) setError("Playground nije moguće otvoriti. Provjeri dozvole za lokalno čuvanje. Postojeći eksperimenti nisu obrisani."); });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (saving || failed.current) event.preventDefault(); };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [saving]);
  function save(next: PlaygroundData) {
    ref.current = next; setData(next); setSaving(true); const current = ++version.current;
    queue.current = queue.current.catch(() => {}).then(() => set(storageKey, playgroundSchema.parse(next))).then(() => { if (current === version.current) { setSaving(false); failed.current = false; setError(""); } }).catch(() => { if (current === version.current) { setSaving(false); failed.current = true; setError("Čuvanje nije uspjelo. Preuzmi rezultate prije zatvaranja preglednika."); } });
  }
  function change(patch: Partial<Generation>) {
    const current = ref.current; if (!current) return;
    const history = patch.result && !current.history.some(item => item.id === patch.result!.id) ? [patch.result, ...current.history].slice(0, 12) : current.history;
    save({ generation: { ...current.generation, ...patch }, history });
  }
  function toggle(id: string) { setSelected(current => current.includes(id) ? current.filter(item => item !== id) : current.length < 2 ? [...current, id] : [current[1], id]); }
  if (!data) return <div className="loading-state">{error ? <p role="alert">{error}</p> : <><LoaderCircle className="spin" /><p>Otvaramo Playground...</p></>}</div>;
  const pair = data.history.filter(item => selected.includes(item.id));
  const locked = isPending(data.generation);
  return <div className="playground-page page-enter"><div className="page-heading"><div><span className="eyebrow">PROSTOR ZA SLOBODAN EKSPERIMENT</span><h1>Playground<span className="orange">.</span></h1><p>Jedna ideja. Četiri modela. Istraži šta sve može da nastane.</p></div><span className="playground-save"><Check size={14} />{saving ? "Čuvanje..." : error ? "Nije sačuvano" : "Lokalni radni prostor"}</span></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="playground-layout"><div className="playground-console"><div className="playground-console-head"><FlaskConical size={20} /><span>TVOJA IDEJA, TVOJA PRAVILA.</span><span>01—04</span></div><div className="prompt-starters"><span>Kreni od primjera</span>{starters.map(item => <button disabled={locked} key={item.label} onClick={() => change({ prompt: item.prompt })}><Sparkles size={12} />{item.label}</button>)}</div><AiGeneration value={data.generation} onChange={change} title="Šta želiš da napraviš?" filename="forma-playground" />
      {data.generation.result && <button className="button secondary add-to-project" onClick={() => setApplyResult(data.generation.result)}><ArrowDownToLine size={15} />Dodaj vizual projektu</button>}
    </div><section className="playground-gallery" aria-label="Galerija eksperimenata"><div className="gallery-heading"><div><span className="eyebrow">TVOJI EKSPERIMENTI</span><h2>Od pokušaja do ideje<span className="orange">.</span></h2></div><span>{data.history.length.toString().padStart(2, "0")} / 12</span></div><p className="gallery-description">Posljednjih 12 rezultata ostaje u ovom pregledniku. Označi dvije slike za poređenje. Važne radove preuzmi ili dodaj projektu.</p>
      {!!data.history.length && <div className="gallery-actions"><button className="button secondary small" disabled={pair.length !== 2} onClick={() => setComparing(true)}><Columns2 size={15} />Uporedi {pair.length}/2</button><button className="button ghost small" onClick={() => downloadBlob(JSON.stringify({ format: "forma-playground", version: 1, generation: withoutCapabilities(data.generation), history: data.history }, null, 2), "forma-playground.json", "application/json")}><Download size={15} />Arhiva</button></div>}
      {data.history.length ? <div className="experiment-grid">{data.history.map(item => <article key={item.id} className={`experiment-card ${selected.includes(item.id) ? "selected" : ""}`}><button className="experiment-image" onClick={() => toggle(item.id)} aria-pressed={selected.includes(item.id)} aria-label={`Izaberi za poređenje: ${models[item.input.model].label}`}><img src={item.image} alt={`Eksperiment · ${models[item.input.model].label}`} /><span>{selected.includes(item.id) ? <Check size={14} /> : <Columns2 size={14} />}</span></button><div className="experiment-meta"><strong>{models[item.input.model].label}</strong><span>{item.input.aspect} · {new Intl.DateTimeFormat("sr-Latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(item.createdAt))}</span><p>{item.input.prompt}</p><div><button className="icon-button" disabled={locked} aria-label={`Ponovi prompt: ${models[item.input.model].label}`} title="Vrati prompt u editor" onClick={() => { change({ model: item.input.model, aspect: item.input.aspect, prompt: item.input.prompt }); notify("Prompt je vraćen u editor. Možeš izabrati drugi model."); }}><Copy size={15} /></button><button className="icon-button" aria-label="Dodaj ovaj vizual projektu" onClick={() => setApplyResult(item)}><ArrowDownToLine size={15} /></button><a className="icon-button" href={item.image} download={`forma-${item.input.model}-${item.id}.webp`} aria-label="Preuzmi eksperiment"><Download size={15} /></a><button className="icon-button danger-text" aria-label="Ukloni eksperiment" onClick={() => setRemoveId(item.id)}><Trash2 size={14} /></button></div></div></article>)}</div> : <div className="playground-empty"><div className="experiment-art"><span /><span /><span /></div><span className="eyebrow">OVDJE POČINJE NEŠTO NOVO</span><h3>Ostavi prostor<br />za iznenađenje.</h3><p>Opiši ideju, izaberi model i provjeri cijenu. Tvoj prvi vizual pojaviće se ovdje.</p><div className="empty-models">{Object.values(models).map(model => <span key={model.label}>{model.label}</span>)}</div></div>}
    </section></div>
    {comparing && pair.length === 2 && <Dialog wide title="Ista ideja. Drugačiji pogled." onClose={() => setComparing(false)}><div className="compare-grid">{pair.map(item => <figure key={item.id}><img src={item.image} alt={models[item.input.model].label} /><figcaption><strong>{models[item.input.model].label} · {item.input.aspect}</strong><p>{item.input.prompt}</p><a href={item.image} download={`forma-${item.input.model}.webp`} className="text-link">Preuzmi <Download size={14} /></a></figcaption></figure>)}</div></Dialog>}
    {removeId && <Dialog title="Ukloni eksperiment iz galerije?" onClose={() => setRemoveId(null)}><p className="modal-intro">Prije uklanjanja možeš preuzeti sliku. Vizuali već dodati projektima ostaju sačuvani u tim projektima.</p><div className="modal-actions"><button className="button ghost" onClick={() => setRemoveId(null)}>Zadrži</button><button className="button danger" onClick={() => { const current = ref.current!; save({ ...current, history: current.history.filter(item => item.id !== removeId), generation: current.generation.result?.id === removeId ? { ...current.generation, result: null, job: current.generation.job?.id === removeId ? null : current.generation.job } : current.generation }); setSelected(ids => ids.filter(id => id !== removeId)); setRemoveId(null); }}>Ukloni</button></div></Dialog>}
    {applyResult && <Dialog title="Dodaj vizual svom projektu." onClose={() => setApplyResult(null)}>{projects.length ? <><p className="modal-intro">Izaberi projekat i korak. Vizual će zamijeniti prethodni rezultat u tom koraku; logotip će postati aktivni znak projekta.</p><label className="select-label">Projekat<select value={projectId || projects[0].id} onChange={e => setProjectId(e.target.value)}>{projects.map(project => <option key={project.id} value={project.id}>{project.name || "Bez naziva"}</option>)}</select></label><label className="select-label">Korak<select value={target} onChange={e => setTarget(e.target.value as VisualTarget)}>{visualTargets.map(key => <option value={key} key={key}>{targetInfo[key].label}</option>)}</select></label><div className="modal-actions"><button className="button primary" onClick={() => { apply(projectId || projects[0].id, target, applyResult); setApplyResult(null); }}><Check size={16} />Dodaj projektu</button></div></> : <p className="modal-intro">Prvo kreiraj projekat u odjeljku Moji projekti. Eksperiment će ostati sačuvan ovdje.</p>}</Dialog>}
  </div>;
}
