"use client";

import { useState } from "react";
import { Check, History, Maximize2, RotateCcw } from "lucide-react";
import { generationHistory, isPending, models, visualKey, type Generation, type GenerationResult, type VisualTarget } from "@/lib/generation";
import { formatLocales } from "@/lib/i18n/core";
import { useI18n } from "./language-provider";
import VisualDetail from "./visual-detail";

type Props = {
  value: Generation;
  target: VisualTarget;
  selected: string[];
  onRestore: (result: GenerationResult) => void;
  onSelect: (id: string, checked: boolean) => void;
};

export default function ProjectHistory({ value, target, selected, onRestore, onSelect }: Props) {
  const { t, locale } = useI18n();
  const [limit, setLimit] = useState(12);
  const [inspect, setInspect] = useState<GenerationResult | null>(null);
  const history = generationHistory(value);
  const count = history.filter(item => selected.includes(visualKey(target, item.id))).length;
  const date = new Intl.DateTimeFormat(formatLocales[locale], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return <section className="project-history" aria-label={t("Istorija generisanih slika")}>
    <div className="history-heading"><h3><History size={18} />{t("Istorija generisanih slika")}</h3><span aria-live="polite">{t("Sačuvano: {0} · Za PDF: {1}", { 0: history.length, 1: count })}</span></div>
    <p className="small-muted">{t("Sve prethodne slike ostaju sačuvane. Označi samo slike koje želiš u finalnom PDF-u. Nove slike nisu automatski označene.")}</p>
    {!history.length && <p className="history-empty">{t("Generisane slike će se pojaviti ovdje, zajedno sa opisom, modelom i datumom.")}</p>}
    <div className="history-grid">{history.slice(0, limit).map((item, index) => {
      const key = visualKey(target, item.id), checked = selected.includes(key), active = item.id === value.result?.id;
      const label = t("Slika {0}", { 0: history.length - index });
      return <article className={`history-card ${checked ? "selected" : ""}`} key={item.id}>
        <button type="button" className="history-image" aria-label={t("Pogledaj detalje: {0}", { 0: label })} onClick={() => setInspect(item)}><img src={item.image} alt={label} loading="lazy" /><span><Maximize2 size={14} />{t("Pogledaj detalje")}</span></button>
        <div className="history-meta"><strong>{label} · {models[item.input.model].label}</strong><small>{item.input.aspect} · {date.format(new Date(item.createdAt))}</small>
          <label className="image-pdf-check"><input type="checkbox" checked={checked} onChange={event => onSelect(key, event.target.checked)} aria-label={t("Uključi u PDF: {0}", { 0: label })} /><span>{t("Uključi u PDF")}</span></label>
          <button type="button" className="button ghost small history-restore" disabled={isPending(value)} aria-pressed={active} onClick={() => onRestore(item)}>{active ? <Check size={14} /> : <RotateCcw size={14} />}{active ? t("Odabrana") : t("Vrati varijantu")}</button>
        </div>
      </article>;
    })}</div>
    {history.length > limit && <button type="button" className="button secondary small" onClick={() => setLimit(n => n + 12)}>{t("Prikaži još slika")}</button>}
    {!!history.length && <p className="small-muted">{t("Pregled i vraćanje slike ne pokreću novo generisanje. Izbor za PDF možeš promijeniti i u prozoru za izvoz.")}</p>}
    {inspect && <VisualDetail result={inspect} onClose={() => setInspect(null)} />}
  </section>;
}
