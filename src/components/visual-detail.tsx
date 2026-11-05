"use client";
import { formatLocales } from "@/lib/i18n/core";
import { useI18n } from "@/components/language-provider";

import { useState } from "react";
import { Check, Copy, Download, RotateCcw } from "lucide-react";
import { GenerationResult, models } from "@/lib/generation";
import Dialog from "./dialog";
export default function VisualDetail({ result, onClose, onPrompt }: { result: GenerationResult; onClose: () => void; onPrompt?: () => void }) {
  const { t, locale } = useI18n();

  const [copied,setCopied]=useState(false);
  const [error,setError]=useState("");
  return <Dialog wide title={t("Pogledaj svaki detalj.")} onClose={onClose}><div className="visual-detail"><img src={result.image} alt={`Vizual · ${models[result.input.model].label}`}/><div className="visual-detail-meta"><strong>{t(models[result.input.model].label)}</strong><span>{result.input.aspect}</span><span>{new Intl.DateTimeFormat(formatLocales[locale],{day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"}).format(new Date(result.createdAt))}</span>{result.charge!==undefined&&<span>${result.charge.toFixed(4)}</span>}</div><details open><summary>{t("Korišteni opis")}</summary><p>{result.input.prompt}</p></details><div className="visual-detail-actions"><a className="button secondary" href={result.image} download={`forma-${result.input.model}.webp`}><Download size={16}/>{t("Preuzmi vizual")}</a><button className="button secondary" onClick={async()=>{try{await navigator.clipboard.writeText(result.input.prompt);setCopied(true);}catch{setError("Kopiranje nije dostupno. Označi i kopiraj opis iznad.");}}}>{copied?<Check size={16}/>:<Copy size={16}/>}{t("Kopiraj opis")}</button>{onPrompt&&<button className="button dark" onClick={onPrompt}><RotateCcw size={16}/>{t("Vrati opis u editor")}</button>}</div>{error&&<p className="form-error" role="alert">{t(error)}</p>}</div></Dialog>;
}
