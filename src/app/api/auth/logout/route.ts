import { NextResponse } from "next/server";
import { sameOrigin, SESSION_COOKIE, sessionOptions } from "@/lib/auth";
import { accountsConfigured, getAccountAuth } from "@/lib/account-auth";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Nedozvoljen zahtjev." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  if(accountsConfigured()){const accountResponse=await getAccountAuth().api.signOut({headers:request.headers,asResponse:true});for(const cookie of accountResponse.headers.getSetCookie())response.headers.append("Set-Cookie",cookie); }
  response.cookies.set(SESSION_COOKIE, "", { ...sessionOptions, maxAge: 0 });
  return response;
}
