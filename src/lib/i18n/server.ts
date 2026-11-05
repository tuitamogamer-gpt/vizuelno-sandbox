import "server-only";
import { cookies } from "next/headers";
import { localeCookie, normalizeLocale } from "./core";

export async function serverLocale() {
  return normalizeLocale((await cookies()).get(localeCookie)?.value);
}
