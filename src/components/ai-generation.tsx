"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Download, Info, LoaderCircle, RefreshCw, Sparkles } from "lucide-react";
import { Project } from "@/lib/project";
import { readImage, slug } from "@/lib/storage";

async function api(path: string, body: unknown) {
  const response = await fetch(`/api/ai/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Servis trenutno nije dostupan.");
  return data;
}
export default function AiGeneration({ project, prompt, update }: { project: Project; prompt: string; update: (p: Partial<Project>) => void }) {
  const [available,setAvailable]=useState<boolean|null>(null);
  const [quote,setQuote]=useState<{token:string;price:number;prompt:string}|null>(null);
  const [busy,setBusy]=useState(false);
  const [polling,setPolling]=useState(false);
  const [error,setError]=useState("");
  const [retry,setRetry]=useState(0);
  const updateRef=useRef(update);
  const token=project.aiJob?.token;
  const jobStatus=project.aiJob?.status;
  const jobId=project.aiJob?.id;
  const hasImage=!!project.aiImage;
  useEffect(()=>{updateRef.current=update;},[update]);
  useEffect(()=>{let cancelled=false;fetch("/api/ai/status").then(async r=>{if(!r.ok)throw new Error();return r.json();}).then(d=>{if(!cancelled)setAvailable(d.available);}).catch(()=>{if(!cancelled)setAvailable(false);});return()=>{cancelled=true;};},[]);
  useEffect(()=>{
    if(!token||!jobId||jobStatus==="failed"||hasImage)return;
    let cancelled=false;let timer:ReturnType<typeof setTimeout>;let attempts=0;
    async function poll(){
      setPolling(true);
      try{
        const job=await api("job",{token});if(cancelled)return;
        if(job.status==="failed"){updateRef.current({aiJob:{id:jobId!,token:token!,status:"failed"}});setError(job.error||"Generisanje nije uspjelo.");setPolling(false);return;}
        if(job.status==="completed"){
          const response=await fetch("/api/ai/result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
          if(!response.ok){const d=await response.json();throw new Error(d.error||"Preuzimanje nije uspjelo.");}
          const blob=await response.blob();const image=await readImage(new File([blob],"pika.png",{type:blob.type}));if(cancelled)return;
          updateRef.current({aiImage:image,aiJob:{id:jobId!,token:token!,status:"completed"}});setPolling(false);return;
        }
        if(++attempts>=120){setPolling(false);setError("Generisanje još traje. Provjeri status ponovo; novi zahtjev nije potreban.");return;}
        timer=setTimeout(()=>{void poll();},3000);
      }catch(e){if(!cancelled){setPolling(false);setError(e instanceof Error?e.message:"Status nije dostupan. Provjeri ponovo.");}}
    }
    void poll();return()=>{cancelled=true;clearTimeout(timer);};
  },[token,jobStatus,jobId,hasImage,retry]);
  async function getQuote(){setBusy(true);setError("");try{const data=await api("quote",{prompt});setQuote({...data,prompt});}catch(e){setError(e instanceof Error?e.message:"Cijena nije dostupna.");}finally{setBusy(false);}}
  async function generate(existing?:NonNullable<Project["aiRequest"]>){
    if(!existing&&!quote)return;setBusy(true);setError("");
    const body=existing||{prompt,quoteToken:quote!.token,requestId:crypto.randomUUID()};
    update({aiRequest:body,aiPrompt:body.prompt});
    try{const job=await api("generate",body);updateRef.current({aiRequest:null,aiJob:{id:job.id,status:job.status,token:job.token},aiImage:"",aiPrompt:body.prompt});setQuote(null);if(job.status==="failed")setError(job.error||"Generisanje nije uspjelo.");}
    catch(e){setError(`${e instanceof Error?e.message:"Veza je prekinuta."} Za nastavak koristi isti zahtjev ispod; to sprečava duplo generisanje.`);}
    finally{setBusy(false);}
  }
  const pending=!!token&&!hasImage&&jobStatus!=="failed";
  return <section className="generation-panel"><div className="mini-heading"><span>PIKA API CLUB</span><Sparkles size={15}/></div><h3>Od briefa do prve skice.</h3><p>Nano Banana 2 · jedna slika · 1K · kvadratni format</p>{available===null?<p className="generation-status"><LoaderCircle className="spin" size={15}/>Provjera dostupnosti...</p>:!available?<div className="generation-unavailable"><Info size={17}/><p>Generisanje čeka nastavnikov API ključ. Brief možeš sačuvati i koristiti odmah.</p></div>:<>
      <p className="generation-disclosure">Generisanjem šalješ ovaj brief servisu Pika. Koristi se kredit nastavnika; cijenu vidiš prije potvrde.</p>
      {project.aiRequest?<div className="generation-pending"><p>Prethodni zahtjev nema potvrđen odgovor. Nastavi isti zahtjev da izbjegneš duplu naplatu.</p><button className="button secondary" disabled={busy} onClick={()=>{void generate(project.aiRequest!);}}><RefreshCw size={15}/>Nastavi isti zahtjev</button><p className="small-muted">Ako je potvrda cijene istekla, nastavnik treba provjeriti Pika istoriju prije novog pokušaja.</p></div>:pending?<div className="generation-pending"><p className="generation-status">{polling&&<LoaderCircle size={17} className="spin"/>}{polling?"Skica nastaje. Možeš nastaviti uređivati projekat.":"Zahtjev je sačuvan. Provjeri da li je skica spremna."}</p>{!polling&&<button className="button secondary" onClick={()=>{setError("");setRetry(n=>n+1);}}><RefreshCw size={15}/>Provjeri status</button>}</div>:<>{quote&&quote.prompt===prompt?<div className="quote-confirm"><p>Jedna skica · <strong>${quote.price.toFixed(4)}</strong></p><button className="button primary" disabled={busy} onClick={()=>{void generate();}}>{busy?<LoaderCircle size={16} className="spin"/>:<Sparkles size={16}/>}Generiši jednu skicu</button></div>:<button className="button secondary" disabled={busy||prompt.trim().length<20} onClick={getQuote}>{busy?<LoaderCircle size={16} className="spin"/>:<Sparkles size={16}/>}Provjeri cijenu skice</button>}</>}
    </>}{error&&<p className="form-error" role="alert">{error}</p>}
    {project.aiImage&&<div className="generation-result"><img src={project.aiImage} alt={`AI skica za ${project.name}`}/><span className="eyebrow">AI SKICA · POLAZIŠTE ZA TVOJU DORADU</span><div><button className="button dark" onClick={()=>update({logoImage:project.aiImage,aiDisclosure:project.aiDisclosure||"Početna skica generisana pomoću Nano Banana 2 preko Pika API Club. Autorske dorade: [opiši svoje izmjene]."})}><Check size={15}/>Koristi kao logotip</button><a className="button secondary" href={project.aiImage} download={`${slug(project.name)}-ai-skica.webp`}><Download size={15}/>Preuzmi</a></div></div>}
  </section>;
}
