import type { Project } from "../project";
import { pdfVisuals, type PdfOptions, type PdfVisual } from "./options";

export type PdfAssets = {
  logo: string;
  headingSample: string;
  bodySample: string;
  visuals: (PdfVisual & { width: number; height: number })[];
};

function canvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const context = element.getContext("2d");
  if (!context) throw new Error("Preglednik ne podržava pripremu vizuala za PDF.");
  return { element, context };
}

async function imageAsset(source: string, label: string) {
  try {
    const image = new Image();
    // All project images are validated data URLs. No external image URLs are fetched.
    image.src = source;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 64_000_000) throw new Error();
    const scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const { element, context } = canvas(width, height);
    context.drawImage(image, 0, 0, width, height);
    // React PDF accepts PNG/JPEG; generated and imported images are often WebP.
    return { image: element.toDataURL("image/png"), width, height };
  } catch {
    throw new Error(`Slika „${label}“ nije čitljiva. Izaberi drugu varijantu ili isključi AI vizuale i pokušaj ponovo.`);
  }
}

function fitFont(context: CanvasRenderingContext2D, family: string, text: string, width: number, size: number, weight = 400) {
  context.font = `${weight} ${size}px "${family}"`;
  const measured = context.measureText(text).width;
  if (measured > width) context.font = `${weight} ${size * width / measured}px "${family}"`;
}

function drawLogo(project: Project) {
  const { element, context: ctx } = canvas(1500, 400);
  ctx.fillStyle = project.colors[0].hex;
  const label = project.logoText || project.name || "Identitet";
  const hasSymbol = project.logoShape !== "none";
  const labelWidth = hasSymbol ? 1020 : 1340;
  fitFont(ctx, project.headingFont, label, labelWidth, 140, 700);
  const textWidth = ctx.measureText(label).width;
  const totalWidth = textWidth + (hasSymbol ? 320 : 0);
  const left = (1500 - totalWidth) / 2;
  if (hasSymbol) {
    ctx.save();
    ctx.translate(left, 60);
    ctx.scale(2.8, 2.8);
    if (project.logoShape === "spark") {
      for (let i = 0; i < 8; i++) {
        ctx.save(); ctx.translate(50, 50); ctx.rotate(i * Math.PI / 4); ctx.beginPath();
        ctx.ellipse(0, -23, 10, 25, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
    } else if (project.logoShape === "circle") {
      ctx.beginPath(); ctx.arc(36, 50, 32, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(68, 50, 24, 0, Math.PI * 2); ctx.fill();
    } else if (project.logoShape === "arch") {
      ctx.fill(new Path2D("M12 88V46a38 38 0 0176 0v42H64V46a14 14 0 00-28 0v42z"));
    } else if (project.logoShape === "diamond") {
      ctx.fill(new Path2D("M50 3 97 50 50 97 3 50z"));
      ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fill(new Path2D("M50 26 74 50 50 74 26 50z"));
    }
    ctx.restore();
  }
  ctx.textBaseline = "middle";
  ctx.fillText(label, left + (hasSymbol ? 320 : 0), 200);
  return element.toDataURL("image/png");
}

function typeSample(font: string, heading: boolean) {
  const { element, context: ctx } = canvas(1500, heading ? 300 : 200);
  ctx.fillStyle = "#25332c";
  const line = heading ? "Aa Bb Čč Ćć Đđ Šš Žž" : "Dobar identitet počinje jasnom idejom.";
  fitFont(ctx, font, line, 1440, heading ? 125 : 65, heading ? 700 : 400);
  ctx.fillText(line, 15, heading ? 145 : 80);
  ctx.font = `400 ${heading ? 38 : 44}px "${font}"`;
  ctx.fillText(heading ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ · 0123456789" : "Čitljivost, karakter i dosljednost povezuju cijelu priču.", 15, heading ? 235 : 155);
  return element.toDataURL("image/png");
}

export async function preparePdfAssets(project: Project, options: PdfOptions): Promise<PdfAssets> {
  await Promise.all([
    document.fonts.load(`700 24px "${project.headingFont}"`, "Aa Čć Đđ Šš Žž"),
    document.fonts.load(`400 24px "${project.bodyFont}"`, "Aa Čć Đđ Šš Žž"),
  ]);
  const logo = project.logoImage ? (await imageAsset(project.logoImage, "Logotip")).image : drawLogo(project);
  const visuals: PdfAssets["visuals"] = [];
  // Bound peak memory on phones by decoding one image at a time.
  for (const visual of pdfVisuals(project, options)) {
    visuals.push({ ...visual, ...await imageAsset(visual.image, visual.caption) });
  }
  return { logo, headingSample: typeSample(project.headingFont, true), bodySample: typeSample(project.bodyFont, false), visuals };
}
