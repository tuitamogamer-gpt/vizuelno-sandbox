"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Eye, FileText, LoaderCircle } from "lucide-react";
import { checklist, projectSchema, type Project } from "@/lib/project";
import { downloadBlob, slug } from "@/lib/storage";
import { localDate, pdfChapters, pdfVisuals, type PdfOptions } from "@/lib/pdf/options";
import Dialog from "./dialog";

type Props = {
  project: Project;
  studentNumber?: string;
  group?: string;
  submission?: PdfOptions["submission"];
  onClose: () => void;
};

export default function PdfExport({ project, studentNumber = "", group = "", submission, onClose }: Props) {
  const [options, setOptions] = useState<PdfOptions>({
    author: project.author, studentNumber, group, date: localDate(),
    includeVisuals: true, includeVariants: false, includePrompts: false, submission,
  });
  const [phase, setPhase] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [result, setResult] = useState<{ key: string; blob: Blob; url: string } | null>(null);
  const alive = useRef(true);
  const running = useRef(false);
  const key = JSON.stringify(options);
  const current = result?.key === key ? result : null;
  const filename = `${slug(project.name)}-kolokvijum-01${submission ? `-verzija-${submission.version}` : ""}.pdf`;
  const missing = checklist(project).filter(item => !item.done);
  const visuals = pdfVisuals(project, { ...options, includeVisuals: true });

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  function change<K extends keyof PdfOptions>(field: K, value: PdfOptions[K]) {
    setOptions(previous => ({ ...previous, [field]: value }));
    setError("");
  }

  async function generate(action: "preview" | "download") {
    if (running.current) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(options.date) || !Number.isFinite(Date.parse(`${options.date}T12:00:00Z`))) {
      setError("Unesi ispravan datum dokumenta."); return;
    }
    running.current = true;
    setError("");
    try {
      let prepared = current;
      if (!prepared) {
        setPhase("Pripremam PDF alat...");
        const [{ preparePdfAssets }, { renderIdentityPdf }] = await Promise.all([
          import("@/lib/pdf/assets"), import("@/lib/pdf/document"),
        ]);
        if (!alive.current) return;
        setPhase("Pripremam fontove i vizuale...");
        const snapshot = projectSchema.parse(project);
        const assets = await preparePdfAssets(snapshot, options);
        if (!alive.current) return;
        setPhase("Slažem stranice dokumenta...");
        const blob = await renderIdentityPdf(snapshot, options, assets);
        if (!alive.current) return;
        prepared = { key, blob, url: URL.createObjectURL(blob) };
        setResult(prepared);
      }
      if (action === "download") downloadBlob(prepared.blob, filename, "application/pdf");
      else setPreview(true);
    } catch (cause) {
      if (alive.current) setError(cause instanceof Error && /^(Slika „|Preglednik ne podržava)/.test(cause.message)
        ? cause.message
        : "PDF nije moguće pripremiti. Provjeri vezu radi učitavanja fontova, pa pokušaj ponovo. Tvoj projekat je sačuvan.");
    } finally {
      running.current = false;
      if (alive.current) setPhase("");
    }
  }

  return <Dialog wide title="PDF za prvi kolokvijum" onClose={onClose}>
    <p className="modal-intro">Jedan uređen A4 dokument sa svim cjelinama vizuelnog identiteta, vizualima i obrazloženjima.</p>
    <div className="pdf-export-layout">
      <aside className="pdf-cover-preview" aria-label="Sadržaj PDF dokumenta">
        <span className="eyebrow">VIZUELNO KOMUNICIRANJE</span>
        <span className="pdf-cover-number">01</span>
        <h3>{project.name || "Vizuelni identitet"}</h3>
        <p>Knjiga vizuelnog identiteta</p>
        <div className="pdf-cover-palette" aria-hidden="true">{project.colors.map((color, i) => <span key={i} style={{ background: color.hex }} />)}</div>
        <ol>{pdfChapters.map(([, title]) => <li key={title}>{title}</li>)}</ol>
        <div className="pdf-format"><FileText size={16} /><span>A4 · numerisane stranice · ugrađeni fontovi</span></div>
      </aside>
      <form className="pdf-export-form" onSubmit={event => { event.preventDefault(); void generate("download"); }}>
        <fieldset disabled={!!phase}>
          <legend className="visually-hidden">Podaci za PDF</legend>
          <label>Autor / autorka<input value={options.author} maxLength={200} readOnly={!!submission} onChange={event => change("author", event.target.value)} placeholder="Ime i prezime" /></label>
          <div className="pdf-field-row">
            <label>Broj indeksa <span>opciono</span><input value={options.studentNumber} maxLength={40} onChange={event => change("studentNumber", event.target.value)} placeholder="npr. 24/2026" /></label>
            <label>Datum dokumenta<input type="date" value={options.date} required onChange={event => change("date", event.target.value)} /></label>
          </div>
          <label>Grupa / studijski program <span>opciono</span><input value={options.group} maxLength={80} onChange={event => change("group", event.target.value)} placeholder="npr. Grafički dizajn" /></label>
          <div className="pdf-options">
            <label><input type="checkbox" checked={options.includeVisuals} onChange={event => change("includeVisuals", event.target.checked)} /><span><strong>Uključi AI vizuale</strong><small>Odabrane slike uz odgovarajuće cjeline i naziv modela.</small></span></label>
            <label><input type="checkbox" checked={options.includeVariants} disabled={!options.includeVisuals} onChange={event => change("includeVariants", event.target.checked)} /><span><strong>Dodaj ranije varijante</strong><small>Prikaži istraživanje uz odabrana rješenja.</small></span></label>
            <label><input type="checkbox" checked={options.includePrompts} disabled={!options.includeVisuals} onChange={event => change("includePrompts", event.target.checked)} /><span><strong>Dodaj promptove u prilogu</strong><small>Sačuvaj opise korištene za uključene AI vizuale.</small></span></label>
          </div>
        </fieldset>
        <p className="pdf-export-note">{submission ? `Izvozi se sačuvana predaja, verzija ${submission.version}.` : "Izvozi se trenutni projekat. Podaci uneseni ovdje važe samo za ovaj PDF."} {options.includeVisuals ? `AI vizuali: ${visuals.length}.` : "Odabrani logotip ostaje uključen."}</p>
        {!!missing.length && <details className="pdf-missing"><summary>Prije predaje provjeri: {missing.length} nepopunjenih stavki</summary><ul>{missing.map(item => <li key={item.label}>{item.label}</li>)}</ul><p>Možeš preuzeti radnu verziju. Prazna polja u PDF-u ostaju označena.</p></details>}
        <div className="pdf-actions">
          <button className="button secondary" type="button" disabled={!!phase} onClick={() => { void generate("preview"); }}><Eye size={17} />Pregled PDF-a</button>
          <button className="button primary" disabled={!!phase} type="submit">{phase ? <LoaderCircle size={17} className="spin" /> : <Download size={17} />}Preuzmi PDF</button>
        </div>
        <div aria-live="polite" className="pdf-status">{phase ? <p><LoaderCircle size={15} className="spin" />{phase}</p> : current ? <p><Check size={16} />PDF je spreman · {(current.blob.size / 1_000_000).toFixed(1)} MB</p> : <p>Preuzimanje ne predaje rad nastavniku.</p>}</div>
        {!!error && <p className="form-error" role="alert">{error}</p>}
      </form>
    </div>
    {preview && current && <section className="pdf-live-preview"><div><h3>Pregled dokumenta</h3><button className="text-button" onClick={() => setPreview(false)}>Sakrij pregled</button></div><iframe src={current.url} title="Pregled PDF-a za prvi kolokvijum" /><p>Ako pregled nije dostupan u tvom pregledniku, izaberi „Preuzmi PDF“ i otvori datoteku.</p></section>}
  </Dialog>;
}
