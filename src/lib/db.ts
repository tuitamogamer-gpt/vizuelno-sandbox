import { Pool, PoolClient } from "pg";
let pool: Pool | undefined;
export function databaseConfigured() { return Boolean(process.env.DATABASE_URL); }
export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("Baza podataka još nije povezana.");
  return pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 15_000, connectionTimeoutMillis: 8_000 });
}
export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDb().connect();
  try { await client.query("BEGIN"); const result = await work(client); await client.query("COMMIT"); return result; }
  catch(error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
