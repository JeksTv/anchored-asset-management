import {randomUUID} from 'node:crypto';
import {connection as db} from '@/server/database.mjs';
import {audit,checkOrigin,failure,HttpError,requireRole} from '@/server/auth.mjs';
import {textValue} from '@/lib/asset-service';

export async function POST(request:Request){try{
 checkOrigin(request);const actor=requireRole(request,['super_admin','admin']);const b=await request.json() as Record<string,unknown>;
 const id=textValue(b,'id',true),now=new Date().toISOString();
 db.exec('BEGIN IMMEDIATE');try{
 if(b.action==='editEmployee'){
  const e=db.prepare('SELECT * FROM employees WHERE id=?').get(id);if(!e)throw new HttpError(404,'Employee not found.');
  if(db.prepare('SELECT id FROM departure_documents WHERE employee_id=? LIMIT 1').get(id))throw new HttpError(409,'This employee has signed departure documents. Identity details are locked to preserve the signed record.');
  const name=textValue(b,'name',true),code=textValue(b,'code',true),email=textValue(b,'email',true).toLowerCase(),department=textValue(b,'department',true),role=textValue(b,'role',true),start=textValue(b,'start_date');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError(400,'Enter a valid work email.');
  if(start&&(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isFinite(Date.parse(start))||new Date(start).toISOString().slice(0,10)!==start))throw new HttpError(400,'Enter a valid start date.');
  if(start&&e.end_date&&start>e.end_date)throw new HttpError(400,'Start date cannot follow the last working day.');
  db.prepare('UPDATE employees SET name=?,code=?,email=?,department=?,role=?,start_date=? WHERE id=?').run(name,code,email,department,role,start,id);
  db.prepare('INSERT INTO events(id,employee_id,message,created_at) VALUES(?,?,?,?)').run(randomUUID(),id,'Employee details updated by '+actor.name,now);
  audit(actor.id,'employee_updated',id);
 }else if(b.action==='deleteEmployee'){
  const e=db.prepare('SELECT * FROM employees WHERE id=?').get(id);if(!e)throw new HttpError(404,'Employee not found.');
  if(['Offboarding','Offboarded'].includes(e.status))throw new HttpError(409,'Departing employee records must be retained.');
  for(const table of ['borrowings','assignments','account_requests','employee_kits','kit_tasks','employee_forms','departure_documents','app_users','employee_laptop_arrangements'])if(db.prepare(`SELECT 1 FROM ${table} WHERE employee_id=? LIMIT 1`).get(id))throw new HttpError(409,'Employee has linked records. Keep the profile for history; remove only unused test employees.');
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
