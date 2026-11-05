"use client";
import { useI18n } from "@/components/language-provider";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { accountClient } from "@/lib/account-client";
export default function GoogleSignIn({ready,compact=false,initialError=false}:{ready:boolean;compact?:boolean;initialError?:boolean}){
  const { t } = useI18n();

 const [busy,setBusy]=useState(false),[error,setError]=useState(initialError?"Google prijava nije završena. Pokušaj ponovo ili se obrati nastavniku.":"");
 return <div className={`google-signin ${compact?"compact":""}`}><button type="button" className="button google-button" disabled={!ready||busy} onClick={async()=>{setBusy(true);setError("");try{const result=await accountClient.signIn.social({provider:"google",callbackURL:"/upis",errorCallbackURL:"/pristup?auth_error=1"});if(result.error)throw new Error("Google prijava trenutno nije dostupna. Pokušaj ponovo.");}catch{setError("Google prijava nije uspjela. Provjeri vezu i pokušaj ponovo.");setBusy(false);}}}>{busy?<LoaderCircle className="spin" size={19}/>:<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.73-.06-1.42-.19-2.09H12v3.96h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.75 3.28-7.95Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.8l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.87 0-5.3-1.94-6.17-4.55H2.15v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.83 13.95a6.6 6.6 0 0 1 0-3.9V7.21H2.15a11 11 0 0 0 0 9.58l3.68-2.84Z"/><path fill="#EA4335" d="M12 5.5c1.62 0 3.06.56 4.21 1.64l3.16-3.16A10.57 10.57 0 0 0 12 1a11 11 0 0 0-9.85 6.21l3.68 2.84C6.7 7.44 9.13 5.5 12 5.5Z"/></svg>}{busy?t("Otvaram Google..."):t("Nastavi s Google nalogom")}</button>{!compact&&<p>{ready?t("Projekti, vizuali i napredak dostupni su ti na svakom uređaju. Kod predmeta unosiš pri prvom pristupu."):t("Nastavnik dovršava povezivanje Google prijave. Do tada možeš raditi lokalno uz kod predmeta.")}</p>}{error&&<p className="form-error" role="alert">{t(error)}</p>}</div>;
}
