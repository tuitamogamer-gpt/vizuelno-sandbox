"use client";
import { useI18n } from "@/components/language-provider";

import { RefreshCw } from "lucide-react";
import { Project, ProjectPatch, visualBrief } from "@/lib/project";
import { Generation, VisualTarget, isPending, models, newGeneration, targetInfo, amendGeneration, removeFromHistory, visualKey } from "@/lib/generation";
import { slug } from "@/lib/storage";
import AiGeneration from "./ai-generation";
import ProjectHistory from "./project-history";

export default function ProjectVisual({ project, target, update }: { project: Project; target: VisualTarget; update: (patch: ProjectPatch) => void | Promise<boolean> }) {
  const { t, locale } = useI18n();

  const value = project.visuals[target] || newGeneration(visualBrief(project, target, locale), targetInfo[target].aspect);
  function change(patch: Partial<Generation>) {
    return update(current => {
      const existing = current.visuals[target] || newGeneration(visualBrief(current, target, locale), targetInfo[target].aspect);
      const line = patch.result ? t("{0}: {1}, preko Pika API Club. Autorske dorade: [opiši izmjene].", {0: t(targetInfo[target].label), 1: models[patch.result.input.model].label}) : "";
      return { visuals: { ...current.visuals, [target]: amendGeneration(existing, patch) }, ...(line && !current.aiDisclosure.includes(line) ? { aiDisclosure: `${current.aiDisclosure}\n${line}`.trim().slice(0, 6000) } : {}) };
    });
  }
  return <div className="project-visual"><AiGeneration value={value} onChange={change} title={t(targetInfo[target].title)} filename={`${slug(project.name)}-${target}`} onUse={target === "logo" ? result => update({ logoImage: result.image }) : undefined} />
    <button className="button ghost refresh-brief" disabled={isPending(value)} onClick={() => change({ prompt: visualBrief(project, target, locale) })}><RefreshCw size={14} />{t("Obnovi opis iz projekta")}</button>
    {target === "palette" && <p className="small-muted">{t("Vizual služi za istraživanje odnosa boja. Tačne HEX vrijednosti i kontrast određuješ u paleti iznad.")}</p>}
    {target === "typography" && <p className="small-muted">{t("AI skica istražuje raspored. Stvarne fontove i čitljivost provjeri u tipografskoj probi iznad.")}</p>}
    {(target === "letterhead" || target === "social") && <p className="small-muted">{t("Model dobija tekstualni opis identiteta. Za precizan logotip i fontove koristi predložak ispod; AI skica je prijedlog kompozicije.")}</p>}
    <ProjectHistory value={value} target={target} selected={project.pdfVisualIds} logoImage={target === "logo" ? project.logoImage : undefined}
      onRestore={result => { void change({ ...result.input, result, job: null, request: null }); }}
      onSelect={(id, checked) => { void update(current => ({ pdfVisualIds: checked ? [...new Set([...current.pdfVisualIds, id])] : current.pdfVisualIds.filter(key => key !== id) })); }}
      onRemove={result => { void update(current => {
        const existing = current.visuals[target];
        // Never race an in-flight request, and keep the image that is the active logo.
        if (!existing || isPending(existing) || (target === "logo" && current.logoImage === result.image)) return {};
        const key = visualKey(target, result.id);
        return { visuals: { ...current.visuals, [target]: removeFromHistory(existing, result.id) }, pdfVisualIds: current.pdfVisualIds.filter(id => id !== key) };
      }); }} />
  </div>;
}
