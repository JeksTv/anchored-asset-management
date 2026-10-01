import departments from '@/lib/brand-departments.json';
import brands from '@/lib/employee-brands.json';
import employmentTypes from '@/lib/employment-types.json';
import {testCleanupPreview,markTestRecord,deleteTestRecord} from '@/server/test-records.mjs';
import {randomUUID} from 'node:crypto';
import {connection as db} from '@/server/database.mjs';
import {audit,checkOrigin,failure,HttpError,requireRole} from '@/server/auth.mjs';
import {textValue} from '@/lib/asset-service';

export async function GET(request:Request){try{const actor=requireRole(request,['super_admin','admin']);const q=new URL(request.url).searchParams;return Response.json(testCleanupPreview(q.get('kind'),q.get('id'),actor),{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
export async function POST(request:Request){try{
 checkOrigin(request);const actor=requireRole(request,['super_admin','admin']);const b=await request.json() as Record<string,unknown>;
 if(['markTestRecord','deleteTestRecord'].includes(String(b.action))){const kind=textValue(b,'kind',true),id=textValue(b,'id',true),identifier=textValue(b,'identifier',true);return Response.json(b.action==='markTestRecord'?markTestRecord(kind,id,identifier,actor):deleteTestRecord(kind,id,identifier,actor),{headers:{'Cache-Control':'no-store'}})}
 const id=textValue(b,'id',true),now=new Date().toISOString();
 db.exec('BEGIN IMMEDIATE');try{
 if(b.action==='editEmployee'){
  const e=db.prepare('SELECT * FROM employees WHERE id=?').get(id);if(!e)throw new HttpError(404,'Employee not found.');
  if(db.prepare('SELECT id FROM departure_documents WHERE employee_id=? LIMIT 1').get(id))throw new HttpError(409,'This employee has signed departure documents. Identity details are locked to preserve the signed record.');
  const brand=b.brand===undefined?e.brand:textValue(b,'brand');if(brand&&!brands.includes(brand))throw new HttpError(400,'Choose a valid brand.');
  const employmentType=b.employment_type===undefined?e.employment_type:textValue(b,'employment_type');if(employmentType&&!employmentTypes.includes(employmentType))throw new HttpError(400,'Choose a valid employment type.');
  const company=employmentType==='External personnel'?textValue({...b,external_company:b.external_company??e.external_company},'external_company',true):'',sponsor=employmentType==='External personnel'?textValue({...b,internal_sponsor:b.internal_sponsor??e.internal_sponsor},'internal_sponsor',true):'';
  const name=textValue(b,'name',true),code=textValue(b,'code',true),email=textValue(b,'email',true).toLowerCase(),department=textValue(b,'department',true),role=textValue(b,'role',true),start=textValue(b,'start_date');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError(400,'Enter a valid work email.');
  if(start&&(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isFinite(Date.parse(start))||new Date(start).toISOString().slice(0,10)!==start))throw new HttpError(400,'Enter a valid start date.');
  if(start&&e.end_date&&start>e.end_date)throw new HttpError(400,'Start date cannot follow the last working day.');
  if((brand!==e.brand||department!==e.department)&&!(departments as Record<string,string[]>)[brand]?.includes(department))throw new HttpError(400,'Choose a department under the selected brand.');
  db.prepare('UPDATE employees SET name=?,code=?,email=?,department=?,role=?,start_date=?,employment_type=?,brand=?,external_company=?,internal_sponsor=? WHERE id=?').run(name,code,email,department,role,start,employmentType,brand,company,sponsor,id);
  db.prepare('INSERT INTO events(id,employee_id,message,created_at) VALUES(?,?,?,?)').run(randomUUID(),id,'Employee details updated by '+actor.name+(e.brand!==brand?' · Brand changed from '+(e.brand||'Not recorded')+' to '+(brand||'Not recorded'):'')+(e.employment_type!==employmentType?' · Employment type changed from '+(e.employment_type||'Not recorded')+' to '+(employmentType||'Not recorded'):'')+(e.name!==name?' · Name changed from '+e.name+' to '+name:''),now);
  audit(actor.id,'employee_updated',id);
 }else if(b.action==='deleteEmployee'){
  if(db.prepare('SELECT 1 FROM manager_handovers WHERE employee_id=? OR recipient_id=?').get(id,id))throw new HttpError(409,'Manager handover evidence references this employee and must be retained.');
  const e=db.prepare('SELECT * FROM employees WHERE id=?').get(id);if(!e)throw new HttpError(404,'Employee not found.');
  if(['Offboarding','Offboarded'].includes(e.status))throw new HttpError(409,'Departing employee records must be retained.');
  for(const table of ['borrowings','assignments','account_requests','employee_kits','kit_tasks','employee_forms','acknowledgement_uploads','departure_documents','app_users','employee_laptop_arrangements'])if(db.prepare(`SELECT 1 FROM ${table} WHERE employee_id=? LIMIT 1`).get(id))throw new HttpError(409,'Employee has linked records. Keep the profile for history; remove only unused test employees.');
  db.prepare('DELETE FROM events WHERE employee_id=?').run(id);db.prepare('DELETE FROM employees WHERE id=?').run(id);
  audit(actor.id,'employee_deleted:'+JSON.stringify({code:e.code,name:e.name}),id);
 }else if(b.action==='deleteAsset'){
  const a=db.prepare('SELECT * FROM assets WHERE id=?').get(id);if(!a)throw new HttpError(404,'Asset not found.');
  for(const table of ['borrowing_items','assignments','maintenance','form_asset_links','procurement_assets'])if(db.prepare(`SELECT 1 FROM ${table} WHERE asset_id=? LIMIT 1`).get(id))throw new HttpError(409,'This asset has assignment, procurement, maintenance or form history. Retire it from Edit details instead.');
  if(db.prepare('SELECT 1 FROM employee_forms WHERE instr(payload,?)>0 LIMIT 1').get(JSON.stringify(a.tag)))throw new HttpError(409,'A submitted form references this asset. Review the form before deleting.');
  db.prepare('DELETE FROM asset_events WHERE asset_id=?').run(id);db.prepare('DELETE FROM assets WHERE id=?').run(id);
  audit(actor.id,'asset_deleted:'+JSON.stringify({tag:a.tag,name:a.name}),id);
 }else throw new HttpError(400,'Unknown record action.');
 db.exec('COMMIT');return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){db.exec('ROLLBACK');throw e}
}catch(e){if(String(e).includes('UNIQUE'))return Response.json({error:'Employee code or email already exists.'},{status:409});return failure(e)}}
