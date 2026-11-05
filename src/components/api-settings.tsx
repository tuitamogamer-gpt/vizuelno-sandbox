"use client";
import { useI18n } from "@/components/language-provider";

import AccountSetup from "./account-setup";
import { useState } from "react";
import { ArrowUpRight, Check, Copy, KeyRound, LoaderCircle, RefreshCw } from "lucide-react";
import { modelIds, models } from "@/lib/generation";
export const environmentUrl = "https://vercel.com/tuitamogamer-7851s-projects/vizuelno-komuniciranje/settings/environment-variables";
const deploymentsUrl = "https://vercel.com/tuitamogamer-7851s-projects/vizuelno-komuniciranje/deployments";
export default function ApiSettings() {
  const { t } = useI18n();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  async function check() {
    setBusy(true); setMessage("");
    try { const response = await fetch("/api/ai/connection", { method: "POST" }); const data = await response.json(); setConnected(response.ok); setMessage(data.message || data.error); }
    catch { setConnected(false); setMessage("Provjera trenutno nije dostupna. Pokušaj ponovo."); }
    finally { setBusy(false); }
  }
  return <div className="settings-page page-enter"><div className="page-heading"><div><span className="eyebrow">{t("NASTAVNIČKE POSTAVKE")}</span><h1>{t("Poveži kreativni alat")}<span className="orange">.</span></h1><p>{t("Jedan Pika API Club ključ za sva četiri modela i sve studentske korake.")}</p></div><KeyRound size={30} /></div><AccountSetup/><div className="settings-layout"><section className="settings-card"><span className="eyebrow">{t("UNOS API KLJUČA")}</span><h2>{t("Ključ unosiš direktno na Vercelu.")}</h2><p>{t("Otvori postavke projekta svojim Vercel nalogom. Tu se ključ čuva na serveru i ostaje dostupan nakon novih objava aplikacije.")}</p><ol className="setup-steps"><li><span>01</span><div><h3>{t("Dodaj varijablu")}</h3><p>{t("U Environment Variables izaberi Add Environment Variable. U polje Key unesi:")}</p><div className="env-variable"><code>PIKA_API_KEY</code><button className="icon-button" aria-label={t("Kopiraj naziv varijable")} onClick={async () => { try { await navigator.clipboard.writeText("PIKA_API_KEY"); setCopied(true); } catch { setMessage("Ručno kopiraj naziv PIKA_API_KEY."); } }}>{copied ? <Check size={16} /> : <Copy size={16} />}</button></div><p>{t("U polje Value zalijepi svoj ključ. Izaberi Production i Preview, označi kao Sensitive ako je opcija dostupna, pa sačuvaj.")}</p><a href={environmentUrl} target="_blank" rel="noreferrer" className="button primary">{t("Otvori unos ključa na Vercelu")}<ArrowUpRight size={16} /></a></div></li><li><span>02</span><div><h3>{t("Objavi novu verziju s ključem")}</h3><p>{t("U Deployments otvori meni posljednje produkcijske objave, izaberi Redeploy i sačekaj status Ready.")}</p><a href={deploymentsUrl} target="_blank" rel="noreferrer" className="text-link">{t("Otvori Vercel objave")}<ArrowUpRight size={15} /></a></div></li><li><span>03</span><div><h3>{t("Provjeri vezu")}</h3><p>{t("Osvježi aplikaciju i provjeri da li Pika prihvata ključ. Ova provjera ne generiše sliku i ne troši kredit za generisanje.")}</p><button className="button secondary" onClick={check} disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />}{t("Provjeri Pika vezu")}</button>{message && <p role="status" className={connected ? "connection-success" : "form-error"}>{t(message)}</p>}</div></li></ol></section><aside className="settings-aside"><span className="eyebrow">{t("SPREMNI MODELI")}</span>{modelIds.map(id => <div key={id}><SparkleMark /><div><h3>{t(models[id].label)}</h3><p>{models[id].detail}</p></div></div>)}<p className="small-muted">{t("Studentima je dovoljan pristupni kod aplikacije. Za dodavanje ili zamjenu ključa potreban je vlasnikov Vercel nalog.")}</p><p className="small-muted">{t("Cijena se provjerava prije svakog generisanja. Podrazumijevani limit ponuđene cijene jedne slike je $0.25; nastavnik ga može promijeniti kroz PIKA_MAX_IMAGE_USD.")}</p><a className="text-link" href="https://dev.pika.art/keys" target="_blank" rel="noreferrer">{t("Pika API ključevi")}<ArrowUpRight size={15} /></a></aside></div></div>;
}
function SparkleMark() { return <span className="settings-model-mark">✳</span>; }
