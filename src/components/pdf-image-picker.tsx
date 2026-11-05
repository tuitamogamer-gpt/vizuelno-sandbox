"use client";

import { useState } from "react";
import { targetInfo, visualTargets } from "@/lib/generation";
import { type PdfVisual } from "@/lib/pdf/options";
import { useI18n } from "./language-provider";

export default function PdfImagePicker({ visuals, selected, onChange, disabled }: {
  visuals: PdfVisual[]; selected: string[]; onChange: (ids: string[]) => void; disabled: boolean;
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const count = visuals.filter(v => selected.includes(v.key)).length;
  const shown = expanded ? visuals : visuals.slice(0, 12);
  return <section className="pdf-image-picker" aria-label={t("Slike za finalni PDF")}>
    <div className="history-heading"><h3>{t("Slike za finalni PDF")}</h3><span aria-live="polite">{t("Označeno: {0} od {1}", { 0: count, 1: visuals.length })}</span></div>
    <p className="small-muted">{t("U PDF ulaze samo označene slike. Ovo važi i za logotip na naslovnici i memorandumu.")}</p>
    {!!visuals.length && <div className="pdf-selection-actions"><button type="button" className="text-button" disabled={disabled || count === visuals.length} onClick={() => onChange(visuals.map(v => v.key))}>{t("Označi sve")}</button><button type="button" className="text-button" disabled={disabled || !count} onClick={() => onChange([])}>{t("Poništi izbor")}</button></div>}
    {visualTargets.map(target => {
      const items = shown.filter(v => v.target === target);
      if (!items.length) return null;
      return <div className="pdf-image-group" key={target}><h4>{t(targetInfo[target].label)}</h4><div className="pdf-image-grid">{items.map(visual => <label key={visual.key} className={`pdf-image-option ${selected.includes(visual.key) ? "selected" : ""}`}>
        <img src={visual.image} alt="" loading="lazy" />
        <span><input type="checkbox" disabled={disabled} checked={selected.includes(visual.key)} aria-label={t("Uključi u PDF: {0}", { 0: visual.caption })} onChange={event => onChange(event.target.checked ? [...new Set([...selected, visual.key])] : selected.filter(key => key !== visual.key))} /><strong>{visual.caption}</strong></span>
      </label>)}</div></div>;
    })}
    {!expanded && visuals.length > 12 && <button type="button" className="button secondary small" onClick={() => setExpanded(true)}>{t("Prikaži sve slike ({0})", { 0: visuals.length })}</button>}
    {!count && <p className="pdf-selection-empty" role="status">{t("Nijedna slika nije označena. PDF će sadržati tekst, paletu i tipografske primjere, bez generisanih slika.")}</p>}
  </section>;
}
