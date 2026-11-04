import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import { Project, inkOn } from "@/lib/project";

export function FormaMark({ small = false }: { small?: boolean }) {
  return <span className={`forma-mark ${small ? "small" : ""}`} aria-hidden="true"><i /><i /><i /><i /></span>;
}
export function BrandSymbol({ shape = "spark", className = "" }: { shape?: Project["logoShape"]; className?: string }) {
  return <svg viewBox="0 0 100 100" fill="currentColor" className={`brand-symbol ${className}`} aria-hidden="true">
    {shape === "spark" && Array.from({ length: 8 }, (_, i) => <ellipse key={i} cx="50" cy="27" rx="10" ry="25" transform={`rotate(${i * 45} 50 50)`} />)}
    {shape === "circle" && <><circle cx="36" cy="50" r="32" /><circle cx="68" cy="50" r="24" fill="currentColor" opacity=".45" /></>}
    {shape === "arch" && <path d="M12 88V46a38 38 0 0176 0v42H64V46a14 14 0 00-28 0v42z" />}
    {shape === "diamond" && <><path d="M50 3 97 50 50 97 3 50z" /><path d="M50 26 74 50 50 74 26 50z" fill="white" fillOpacity=".8" /></>}
  </svg>;
}
export function Logo({ project, className = "", imageOnly = false }: { project: Project; className?: string; imageOnly?: boolean }) {
  return <div className={`brand-logo ${className}`} style={{ fontFamily: `'${project.headingFont}', sans-serif` }}>
    {project.logoImage ? <img src={project.logoImage} alt={`Logotip: ${project.name}`} /> : <>
      {project.logoShape !== "none" && <BrandSymbol shape={project.logoShape} />}
      {!imageOnly && <span>{project.logoText || project.name || "Tvoja ideja"}</span>}
    </>}
  </div>;
}
export function BrandPreview({ project, compact = false }: { project: Project; compact?: boolean }) {
  const primary = project.colors[0].hex, secondary = project.colors[1].hex;
  return <div className={`brand-board ${compact ? "compact" : ""}`} style={{ "--brand-primary": primary, "--brand-secondary": secondary, "--brand-ink": inkOn(primary), "--brand-accent": project.colors[2]?.hex || secondary } as CSSProperties}>
    <div className="board-primary"><span className="board-label">VIZUELNI IDENTITET / 01</span><Logo project={project} /><span className="board-slogan">{project.slogan || "Ovdje počinje tvoja priča."}</span><span className="board-corner"><ArrowUpRight size={19}/></span></div>
    <div className="board-type" style={{ color: inkOn(secondary), fontFamily: `'${project.headingFont}', sans-serif` }}><span className="board-label">TIPOGRAFIJA</span><strong>Aa</strong><span>{project.headingFont}</span></div>
    <div className="board-swatches">{project.colors.map((c, i) => <div key={i} style={{ background: c.hex, color: inkOn(c.hex) }}><span>{c.hex}</span></div>)}</div>
  </div>;
}
