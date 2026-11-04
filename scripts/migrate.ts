import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { getMigrations } from "better-auth/db/migration";
import { authOptions } from "../src/lib/account-auth";
import { getDb } from "../src/lib/db";
loadEnvConfig(process.cwd());
async function main(){
 if(!process.env.DATABASE_URL){console.log("Google accounts: DATABASE_URL is not configured; local workspace remains available.");return;}
 const lock=await getDb().connect();
 try{await lock.query("SELECT pg_advisory_lock(7042026)");const migration=await getMigrations(authOptions());if(migration.unsafeChanges.length||migration.schemaProblems.length)throw new Error("Authentication schema needs manual review.");await migration.runMigrations();await lock.query("BEGIN");await lock.query(await readFile(new URL("../db/course.sql",import.meta.url),"utf8"));await lock.query("COMMIT");console.log("Authentication and course database migrations are ready.");}
 catch(error){await lock.query("ROLLBACK");throw error;}
 finally{await lock.query("SELECT pg_advisory_unlock(7042026)");lock.release();await getDb().end();}
}
main().catch(error=>{console.error("Database migration failed:",error instanceof Error?error.name:"UnknownError");process.exitCode=1;});
