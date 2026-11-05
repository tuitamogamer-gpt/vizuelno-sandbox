"use client";
import { useI18n } from "@/components/language-provider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Cloud, LoaderCircle, ArrowRight, ShieldCheck } from "lucide-react";
import { FormaMark } from "./brand";
import { Field } from "./editor";
import { cloudApi } from "@/lib/cloud/client";
import { accountClient } from "@/lib/account-client";
export default function Enrollment({name,email,hasCourseAccess}:{name:string;email:string;hasCourseAccess:boolean}){
  const { t } = useI18n();

 const router=useRouter(),[code,setCode]=useState(""),[studentNumber,setStudentNumber]=useState(""),[group,setGroup]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 return <main className="enrollment-page"><div className="enrollment-brand"><FormaMark/><strong>{t("forma.")}</strong></div><section><span className="eyebrow">{t("VIZUELNO KOMUNICIRANJE / 2026–27")}</span><h1>{t("Tvoje ideje.")}<br/><em>{t("Tvoj radni prostor.")}</em></h1><p>{t("Dobro došli, ")}{name}{t(". Poveži nalog s predmetom i nastavi svoj identitet na bilo kojem uređaju.")}</p><div className="verified-account"><ShieldCheck size={21}/><div><strong>{email}</strong><span>{t("Google nalog je potvrđen")}</span></div></div><form onSubmit={async event=>{event.preventDefault();setBusy(true);setError("");try{await cloudApi("/api/account/enroll","POST",{code,studentNumber,group});router.replace("/studio");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Pridruživanje nije uspjelo.");setBusy(false);}}}>{!hasCourseAccess&&<label className="enrollment-code">{t("Kod predmeta")}<input type="password" value={code} onChange={e=>setCode(e.target.value)} maxLength={128} required autoComplete="off" placeholder={t("Kod koji si dobio/la od nastavnika")}/></label>}<Field label={t("Broj indeksa")} value={studentNumber} onChange={setStudentNumber} maxLength={40} placeholder={t("npr. 24/2026")} optional/><Field label={t("Grupa / studijski program")} value={group} onChange={setGroup} maxLength={80} placeholder={t("npr. Grafički dizajn · I godina")} optional/><div className="account-note"><Cloud size={18}/><p>{t("Rad se čuva uz ovaj nalog. Nastavnik vidi tvoj napredak i verzije koje predaš na pregled. Lokalni projekti se prenose tek kada ih izabereš.")}</p></div>{error&&<p className="form-error" role="alert">{t(error)}</p>}<button className="button primary" disabled={busy||(!hasCourseAccess&&!code.trim())}>{busy?<LoaderCircle className="spin" size={18}/>:<ArrowRight size={18}/>}{t("Pridruži se predmetu")}</button></form><button className="text-button switch-account" disabled={busy} onClick={async()=>{setBusy(true);setError("");try{const result=await accountClient.signOut();if(result.error)throw new Error();const login=await accountClient.signIn.social({provider:"google",callbackURL:"/upis",errorCallbackURL:"/pristup?auth_error=1"});if(login.error)throw new Error();}catch{setError("Promjena naloga nije uspjela. Provjeri vezu i pokušaj ponovo.");setBusy(false);}}}>{t("Koristi drugi Google nalog")}</button></section></main>;
}
