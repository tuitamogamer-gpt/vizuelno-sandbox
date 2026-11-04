import { get, set, del, keys } from "idb-keyval";
import { Project, projectSchema, backupSchema } from "./project";
const prefix = "forma:project:";
export async function loadProjects(): Promise<Project[]> {
  const all = await keys();
  const results = await Promise.all(all.filter(k => typeof k === "string" && k.startsWith(prefix)).map(k => get(k)));
  const parsed = results.map(p => projectSchema.safeParse(p));
  if (parsed.some(p => !p.success)) throw new Error("Neki podaci nisu čitljivi. Sačuvani zapisi nisu obrisani; pokušaj ponovni uvoz rezervne kopije.");
  return parsed.flatMap(p => p.success ? [p.data] : []).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function saveProject(project: Project) { await set(prefix + project.id, projectSchema.parse(project)); }
export async function removeProject(id: string) { await del(prefix + id); }
export async function importProject(file: File): Promise<Project> {
  if (file.size > 8_000_000) throw new Error("Datoteka je prevelika. Maksimalna veličina je 8 MB.");
  let input: unknown;
  try { input = JSON.parse(await file.text()); } catch { throw new Error("Datoteka nije ispravan JSON projekat."); }
  const parsed = backupSchema.safeParse(input);
  if (!parsed.success) throw new Error("Ovo nije ispravan Forma projekat. Izaberi .forma.json datoteku izvezenu iz aplikacije.");
  // Imported copies keep the image, but not session-bound job/quote capabilities.
  return { ...parsed.data.project, id: crypto.randomUUID(), aiJob: null, aiRequest: null, updatedAt: new Date().toISOString() };
}
export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export function slug(name: string) { return name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "moj-identitet"; }
export function exportProject(project: Project) { downloadBlob(JSON.stringify({ format: "forma-project", version: 1, project: { ...project, aiJob: null, aiRequest: null } }, null, 2), `${slug(project.name)}.forma.json`, "application/json"); }
export async function readImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Izaberi PNG, JPG ili WebP sliku.");
  if (file.size > 8_000_000) throw new Error("Slika može imati najviše 8 MB.");
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Preglednik ne podržava obradu slike.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return canvas.toDataURL("image/webp", 0.9);
}
