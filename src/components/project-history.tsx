"use client";

import { useRef, useState } from "react";
import { Check, Download, History, Maximize2, RotateCcw, Trash2 } from "lucide-react";
import { generationHistory, imageExtension, isPending, models, visualKey, type Generation, type GenerationResult, type VisualTarget } from "@/lib/generation";
import { formatLocales } from "@/lib/i18n/core";
import { useI18n } from "./language-provider";
import Dialog from "./dialog";
import VisualDetail from "./visual-detail";

type Props = {
  value: Generation;
  target: VisualTarget;
  selected: string[];
  onRestore: (result: GenerationResult) => void;
  onSelect: (id: string, checked: boolean) => void;
  /** Removes an image only after the student confirms it. */
  onRemove?: (result: GenerationResult) => void;
  /** The image currently used as the project logo cannot be removed from history. */
  logoImage?: string;
};

export default function ProjectHistory({ value, target, selected, onRestore, onSelect, onRemove, logoImage }: Props) {
  const { t, locale } = useI18n();
  const [limit, setLimit] = useState(12);
  const [inspect, setInspect] = useState<GenerationResult | null>(null);
  const [removing, setRemoving] = useState<{ result: GenerationResult; label: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const history = generationHistory(value);
  const pending = isPending(value);
  const count = history.filter(item => selected.includes(visualKey(target, item.id))).length;
  const date = new Intl.DateTimeFormat(formatLocales[locale], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  function confirmRemoval() {
    if (!removing || !onRemove) return;
    onRemove(removing.result);
    setRemoving(null);
    // The card that opened the dialog no longer exists; keep keyboard focus in this section.
    requestAnimationFrame(() => heading.current?.focus());
  }
  return <section className="project-history" aria-label={t("Istorija generisanih slika")}>
    <div className="history-heading"><h3 ref={heading} tabIndex={-1}><History size={18} />{t("Istorija generisanih slika")}</h3><span aria-live="polite">{t("Sačuvano: {0} · Za PDF: {1}", { 0: history.length, 1: count })}</span></div>
    <p className="small-muted">{t("Sve prethodne slike ostaju sačuvane. Označi samo slike koje želiš u finalnom PDF-u. Nove slike nisu automatski označene.")}</p>
    {!history.length && <p className="history-empty">{t("Generisane slike će se pojaviti ovdje, zajedno sa opisom, modelom i datumom.")}</p>}
    <div className="history-grid">{history.slice(0, limit).map((item, index) => {
      const key = visualKey(target, item.id), checked = selected.includes(key), active = item.id === value.result?.id;
      const label = t("Slika {0}", { 0: history.length - index });
      const isLogo = !!logoImage && item.image === logoImage;
      return <article className={`history-card ${checked ? "selected" : ""}`} key={item.id}>
        <button type="button" className="history-image" aria-label={t("Pogledaj detalje: {0}", { 0: label })} onClick={() => setInspect(item)}><img src={item.image} alt={label} loading="lazy" /><span><Maximize2 size={14} />{t("Pogledaj detalje")}</span></button>
        <div className="history-meta"><strong>{label} · {models[item.input.model].label}</strong><small>{item.input.aspect} · {date.format(new Date(item.createdAt))}</small>
          {isLogo && <span className="history-badge">{t("Logotip projekta")}</span>}
          <label className="image-pdf-check"><input type="checkbox" checked={checked} onChange={event => onSelect(key, event.target.checked)} aria-label={t("Uključi u PDF: {0}", { 0: label })} /><span>{t("Uključi u PDF")}</span></label>
          <div className="history-actions">
            <button type="button" className="button ghost small history-restore" disabled={pending} aria-pressed={active} onClick={() => onRestore(item)}>{active ? <Check size={14} /> : <RotateCcw size={14} />}{active ? t("Odabrana") : t("Vrati varijantu")}</button>
            {onRemove && !isLogo && <button type="button" className="icon-button history-remove danger-text" disabled={pending} title={t("Ukloni iz istorije")} aria-label={t("Ukloni iz istorije: {0}", { 0: label })} onClick={() => setRemoving({ result: item, label })}><Trash2 size={15} /></button>}
          </div>
        </div>
      </article>;
    })}</div>
    {history.length > limit && <button type="button" className="button secondary small" onClick={() => setLimit(n => n + 12)}>{t("Prikaži još slika")}</button>}
    {!!history.length && <p className="small-muted">{t("Pregled i vraćanje slike ne pokreću novo generisanje. Izbor za PDF možeš promijeniti i u prozoru za izvoz.")}</p>}
    {!!onRemove && !!history.length && <p className="small-muted">{t("Nepotrebnu sliku možeš ukloniti iz istorije.")}{logoImage !== undefined ? ` ${t("Aktivni logotip ostaje sačuvan dok ga ne zamijeniš.")}` : ""}</p>}
    {inspect && <VisualDetail result={inspect} onClose={() => setInspect(null)} />}
    {removing && <Dialog title={t("Ukloniti sliku iz istorije?")} onClose={() => setRemoving(null)}>
      <div className="history-remove-preview"><img src={removing.result.image} alt={removing.label} /><span><strong>{removing.label} · {models[removing.result.input.model].label}</strong><small>{date.format(new Date(removing.result.createdAt))}</small></span></div>
      <p className="modal-intro">{t("Slika se uklanja iz ovog koraka i iz izbora za PDF. Već preuzeti dokumenti i predate verzije ostaju nepromijenjeni. Prije uklanjanja možeš preuzeti sliku.")}{removing.result.id === value.result?.id ? ` ${t("Ovo je odabrana varijanta; najnovija preostala slika postaće odabrana.")}` : ""}</p>
      <a className="button secondary" href={removing.result.image} download={`forma-${target}-${removing.result.id}.${imageExtension(removing.result.image)}`}><Download size={16} />{t("Preuzmi sliku")}</a>
      <div className="modal-actions"><button type="button" className="button ghost" onClick={() => setRemoving(null)}>{t("Zadrži")}</button><button type="button" className="button danger" disabled={pending} onClick={confirmRemoval}><Trash2 size={16} />{t("Ukloni sliku")}</button></div>
    </Dialog>}
  </section>;
}
