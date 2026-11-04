"use client";
import { RefreshCw } from "lucide-react";
import { Project, ProjectPatch, visualBrief } from "@/lib/project";
import { Generation, VisualTarget, isPending, models, newGeneration, targetInfo, amendGeneration } from "@/lib/generation";
import { slug } from "@/lib/storage";
import AiGeneration from "./ai-generation";

export default function ProjectVisual({ project, target, update }: { project: Project; target: VisualTarget; update: (patch: ProjectPatch) => void | Promise<boolean> }) {
  const value = project.visuals[target] || newGeneration(visualBrief(project, target), targetInfo[target].aspect);
  function change(patch: Partial<Generation>) {
    return update(current => {
      const existing = current.visuals[target] || newGeneration(visualBrief(current, target), targetInfo[target].aspect);
      const line = patch.result ? `${targetInfo[target].label}: ${models[patch.result.input.model].label}, preko Pika API Club. Autorske dorade: [opiši izmjene].` : "";
      return { visuals: { ...current.visuals, [target]: amendGeneration(existing, patch) }, ...(line && !current.aiDisclosure.includes(line) ? { aiDisclosure: `${current.aiDisclosure}\n${line}`.trim().slice(0, 6000) } : {}) };
    });
  }
  return <div className="project-visual"><AiGeneration value={value} onChange={change} title={targetInfo[target].title} filename={`${slug(project.name)}-${target}`} showVariants onUse={target === "logo" ? result => update({ logoImage: result.image }) : undefined} />
    <button className="button ghost refresh-brief" disabled={isPending(value)} onClick={() => change({ prompt: visualBrief(project, target) })}><RefreshCw size={14} />Obnovi opis iz projekta</button>
    {target === "palette" && <p className="small-muted">Vizual služi za istraživanje odnosa boja. Tačne HEX vrijednosti i kontrast određuješ u paleti iznad.</p>}
    {target === "typography" && <p className="small-muted">AI skica istražuje raspored. Stvarne fontove i čitljivost provjeri u tipografskoj probi iznad.</p>}
    {(target === "letterhead" || target === "social") && <p className="small-muted">Model dobija tekstualni opis identiteta. Za precizan logotip i fontove koristi predložak ispod; AI skica je prijedlog kompozicije.</p>}
  </div>;
}
