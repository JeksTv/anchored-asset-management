import {connection as db} from '@/server/database.mjs';
import {protect} from '@/server/guards';
import {requireRole,HttpError} from '@/server/auth.mjs';
import {handoverRows,saveHandover} from '@/server/manager-handover.mjs';
export const GET=protect(async(request:Request)=>{
 const q=new URL(request.url).searchParams,id=q.get('file');
 if(id){const f=db.prepare('SELECT evidence,evidence_name,evidence_mime FROM manager_handovers WHERE id=?').get(id);if(!f?.evidence)throw new HttpError(404,'Approval attachment not found.');return new Response(f.evidence,{headers:{'Content-Type':f.evidence_mime,'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(f.evidence_name),'X-Content-Type-Options':'nosniff'}})}
 const employeeId=q.get('employeeId')||'',employee=db.prepare('SELECT status FROM employees WHERE id=?').get(employeeId);if(!employee)throw new HttpError(404,'Employee not found.');
 return Response.json({rows:handoverRows(employeeId),recipients:db.prepare("SELECT id,code,name FROM employees WHERE status='Active' AND id!=? ORDER BY name").all(employeeId),locked:employee.status!=='Offboarding'||!!db.prepare("SELECT id FROM departure_documents WHERE employee_id=? AND type='Clearance'").get(employeeId),history:db.prepare('SELECT e.id,e.actor_name,e.action,e.snapshot,e.created_at FROM manager_handover_events e JOIN manager_handovers h ON h.id=e.handover_id WHERE h.employee_id=? ORDER BY e.created_at DESC').all(employeeId)});
});
export const POST=protect(async(request:Request)=>{
 const actor=requireRole(request,['admin','super_admin']);
 if(Number(request.headers.get('content-length')||0)>9*1024*1024)throw new HttpError(413,'Use a file up to 8 MB.');
 let body:Record<string,unknown>,file:any=null;
 if(request.headers.get('content-type')?.includes('multipart/form-data')){
  const form=await request.formData();body=Object.fromEntries(form);const f=form.get('file');
  if(f instanceof File&&f.size){if(f.size>8*1024*1024||!['application/pdf','image/png','image/jpeg'].includes(f.type))throw new HttpError(400,'Use PDF, JPG or PNG up to 8 MB.');const bytes=Buffer.from(await f.arrayBuffer());const valid=f.type==='application/pdf'?bytes.subarray(0,5).toString()==='%PDF-':f.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes[0]===255&&bytes[1]===216&&bytes[2]===255;if(!valid)throw new HttpError(400,'Attachment content does not match its file type.');file={name:f.name.slice(0,150),mime:f.type,bytes};}
 }else{const raw=await request.text();if(raw.length>16000)throw new HttpError(413,'Request too large.');body=JSON.parse(raw);}
 return Response.json(saveHandover(body,actor,file));
});
