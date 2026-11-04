import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "vk_session";
const issuer = "vizuelno-komuniciranje";
export const sessionOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 7 };

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return new TextEncoder().encode(value);
}
export function accessConfigured() { return Boolean(process.env.ACCESS_CODE && (process.env.SESSION_SECRET?.length ?? 0) >= 32); }
export function verifyCode(code: string) {
  const expected = process.env.ACCESS_CODE;
  if (!expected) return false;
  return timingSafeEqual(createHash("sha256").update(code).digest(), createHash("sha256").update(expected).digest());
}
export async function createSession() {
  return new SignJWT({ scope: "student" }).setProtectedHeader({ alg: "HS256" }).setIssuer(issuer).setAudience("vk-studio").setSubject(crypto.randomUUID()).setIssuedAt().setExpirationTime("7d").sign(secret());
}
export async function validSession(token?: string) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer, audience: "vk-studio", algorithms: ["HS256"] });
    return payload.scope === "student";
  } catch { return false; }
}
export async function authenticated() { return validSession((await cookies()).get(SESSION_COOKIE)?.value); }
export async function sessionIdentity() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, secret(), { issuer, audience: "vk-studio", algorithms: ["HS256"] }); return payload.scope === "student" && payload.sub ? payload.sub : null; } catch { return null; }
}
export async function signTicket(subject: string, purpose: string, data: Record<string, unknown>, lifetime = "10m") {
  return new SignJWT({ ...data, purpose }).setProtectedHeader({ alg: "HS256" }).setIssuer(issuer).setAudience("vk-ai").setSubject(subject).setIssuedAt().setExpirationTime(lifetime).sign(secret());
}
export async function readTicket(token: string, subject: string, purpose: string) {
  const { payload } = await jwtVerify(token, secret(), { issuer, audience: "vk-ai", subject, algorithms: ["HS256"] });
  if (payload.purpose !== purpose) throw new Error("Invalid ticket purpose");
  return payload;
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return ["http:", "https:"].includes(parsed.protocol) && parsed.host === (request.headers.get("host") || new URL(request.url).host);
  } catch { return false; }
}
