"use client";
import { useI18n } from "@/components/language-provider";

import { RefreshCw } from "lucide-react";
import { Project, ProjectPatch, visualBrief } from "@/lib/project";
import { Generation, VisualTarget, isPending, models, newGeneration, targetInfo, amendGeneration } from "@/lib/generation";
import { slug } from "@/lib/storage";
import AiGeneration from "./ai-generation";

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
  return <div className="project-visual"><AiGeneration value={value} onChange={change} title={t(targetInfo[target].title)} filename={`${slug(project.name)}-${target}`} showVariants onUse={target === "logo" ? result => update({ logoImage: result.image }) : undefined} />
    <button className="button ghost refresh-brief" disabled={isPending(value)} onClick={() => change({ prompt: visualBrief(project, target, locale) })}><RefreshCw size={14} />{t("Obnovi opis iz projekta")}</button>
    {target === "palette" && <p className="small-muted">{t("Vizual služi za istraživanje odnosa boja. Tačne HEX vrijednosti i kontrast određuješ u paleti iznad.")}</p>}
    {target === "typography" && <p className="small-muted">{t("AI skica istražuje raspored. Stvarne fontove i čitljivost provjeri u tipografskoj probi iznad.")}</p>}
    {(target === "letterhead" || target === "social") && <p className="small-muted">{t("Model dobija tekstualni opis identiteta. Za precizan logotip i fontove koristi predložak ispod; AI skica je prijedlog kompozicije.")}</p>}
  </div>;
}
