"use client";
import { useState } from "react";
import { Check, Copy, Download, RotateCcw } from "lucide-react";
import { GenerationResult, models } from "@/lib/generation";
import Dialog from "./dialog";
export default function VisualDetail({ result, onClose, onPrompt }: { result: GenerationResult; onClose: () => void; onPrompt?: () => void }) {
  const [copied,setCopied]=useState(false);
  const [error,setError]=useState("");
  return <Dialog wide title="Pogledaj svaki detalj." onClose={onClose}><div className="visual-detail"><img src={result.image} alt={`Vizual · ${models[result.input.model].label}`}/><div className="visual-detail-meta"><strong>{models[result.input.model].label}</strong><span>{result.input.aspect}</span><span>{new Intl.DateTimeFormat("sr-Latn",{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}).format(new Date(result.createdAt))}</span>{result.charge!==undefined&&<span>${result.charge.toFixed(4)}</span>}</div><details open><summary>Korišteni opis</summary><p>{result.input.prompt}</p></details><div className="visual-detail-actions"><a className="button secondary" href={result.image} download={`forma-${result.input.model}.webp`}><Download size={16}/>Preuzmi vizual</a><button className="button secondary" onClick={async()=>{try{await navigator.clipboard.writeText(result.input.prompt);setCopied(true);}catch{setError("Kopiranje nije dostupno. Označi i kopiraj opis iznad.");}}}>{copied?<Check size={16}/>:<Copy size={16}/>}Kopiraj opis</button>{onPrompt&&<button className="button dark" onClick={onPrompt}><RotateCcw size={16}/>Vrati opis u editor</button>}</div>{error&&<p className="form-error" role="alert">{error}</p>}</div></Dialog>;
}
