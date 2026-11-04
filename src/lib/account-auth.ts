import { betterAuth, BetterAuthOptions } from "better-auth";
import { getDb, databaseConfigured } from "./db";
export function accountSetup() {
  return { database: databaseConfigured(), google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET), secret: (process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET || "").length >= 32 };
}
export function accountsConfigured() { return Object.values(accountSetup()).every(Boolean); }
export function authOptions(): BetterAuthOptions {
  return {
    appName: "Forma — Vizuelno komuniciranje",
    baseURL: process.env.BETTER_AUTH_URL || "https://vizuelno-komuniciranje.vercel.app",
    secret: process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET,
    database: getDb(),
    user: { modelName: "forma_user" },
    session: { modelName: "forma_session", expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    account: { modelName: "forma_account", encryptOAuthTokens: true, accountLinking: { enabled: false } },
    verification: { modelName: "forma_verification" },
    socialProviders: { google: { clientId: process.env.GOOGLE_CLIENT_ID || "not-configured", clientSecret: process.env.GOOGLE_CLIENT_SECRET || "not-configured", prompt: "select_account", accessType: "online", includeGrantedScopes: false } },
    emailAndPassword: { enabled: false },
    rateLimit: { enabled: true, storage: "database", modelName: "forma_auth_rate_limit", window: 60, max: 100 },
    advanced: { cookiePrefix: "forma-account", useSecureCookies: process.env.BETTER_AUTH_URL?.startsWith("http://localhost") ? false : process.env.NODE_ENV === "production" },
    logger: { level: "error" },
  };
}
let auth: ReturnType<typeof betterAuth> | undefined;
export function getAccountAuth() { return auth ??= betterAuth(authOptions()); }
