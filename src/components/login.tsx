"use client";
import { useI18n } from "@/components/language-provider";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, LoaderCircle, ArrowUpRight } from "lucide-react";
import GoogleSignIn from "./google-sign-in";
import { FormaMark, BrandSymbol } from "./brand";

export default function Login({googleReady=false,authError=false}:{googleReady?:boolean;authError?:boolean}) {
  const { t } = useI18n();

  const router = useRouter();
  const [code, setCode] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Prijava nije uspjela."); setBusy(false); return; }
      router.push("/studio"); router.refresh();
    } catch { setError("Veza nije dostupna. Pokušaj ponovo."); setBusy(false); }
  }
  return <main className="login-page">
    <section className="login-art">
      <Link className="wordmark" href="/"><FormaMark /><span>{t("forma")}<span className="wordmark-dot">.</span></span></Link>
      <div className="login-art-content"><span className="eyebrow">{t("STUDIO ZA VIZUELNO KOMUNICIRANJE")}</span><h1>{t("Svaka ideja")}<br />{t("traži svoju")}<br /><em>{t("formu.")}</em></h1>
        <div className="login-composition"><div className="composition-square"><BrandSymbol shape="spark" /><span>{t("01 — ZNAK")}</span></div><div className="composition-type">Aa<span>{t("02 — GLAS")}</span></div><div className="composition-strip"><i /><i /><i /><i /></div></div>
        <p>{t("Od onoga što želiš reći,")}<br />{t("do načina na koji će te prepoznati.")}</p>
      </div>
      <div className="login-art-footer"><span>{t("IDEJA → IDENTITET → PRIMJENA")}</span><ArrowUpRight size={22} /></div>
    </section>
    <section className="login-form-side"><div className="login-course">{t("VIZUELNO KOMUNICIRANJE ")}<span>2026 / 27</span></div>
      <div className="login-form-wrap"><span className="small-tag"><span className="status-dot" />{t(" TVOJ KREATIVNI PROSTOR")}</span><h2>{t("Dobro došli")}<br />{t(" u studio.")}</h2><p>{t("Mjesto gdje razvijaš svoju ideju, istražuješ vizuelni jezik i gradiš prepoznatljiv identitet.")}</p>
        <GoogleSignIn ready={googleReady} initialError={authError}/><div className="login-divider"><span>{t("ILI NASTAVI LOKALNO UZ KOD")}</span></div><form onSubmit={login}><label htmlFor="access-code">{t("Pristupni kod")}</label><div className="password-field"><LockKeyhole size={18} /><input id="access-code" name="code" type={visible ? "text" : "password"} value={code} onChange={e => setCode(e.target.value)} placeholder={t("Unesi kod za predmet")} autoComplete="current-password" required maxLength={128} aria-describedby={error ? "login-error" : "code-hint"} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? t("Sakrij kod") : t("Prikaži kod")}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          {error ? <p className="form-error" id="login-error" role="alert">{t(error)}</p> : <p className="field-hint" id="code-hint">{t("Kod za pristup dobijaš od nastavnika.")}</p>}
          <button className="button primary login-submit" disabled={busy || !code}>{busy ? <>{t("Otvaram studio ")}<LoaderCircle className="spin" size={18} /></> : <>{t("Uđi u studio ")}<ArrowRight size={18} /></>}</button>
        </form>
        <div className="login-note"><span>01</span><p>{t("Nije potrebno dizajnersko iskustvo.")}<br />{t("Samo ideja koju želiš razviti.")}</p></div>
      </div><footer className="login-footer">{t("Prostor za eksperiment. Znanje za dobar dizajn.")}</footer>
    </section>
  </main>;
}
