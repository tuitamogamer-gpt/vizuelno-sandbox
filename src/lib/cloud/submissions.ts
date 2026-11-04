import { Feedback, Submission } from "../account-types";
import { getDb, transaction } from "../db";
import { CloudError } from "./http";
import { cloudProjectSchema, references } from "./schema";
import { cleanVisuals, isPending } from "../generation";
import { progress } from "../project";
import { requireAssets } from "./documents";
type Row={id:string;project_id:string;project_name:string;author_name:string;version:number;project_revision:number;created_at:Date;status:Submission["status"];comment:string;criteria:Feedback["criteria"];reviewed_at:Date|null;reviewer_name:string|null;owner_id:string;owner_email?:string};
export function submissionView(row:Row):Submission{return {id:row.id,projectId:row.project_id,projectName:row.project_name,authorName:row.author_name,version:row.version,projectRevision:row.project_revision,createdAt:row.created_at.toISOString(),status:row.status,comment:row.comment,criteria:row.criteria,reviewedAt:row.reviewed_at?.toISOString()??null,reviewerName:row.reviewer_name,ownerId:row.owner_id,...(row.owner_email?{ownerEmail:row.owner_email}:{})};}
export async function submitProject(owner:string,id:string,revision:number){
 return transaction(async client=>{
  await client.query("SELECT user_id FROM forma_members WHERE user_id=$1 FOR UPDATE",[owner]);
  const row=(await client.query("SELECT data,revision FROM forma_documents WHERE owner_id=$1 AND id=$2 AND kind='project' AND deleted_at IS NULL",[owner,id])).rows[0];
  if(!row)throw new CloudError("Projekat nije pronađen.",404);
  if(row.revision!==revision)throw new CloudError("Prvo sinhronizuj posljednju verziju rada.",409);
  const existing=(await client.query<Row>("SELECT *,NULL AS reviewer_name FROM forma_submissions WHERE owner_id=$1 AND project_id=$2 AND project_revision=$3",[owner,id,revision])).rows[0];
  if(existing)return submissionView(existing);
  const project=cloudProjectSchema.parse(row.data);
  if(progress(project)!==100)throw new CloudError("Prije predaje popuni sve elemente iz kontrolne liste.",422);
  if(Object.values(project.visuals).some(isPending))throw new CloudError("Sačekaj završetak generisanja prije predaje.",422);
  const snapshot={...project,visuals:cleanVisuals(project.visuals),aiJob:null,aiRequest:null};
  const hashes=references({kind:"project",data:snapshot});await requireAssets(client,owner,hashes);
  const version=(await client.query("SELECT COALESCE(max(version),0)+1 AS version FROM forma_submissions WHERE owner_id=$1 AND project_id=$2",[owner,id])).rows[0].version;
  const result=await client.query<Row>("INSERT INTO forma_submissions(id,owner_id,project_id,project_name,author_name,project_revision,version,data) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *,NULL AS reviewer_name",[crypto.randomUUID(),owner,id,project.name,project.author,revision,version,JSON.stringify(snapshot)]);
  if(hashes.length)await client.query("INSERT INTO forma_submission_assets(owner_id,submission_id,hash) SELECT $1,$2,unnest($3::text[])",[owner,result.rows[0].id,hashes]);
  return submissionView(result.rows[0]);
 });
}
export async function submissions(owner:string|null){
 const result=await getDb().query<Row>(`SELECT s.*,u.name AS reviewer_name,${owner?"NULL":"o.email"} AS owner_email FROM forma_submissions s
 LEFT JOIN forma_user u ON u.id=s.reviewer_id JOIN forma_user o ON o.id=s.owner_id ${owner?"WHERE s.owner_id=$1":""} ORDER BY s.created_at DESC LIMIT 500`,owner?[owner]:[]);
 return result.rows.map(submissionView);
}
export async function reviewSubmission(id:string,reviewer:string,feedback:Feedback){const result=await getDb().query<Row>("UPDATE forma_submissions SET status=$2,comment=$3,criteria=$4,reviewer_id=$5,reviewed_at=now() WHERE id=$1 RETURNING *,NULL AS reviewer_name",[id,feedback.status,feedback.comment,JSON.stringify(feedback.criteria),reviewer]);if(!result.rows[0])throw new CloudError("Predaja nije pronađena.",404);return submissionView(result.rows[0]);}
