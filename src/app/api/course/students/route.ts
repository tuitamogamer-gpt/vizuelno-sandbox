import { member, json, failure } from "@/lib/cloud/http";
import { getDb } from "@/lib/db";
export async function GET(request:Request){try{await member(request,true);const result=await getDb().query(`SELECT u.id,u.name,u.email,m.student_number,m.group_name,m.joined_at,m.last_active,
 (SELECT count(*)::integer FROM forma_documents d WHERE d.owner_id=u.id AND d.kind='project' AND d.deleted_at IS NULL) AS projects,
 (SELECT COALESCE(max(progress),0)::integer FROM forma_documents d WHERE d.owner_id=u.id AND d.kind='project' AND d.deleted_at IS NULL) AS progress,
 (SELECT count(*)::integer FROM forma_submissions s WHERE s.owner_id=u.id) AS submissions
 FROM forma_members m JOIN forma_user u ON u.id=m.user_id ORDER BY m.last_active DESC LIMIT 1000`);return json({students:result.rows.map(row=>({id:row.id,name:row.name,email:row.email,studentNumber:row.student_number,group:row.group_name,joinedAt:row.joined_at.toISOString(),lastActive:row.last_active.toISOString(),projects:row.projects,progress:row.progress,submissions:row.submissions}))});}catch(e){return failure(e);}}
