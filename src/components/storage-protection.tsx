"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { formatLocales } from "@/lib/i18n/core";
import { useI18n } from "./language-provider";

type StorageState = { supported: false } | { supported: true; usage: number; quota: number; persisted: boolean; canPersist: boolean };

/** Local-only work depends on browser storage. Show its use and let the student ask for persistence explicitly. */
export default function StorageProtection() {
  const { t, locale } = useI18n();
  const [state, setState] = useState<StorageState | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(async (): Promise<StorageState> => {
      const storage = typeof navigator === "undefined" ? undefined : navigator.storage;
      if (!storage?.estimate) return { supported: false };
      const [estimate, persisted] = await Promise.all([storage.estimate(), storage.persisted ? storage.persisted() : false]);
      return { supported: true, usage: estimate.usage ?? 0, quota: estimate.quota ?? 0, persisted, canPersist: typeof storage.persist === "function" };
    }).catch((): StorageState => ({ supported: false })).then(next => { if (!cancelled) setState(next); });
    return () => { cancelled = true; };
  }, []);
  async function protect() {
    setBusy(true); setMessage("");
    try {
      const granted = await navigator.storage.persist();
      setState(current => current?.supported ? { ...current, persisted: granted } : current);
      setMessage(granted ? "Preglednik je odobrio trajno čuvanje." : "Preglednik zasad nije odobrio trajno čuvanje. Redovno preuzimaj rezervnu kopiju.");
    } catch { setMessage("Zahtjev za trajno čuvanje nije dostupan. Redovno preuzimaj rezervnu kopiju."); }
    finally { setBusy(false); }
  }
  const number = new Intl.NumberFormat(formatLocales[locale], { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  return <section className="storage-protection" aria-label={t("Prostor u pregledniku")}>
    <div className="mini-heading"><span>{t("PROSTOR U PREGLEDNIKU")}</span><ShieldCheck size={15} /></div>
    {!state ? <p><LoaderCircle size={15} className="spin" />{t("Provjera prostora...")}</p> : !state.supported ? <p>{t("Ovaj preglednik ne prikazuje podatke o prostoru. Redovno preuzimaj rezervnu kopiju.")}</p> : <>
      <p>{t("Forma u ovom pregledniku zauzima oko {0} MB.", { 0: number.format(state.usage / 1_000_000) })}{state.quota > 0 && ` ${t("Preglednik za ovu stranicu dozvoljava oko {0} GB.", { 0: number.format(state.quota / 1_000_000_000) })}`}</p>
      {state.persisted ? <p className="storage-protected"><CheckCircle2 size={16} />{t("Trajno čuvanje je uključeno: preglednik neće sam obrisati ove podatke kada mu ponestane prostora.")}</p> : <>
        <p>{t("Bez trajnog čuvanja preglednik može obrisati lokalne podatke kada mu ponestane prostora.")}</p>
        {state.canPersist && <button type="button" className="button secondary small" disabled={busy} onClick={() => { void protect(); }}>{busy ? <LoaderCircle size={15} className="spin" /> : <ShieldCheck size={15} />}{t("Zatraži trajno čuvanje")}</button>}
      </>}
    </>}
    {message && <p role="status" className="storage-message">{t(message)}</p>}
  </section>;
}
