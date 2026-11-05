import { get, set, del, keys } from "idb-keyval";
import { Project, projectSchema, backupSchema } from "./project";
import { PlaygroundData, cleanPlayground, cleanVisuals, playgroundBackupSchema, mergeExperiments } from "./generation";
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
  if (file.size > 64_000_000) throw new Error("Datoteka je prevelika. Maksimalna veličina je 64 MB.");
  let input: unknown;
  try { input = JSON.parse(await file.text()); } catch { throw new Error("Datoteka nije ispravan JSON projekat."); }
  const parsed = backupSchema.safeParse(input);
  if (!parsed.success) throw new Error("Ovo nije ispravan Forma projekat. Izaberi .forma.json datoteku izvezenu iz aplikacije.");
  // Imported copies keep the image, but not session-bound job/quote capabilities.
  return { ...parsed.data.project, id: crypto.randomUUID(), visuals: cleanVisuals(parsed.data.project.visuals), aiJob: null, aiRequest: null, updatedAt: new Date().toISOString() };
}
export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
export function slug(name: string) { return name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "moj-identitet"; }
export function projectBackup(project: Project) { return JSON.stringify({ format: "forma-project", version: 1, project: { ...project, visuals: cleanVisuals(project.visuals), aiJob: null, aiRequest: null } }, null, 2); }
export function exportProject(project: Project) { downloadBlob(projectBackup(project), `${slug(project.name)}.forma.json`, "application/json"); }
export async function readImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Izaberi PNG, JPG ili WebP sliku.");
  if (file.size > 8_000_000) throw new Error("Slika može imati najviše 8 MB.");
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("Sliku nije moguće otvoriti. Izaberi ispravan PNG, JPG ili WebP fajl."); });
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Preglednik ne podržava obradu slike.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return canvas.toDataURL("image/webp", 0.9);
}

export function exportPlayground(data: PlaygroundData) {
  downloadBlob(JSON.stringify({ format: "forma-playground", version: 1, ...cleanPlayground(data) }, null, 2), "forma-playground.json", "application/json");
}
export async function importPlayground(file: File, currentData: PlaygroundData | (()=>PlaygroundData)) {
  if (file.size > 96_000_000) throw new Error("Arhiva može imati najviše 96 MB.");
  let raw: unknown;
  try { raw = JSON.parse(await file.text()); } catch { throw new Error("Arhiva nije ispravan JSON dokument."); }
  const result = playgroundBackupSchema.safeParse(raw);
  if (!result.success) throw new Error("Izaberi Forma Playground arhivu. Projekti se uvoze u odjeljku Moji projekti.");
  const imported = cleanPlayground(result.data);
  const current=typeof currentData==="function"?currentData():currentData;
  // The current draft and any pending provider request must survive an import.
  const history = mergeExperiments(imported.history, current.history);
  const starred = [...new Set([...current.starred, ...imported.starred])].filter(id => history.some(item => item.id === id));
  const fresh = !current.generation.prompt && !current.generation.job && !current.generation.request && !current.generation.result;
  return { generation: fresh ? { ...imported.generation, alternatives: [] } : current.generation, history, starred };
}
