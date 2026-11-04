import { accountSetup } from "@/lib/account-auth";
import { authenticated } from "@/lib/auth";
import { enrolledAccount } from "@/lib/accounts";
import { getDb } from "@/lib/db";
export async function GET(){
 if(!await authenticated()&&!await enrolledAccount())return Response.json({error:"Prijava je potrebna."},{status:401});
 const setup=accountSetup();let databaseReady=false;
 if(setup.database)try{await getDb().query("SELECT 1 FROM forma_members LIMIT 1");databaseReady=true;}catch{}
 return Response.json({...setup,databaseReady,instructorConfigured:!!process.env.INSTRUCTOR_EMAILS?.trim(),callbackUrl:"https://vizuelno-komuniciranje.vercel.app/api/auth/callback/google"},{headers:{"Cache-Control":"no-store"}});
}
