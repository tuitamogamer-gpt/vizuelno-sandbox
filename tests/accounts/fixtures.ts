import { createHmac } from "node:crypto";
import { test as base, expect, APIRequestContext, BrowserContext } from "@playwright/test";
import { getAccountAuth } from "../../src/lib/account-auth";
import { getDb } from "../../src/lib/db";
const origin=process.env.ACCOUNT_TEST_ORIGIN||"http://localhost:3002";
export type Persona={id:string;email:string;cookie:{name:string;value:string;domain:string;path:string;httpOnly:boolean;secure:boolean;sameSite:"Lax"}};
type Fixtures={persona:(name:string,options?:{teacher?:boolean;enrolled?:boolean;verified?:boolean})=>Promise<Persona>};
export const test=base.extend<Fixtures>({persona:async({},provide)=>{
 const url=new URL(process.env.DATABASE_URL||"http://missing");
 if(!["localhost","127.0.0.1"].includes(url.hostname)||!url.pathname.endsWith("_test"))throw new Error("Account tests require a dedicated local _test database.");
 const created:string[]=[];
 await provide(async(name,options={})=>{
  const ctx=await getAccountAuth().$context;
  const email=options.teacher?"teacher@example.test":`${crypto.randomUUID()}@example.test`;
  const user=await ctx.internalAdapter.createUser({name,email,emailVerified:options.verified!==false},{method:"test"});created.push(user.id);
  const session=await ctx.internalAdapter.createSession(user.id,false);
  if(options.enrolled!==false)await getDb().query("INSERT INTO forma_members(user_id,student_number,group_name) VALUES($1,'VK-2026','Četvrtak')",[user.id]);
  const signed=encodeURIComponent(`${session.token}.${createHmac("sha256",process.env.BETTER_AUTH_SECRET!).update(session.token).digest("base64")}`);
  return {id:user.id,email,cookie:{name:"forma-account.session_token",value:signed,domain:"localhost",path:"/",httpOnly:true,secure:false,sameSite:"Lax"}};
 });
 await getDb().query("DELETE FROM forma_submissions WHERE owner_id=ANY($1::text[])",[created]);
 for(const id of created)await getDb().query('DELETE FROM forma_user WHERE id=$1',[id]);
}});
export {expect,origin};
export async function api(request:APIRequestContext,who:Persona,path:string,method="GET",data?:unknown){return request.fetch(origin+path,{method,headers:{Cookie:`${who.cookie.name}=${who.cookie.value}`,Origin:origin},data});}
export async function signIn(context:BrowserContext,who:Persona){await context.addCookies([who.cookie]);}
