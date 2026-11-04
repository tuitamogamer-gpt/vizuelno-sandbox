import { z } from "zod";
import { generationSchema, resultSchema, visualTargets, playgroundSchema } from "../generation";
import { projectSchema } from "../project";
export const hashSchema=z.string().regex(/^[a-f0-9]{64}$/);
export const assetReference=z.string().regex(/^asset:[a-f0-9]{64}$/);
const cloudImage=z.union([z.literal(""),assetReference]);
const cloudResult=resultSchema.extend({image:assetReference});
const cloudGeneration=generationSchema.extend({result:cloudResult.nullable().default(null),alternatives:z.array(cloudResult).max(2).default([])});
export const cloudProjectSchema=projectSchema.extend({logoImage:cloudImage,aiImage:cloudImage.default(""),visuals:z.partialRecord(z.enum(visualTargets),cloudGeneration).default({})});
export const cloudPlaygroundSchema=playgroundSchema.extend({generation:cloudGeneration,history:z.array(cloudResult).max(24)});
export type CloudProject=z.infer<typeof cloudProjectSchema>;
export type CloudPlayground=z.infer<typeof cloudPlaygroundSchema>;
export type CloudDocument={kind:"project";data:CloudProject}|{kind:"playground";data:CloudPlayground};
export const documentSchema=z.discriminatedUnion("kind",[z.object({kind:z.literal("project"),data:cloudProjectSchema}),z.object({kind:z.literal("playground"),data:cloudPlaygroundSchema})]);
export const documentId=z.union([z.literal("playground"),z.string().uuid()]);
export const mutationSchema=z.object({revision:z.number().int().positive().nullable(),mutationId:z.string().uuid(),document:documentSchema});
export function references(document:CloudDocument){
  const refs=new Set<string>();
  const visit=(value:unknown):void=>{if(typeof value==="string"&&/^asset:[a-f0-9]{64}$/.test(value))refs.add(value.slice(6));else if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==="object")Object.values(value).forEach(visit);};
  // Only schema-validated image fields can become actual storage references.
  const image=(value:string)=>{if(value)visit(value);};
  const generation=(value:z.infer<typeof cloudGeneration>)=>{if(value.result)image(value.result.image);value.alternatives.forEach(result=>image(result.image));};
  if(document.kind==="project"){image(document.data.logoImage);image(document.data.aiImage);Object.values(document.data.visuals).forEach(generation);}
  else {generation(document.data.generation);document.data.history.forEach(result=>image(result.image));}
  return [...refs];
}
export type DocumentIndex={id:string;kind:"project"|"playground";revision:number;mutationId:string;name:string;progress:number;updatedAt:string;deleted:boolean};
export type RemoteDocument=DocumentIndex&{document:CloudDocument};
