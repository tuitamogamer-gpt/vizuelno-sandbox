"use client";
import { useI18n } from "@/components/language-provider";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, Download, Info, LoaderCircle, RefreshCw, Sparkles, Maximize2, WifiOff } from "lucide-react";
import { Aspect, Generation, GenerationInput, GenerationRequest, GenerationResult, aspects, inputKey, isPending, modelIds, models } from "@/lib/generation";
import { downloadBlob, readImage } from "@/lib/storage";

import { useOnline } from "@/lib/browser-state";
import VisualDetail from "./visual-detail";

class ApiError extends Error { constructor(message: string, public uncertain?: boolean) { super(message); } }
async function api(path: string, body: unknown) {
  let response:Response;
  try { response=await fetch(`/api/ai/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal:AbortSignal.timeout(path==="generate"?65000:35000) }); }
  catch { throw new ApiError("Veza sa servisom je prekinuta. Provjeri internet i pokušaj ponovo."); }
  const data = await response.json().catch(()=>({error:"Servis je vratio nečitljiv odgovor. Pokušaj ponovo."}));
  if (!response.ok) throw new ApiError(data.error || "Servis trenutno nije dostupan.", data.uncertain);
  return data;
}
type Quote = { token: string; requestId: string; price: number; expiresAt: number; input: GenerationInput };
export default function AiGeneration({ value, onChange, title = "Od ideje do vizuala.", filename = "forma-vizual", onUse, showVariants = false, blockedReason = "" }: {
  value: Generation; onChange: (patch: Partial<Generation>) => void | Promise<boolean>; title?: string; filename?: string; onUse?: (result: GenerationResult) => void; showVariants?:boolean; blockedReason?:string;
}) {
  const { t } = useI18n();

  const id = useId();
  const online=useOnline();
  const [inspect,setInspect]=useState<GenerationResult|null>(null);
  const [downloading,setDownloading]=useState(false);
  const [availabilityError,setAvailabilityError]=useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [availabilityCheck,setAvailabilityCheck]=useState(0);
  const changeRef = useRef(onChange);
  const { job, result } = value;
  const completed = !!job && result?.id === job.id;
  const pending = isPending(value);
  const locked = busy || pending;
  const input: GenerationInput = { model: value.model, aspect: value.aspect, prompt: value.prompt.trim() };
  const matchingQuote = quote && inputKey(quote.input) === inputKey(input);
  useEffect(() => { changeRef.current = onChange; }, [onChange]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/status").then(async r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => { if (!cancelled) setAvailable(d.available); }).catch(() => { if (!cancelled) {setAvailable(false); setAvailabilityError(true);} });
    return () => { cancelled = true; };
  }, [availabilityCheck]);
  useEffect(() => { if (!quote) return; const timer = setTimeout(() => setQuote(null), Math.max(0, quote.expiresAt - Date.now())); return () => clearTimeout(timer); }, [quote]);
  useEffect(() => {
    if (!job || job.status === "failed" || completed) return;
    let cancelled = false; let timer: ReturnType<typeof setTimeout>; let attempts = 0;
    const current = job;
    async function poll() {
      setPolling(true);
      try {
        const status = await api("job", { token: current.token }); if (cancelled) return;
        if (status.status === "failed") { changeRef.current({ job: { ...current, status: "failed" } }); setError(status.error || "Generisanje nije uspjelo."); setPolling(false); return; }
        if (status.status === "completed") {
          const response = await fetch("/api/ai/result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: current.token }), signal:AbortSignal.timeout(65000) });
          if (!response.ok) { const d = await response.json(); throw new Error(d.error || "Preuzimanje nije uspjelo."); }
          const blob = await response.blob(); const image = await readImage(new File([blob], "pika.png", { type: blob.type })); if (cancelled) return;
          changeRef.current({ result: { id: current.id, image, input: current.input, createdAt: new Date().toISOString(), ...(typeof status.charge === "number" ? { charge: status.charge } : {}) }, job: { ...current, status: "completed" } }); setPolling(false); return;
        }
        if (++attempts >= 120) { setPolling(false); setError("Generisanje još traje. Provjeri status ponovo; novi zahtjev nije potreban."); return; }
        timer = setTimeout(() => { void poll(); }, 3000);
      } catch (e) { if (!cancelled) { setPolling(false); setError(e instanceof Error ? e.message : "Status nije dostupan. Provjeri ponovo."); } }
    }
    void poll(); return () => { cancelled = true; clearTimeout(timer); };
  }, [job, completed, retry]);
  async function getQuote() {
    setBusy(true); setError("");
    try { const data = await api("quote", input); setQuote({ ...data, input }); }
    catch (e) { setError(e instanceof Error ? e.message : "Cijena nije dostupna."); }
    finally { setBusy(false); }
  }
  async function generate(existing?: GenerationRequest) {
    if (!existing && !matchingQuote) return;
    setBusy(true); setError("");
    const body = existing || { ...quote!.input, quoteToken: quote!.token, requestId: quote!.requestId };
    try {
      const persisted=await onChange({ request: body });
      if(persisted===false){setError("Zahtjev nije sačuvan u pregledniku. Oslobodi prostor ili preuzmi rezervnu kopiju prije generisanja.");setBusy(false);return;}
      const next = await api("generate", body);
      changeRef.current({ request: null, job: { id: next.id, status: next.status, token: next.token, input: { model: body.model, aspect: body.aspect, prompt: body.prompt } } });
      setQuote(null); if (next.status === "failed") setError(next.error || "Generisanje nije uspjelo.");
    } catch (e) {
      const knownRejection = !existing && e instanceof ApiError && e.uncertain === false;
      if (knownRejection) { changeRef.current({ request: null }); setQuote(null); }
      setError(`${e instanceof Error ? e.message : "Veza je prekinuta."}${knownRejection ? "\nZahtjev nije poslat modelu." : "\nNastavi isti zahtjev ispod da izbjegneš duplo generisanje."}`);
    } finally { setBusy(false); }
  }
  async function original(){
    if(!job||!result||job.id!==result.id)return;setDownloading(true);setError("");
    try{const response=await fetch("/api/ai/result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:job.token}),signal:AbortSignal.timeout(65000)});if(!response.ok)throw new Error("Original trenutno nije dostupan. Sačuvani vizual možeš preuzeti kao WebP.");const blob=await response.blob();downloadBlob(blob,`${filename}-original.${blob.type.includes("png")?"png":blob.type.includes("jpeg")?"jpg":"webp"}`,blob.type);}catch(e){setError(e instanceof Error?e.message:"Preuzimanje originala nije uspjelo.");}finally{setDownloading(false);}
  }
  return <section className="generation-panel" aria-label={t(title)}>
    <div className="mini-heading"><span>{t("PIKA API CLUB · IMAGE GENERATION")}</span><Sparkles size={15} /></div><h3>{t(title)}</h3>
    <fieldset className="model-picker" disabled={locked}><legend>{t("Izaberi model")}</legend><div>{modelIds.map(model => <button type="button" key={model} className={value.model === model ? "selected" : ""} onClick={() => onChange({ model })} aria-pressed={value.model === model}><span><strong>{t(models[model].label)}</strong><small>{models[model].detail}</small></span>{value.model === model && <Check size={15} />}</button>)}</div></fieldset>
    <p className="model-note">{t(models[value.model].note)}</p>
    <fieldset className="aspect-picker" disabled={locked}><legend>{t("Format slike")}</legend><div>{aspects.map(aspect => <button type="button" key={aspect} onClick={() => onChange({ aspect: aspect as Aspect })} aria-pressed={value.aspect === aspect} className={value.aspect === aspect ? "selected" : ""}><i style={{ aspectRatio: aspect.replace(":", "/") }} /><span>{aspect}</span></button>)}</div></fieldset>
    <div className="field prompt-field"><label htmlFor={`${id}-prompt`}>{t("Opis vizuala ")}<span>{t("prompt · ")}{value.prompt.length}/6000</span></label><textarea id={`${id}-prompt`} value={value.prompt} maxLength={6000} rows={8} disabled={locked} onChange={e => onChange({ prompt: e.target.value })} placeholder={t("Opiši šta želiš da nastane: motiv, stil, kompoziciju, boje, svjetlo i tekst koji treba prikazati.")} /><p className="field-hint">{t("Najmanje 20 znakova. Jedna slika po potvrdi; prompt se šalje izabranom modelu preko Pike.")}</p></div>
    {available === null ? <p className="generation-status"><LoaderCircle className="spin" size={15} />{t("Provjera dostupnosti...")}</p> : !available ? <div className="generation-unavailable"><Info size={17} /><div><p>{availabilityError?t("Dostupnost servisa nije moguće provjeriti. Sačuvani vizuali i opis ostaju uz projekat."):t("Modeli su pripremljeni. Generisanje se aktivira kada nastavnik doda Pika API ključ.")}</p><button className="text-button availability-retry" onClick={()=>{setAvailable(null);setAvailabilityError(false);setAvailabilityCheck(n=>n+1);}}>{t("Provjeri dostupnost ponovo")}</button><Link href="/postavke" target="_blank" className="text-link">{t("Unos ključa i provjera veze ↗")}</Link></div></div> : <>
      {value.request ? <div className="generation-pending"><p>{t("Prethodni zahtjev nema potvrđen odgovor. Nastavi isti zahtjev da izbjegneš duplu naplatu.")}</p><button className="button secondary" disabled={busy||!online} onClick={() => { void generate(value.request!); }}><RefreshCw size={15} />{t("Nastavi isti zahtjev")}</button><p className="small-muted">{t("Ako je potvrda cijene istekla, nastavnik treba provjeriti Pika istoriju. Sačuvani rezultat ostaje dostupan.")}</p></div> : pending ? <div className="generation-pending"><p className="generation-status" role="status">{polling && <LoaderCircle size={17} className="spin" />}{polling ? t("Vizual nastaje. Možeš nastaviti rad u drugim koracima.") : t("Zahtjev je sačuvan. Provjeri da li je vizual spreman.")}</p>{!polling && <button className="button secondary" onClick={() => { setError(""); setRetry(n => n + 1); }}><RefreshCw size={15} />{t("Provjeri status")}</button>}</div> : <>
        {matchingQuote ? <div className="quote-confirm"><p>{t(models[input.model].label)} · {input.aspect}<br />{t("Procjena za jednu sliku: ")}<strong>${quote!.price.toFixed(4)}</strong></p><button className="button primary" disabled={busy||!online||!!blockedReason} onClick={() => { void generate(); }}>{busy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}{t("Generiši vizual")}</button></div> : <button className="button primary" disabled={busy || input.prompt.length < 20 || !online || !!blockedReason} onClick={getQuote}>{busy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}{t("Provjeri cijenu")}</button>}
        <p className="generation-disclosure">{t("Koristi se kredit nastavnika. Kod modela koji se obračunavaju po tokenima konačna potrošnja može se razlikovati od procjene.")}</p>
      </>}
    </>}
    {!online&&<p className="generation-network" role="status"><WifiOff size={16}/>{t("Za generisanje je potrebna internet veza.")}</p>}{blockedReason&&<p className="generation-network">{t(blockedReason)}</p>}
    {error && <p className="form-error" role="alert">{error.split("\n").map(line => t(line)).join(" ")}</p>}
    {result && <div className="generation-result"><button className="result-image-button" onClick={()=>setInspect(result)} aria-label={t("Otvori veliki pregled vizuala")}><img src={result.image} alt={t("Generisani vizual · {0}", {0: models[result.input.model].label})} /><span><Maximize2 size={17}/>{t("Pogledaj detalje")}</span></button><span className="eyebrow">{t(models[result.input.model].label)} · {result.input.aspect}{result.charge !== undefined ? ` · $${result.charge.toFixed(4)}` : ""}{pending ? t(" · PRETHODNI REZULTAT") : t(" · SAČUVANO U PREGLEDNIKU")}</span><div>{onUse && <button className="button dark" onClick={() => onUse(result)}><Check size={15} />{t("Postavi kao logotip")}</button>}<a className="button secondary" href={result.image} download={`${filename}.webp`}><Download size={15} />{t("Preuzmi vizual")}</a>{job?.id===result.id&&job.status==="completed"&&<button className="button secondary" disabled={downloading||!online} onClick={()=>{void original();}}>{downloading?<LoaderCircle className="spin" size={15}/>:<Download size={15}/>}{t("Original")}</button>}</div></div>}
    {showVariants&&result&&value.alternatives.length>0&&<div className="variant-history"><div className="mini-heading"><span>{t("SAČUVANE VARIJANTE")}</span><span>{value.alternatives.length+1} / 3</span></div><p>{t("Uporedi prethodne pokušaje. Izbor varijante ne pokreće novo generisanje.")}</p><div>{[result,...value.alternatives].map((item,i)=><button key={item.id} disabled={locked} aria-pressed={i===0} onClick={()=>{void onChange({...item.input,result:item,job:null,request:null});}}><img src={item.image} alt={t("Varijanta {0} · {1}", {0: i+1, 1: models[item.input.model].label})}/><span>{i===0?<><Check size={12}/>{t("Odabrana")}</>:t("Vrati varijantu")}</span><small>{t(models[item.input.model].label)}</small></button>)}</div></div>}
    {inspect&&<VisualDetail result={inspect} onClose={()=>setInspect(null)} onPrompt={!locked?()=>{void onChange({...inspect.input});setInspect(null);}:undefined}/>}
  </section>;
}
