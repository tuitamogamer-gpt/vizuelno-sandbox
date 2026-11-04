"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, LoaderCircle, ArrowUpRight } from "lucide-react";
import GoogleSignIn from "./google-sign-in";
import { FormaMark, BrandSymbol } from "./brand";

export default function Login({googleReady=false,authError=false}:{googleReady?:boolean;authError?:boolean}) {
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
      <Link className="wordmark" href="/"><FormaMark /><span>forma<span className="wordmark-dot">.</span></span></Link>
      <div className="login-art-content"><span className="eyebrow">STUDIO ZA VIZUELNO KOMUNICIRANJE</span><h1>Svaka ideja<br />traži svoju<br /><em>formu.</em></h1>
        <div className="login-composition"><div className="composition-square"><BrandSymbol shape="spark" /><span>01 — ZNAK</span></div><div className="composition-type">Aa<span>02 — GLAS</span></div><div className="composition-strip"><i /><i /><i /><i /></div></div>
        <p>Od onoga što želiš reći,<br />do načina na koji će te prepoznati.</p>
      </div>
      <div className="login-art-footer"><span>IDEJA → IDENTITET → PRIMJENA</span><ArrowUpRight size={22} /></div>
    </section>
    <section className="login-form-side"><div className="login-course">VIZUELNO KOMUNICIRANJE <span>2026 / 27</span></div>
      <div className="login-form-wrap"><span className="small-tag"><span className="status-dot" /> TVOJ KREATIVNI PROSTOR</span><h2>Dobro došli<br />u studio.</h2><p>Mjesto gdje razvijaš svoju ideju, istražuješ vizuelni jezik i gradiš prepoznatljiv identitet.</p>
        <GoogleSignIn ready={googleReady} initialError={authError}/><div className="login-divider"><span>ILI NASTAVI LOKALNO UZ KOD</span></div><form onSubmit={login}><label htmlFor="access-code">Pristupni kod</label><div className="password-field"><LockKeyhole size={18} /><input id="access-code" name="code" type={visible ? "text" : "password"} value={code} onChange={e => setCode(e.target.value)} placeholder="Unesi kod za predmet" autoComplete="current-password" required maxLength={128} aria-describedby={error ? "login-error" : "code-hint"} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Sakrij kod" : "Prikaži kod"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          {error ? <p className="form-error" id="login-error" role="alert">{error}</p> : <p className="field-hint" id="code-hint">Kod za pristup dobijaš od nastavnika.</p>}
          <button className="button primary login-submit" disabled={busy || !code}>{busy ? <>Otvaram studio <LoaderCircle className="spin" size={18} /></> : <>Uđi u studio <ArrowRight size={18} /></>}</button>
        </form>
        <div className="login-note"><span>01</span><p>Nije potrebno dizajnersko iskustvo.<br />Samo ideja koju želiš razviti.</p></div>
      </div><footer className="login-footer">Prostor za eksperiment. Znanje za dobar dizajn.</footer>
    </section>
  </main>;
}
