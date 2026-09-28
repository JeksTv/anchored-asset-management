import {connection as db} from '@/server/database.mjs';
import {protect} from '@/server/guards';
import {requireRole,HttpError} from '@/server/auth.mjs';
import {randomUUID} from 'node:crypto';
export const GET=protect(async(request:Request)=>{
 const q=new URL(request.url).searchParams,id=q.get('id');
 if(id){const r=db.prepare('SELECT * FROM acknowledgement_uploads WHERE id=?').get(id);if(!r)throw new HttpError(404,'Document not found.');return new Response(r.content,{headers:{'Content-Type':r.mime,'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(r.name),'X-Content-Type-Options':'nosniff'}})}
 return Response.json({rows:db.prepare('SELECT id,name,size,signed_date,notes,uploaded_at,uploaded_by_name FROM acknowledgement_uploads WHERE employee_id=? ORDER BY uploaded_at DESC').all(q.get('employeeId')||'')});
});
export const POST=protect(async(request:Request)=>{
 const actor=requireRole(request,['admin','super_admin']);
 if(Number(request.headers.get('content-length')||0)>9*1024*1024)throw new HttpError(413,'Use a file up to 8 MB.');
 const f=await request.formData(),file=f.get('file'),employeeId=String(f.get('employeeId')||''),date=String(f.get('signed_date')||''),notes=String(f.get('notes')||'');
 if(!db.prepare('SELECT id FROM employees WHERE id=?').get(employeeId))throw new HttpError(404,'Employee not found.');
 if(!(file instanceof File)||!file.size||file.size>8*1024*1024||!['application/pdf','image/png','image/jpeg'].includes(file.type))throw new HttpError(400,'Upload PDF, JPG or PNG, up to 8 MB.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>new Date(Date.now()+8*3600000).toISOString().slice(0,10)||notes.length>2000)throw new HttpError(400,'Enter a valid signed date no later than today and notes up to 2,000 characters.');
 const bytes=Buffer.from(await file.arrayBuffer());
 const valid=file.type==='application/pdf'?bytes.subarray(0,5).toString()==='%PDF-':file.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(!valid)throw new HttpError(400,'The file content does not match its type.');
 const id=randomUUID(),now=new Date().toISOString();db.exec('BEGIN IMMEDIATE');try{
 db.prepare('INSERT INTO acknowledgement_uploads VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,employeeId,file.name.slice(0,150),file.type,bytes,file.size,date,notes,now,actor.id,actor.name||actor.id);
 db.prepare('INSERT INTO events VALUES(?,?,?,?)').run(randomUUID(),employeeId,'Existing signed acknowledgement uploaded by '+actor.name,now);db.exec('COMMIT');
 }catch(e){db.exec('ROLLBACK');throw e}return Response.json({id});
});
