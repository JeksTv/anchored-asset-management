import {randomUUID} from 'node:crypto';
import {connection as db} from './database.mjs';
import {HttpError} from './auth.mjs';
export function expectedAsset(id){
 const a=db.prepare("SELECT * FROM assets WHERE id=? AND kind='Hardware'").get(id);
 if(!a)throw new HttpError(404,'Hardware asset not found.');
 const d=JSON.parse(a.details||'{}');
 const people=db.prepare('SELECT e.name FROM assignments x JOIN employees e ON e.id=x.employee_id WHERE x.asset_id=? AND x.resolved_at IS NULL ORDER BY e.name').all(id).map(e=>e.name);
 return {tag:a.tag,name:a.name,serial:a.serial||'',custodian:people.join('; ')||d.custodian||'',location:d.location||'',condition:d.condition||'',state:a.state};
}
export function saveVerification(b,actor){
 if(!['admin','super_admin'].includes(actor.role))throw new HttpError(403,'IT administrators only.');
 const now=new Date().toISOString();
 db.exec('BEGIN IMMEDIATE');
 try{
 let id=b.id,assetId=b.assetId;
 if(b.action==='resolve'){
  const r=db.prepare('SELECT * FROM asset_verifications WHERE id=?').get(id);
  if(!r||r.status!=='Open')throw new HttpError(409,'This discrepancy is no longer open.');
  if(typeof b.resolution!=='string'||!b.resolution.trim()||b.resolution.length>4000)throw new HttpError(400,'Enter the resolution, up to 4,000 characters.');
  assetId=r.asset_id;
  db.prepare("UPDATE asset_verifications SET status='Resolved',resolution=?,resolved_at=?,resolved_by=? WHERE id=?").run(b.resolution.trim(),now,actor.name||actor.id,id);
 }else if(b.action==='inspect'){
  const expected=expectedAsset(assetId),observed={};
  for(const field of ['serial','custodian','location','condition','notes']){
   if(typeof b[field]!=='string'||b[field].length>2000)throw new HttpError(400,'Invalid '+field+'.');
   observed[field]=b[field].trim();
  }
  if(!['New','Good','Fair','Damaged','Not found'].includes(observed.condition)||!observed.location)throw new HttpError(400,'Choose a condition and enter the inspected location.');
  const differences=['serial','custodian','location','condition'].filter(k=>expected[k].trim().toLowerCase()!==observed[k].toLowerCase());
  if(observed.condition==='Not found')differences.push('Asset not found');
  id=randomUUID();
  db.prepare('INSERT INTO asset_verifications(id,asset_id,expected,observed,discrepancies,status,checked_at,checked_by,checked_by_name) VALUES(?,?,?,?,?,?,?,?,?)').run(id,assetId,JSON.stringify(expected),JSON.stringify(observed),JSON.stringify(differences),differences.length?'Open':'Verified',now,actor.id,actor.name||actor.id);
 }else throw new HttpError(400,'Unknown verification action.');
 db.prepare('INSERT INTO asset_events(id,asset_id,message,snapshot,created_at) VALUES(?,?,?,?,?)').run(randomUUID(),assetId,b.action==='resolve'?'Physical verification discrepancy resolved':'Physical verification recorded',JSON.stringify({verification_id:id,actor:actor.id}),now);
 db.exec('COMMIT');return {id};
 }catch(e){db.exec('ROLLBACK');throw e;}
}
