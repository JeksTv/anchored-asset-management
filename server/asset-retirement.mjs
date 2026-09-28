import {randomUUID} from 'node:crypto';
import {connection as db} from './database.mjs';
export function retireAsset(body,actor,now=new Date().toISOString()) {
 if(!['admin','super_admin'].includes(actor?.role))throw Error('Only IT administrators can retire assets.');
 const {assetId,retirement_date:date}=body;
 const reason=typeof body.retirement_reason==='string'?body.retirement_reason.trim():'';
 if(!reason||reason.length>4000)throw Error('Enter a retirement reason (up to 4,000 characters).');
 const today=new Date(Date.parse(now)+8*3600000).toISOString().slice(0,10);
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>today)throw Error('Enter a valid retirement date no later than today.');
 db.exec('BEGIN IMMEDIATE');
 try{
  const asset=db.prepare('SELECT * FROM assets WHERE id=?').get(assetId);
  if(!asset||asset.kind!=='Hardware'||!['Ready','Maintenance'].includes(asset.state))throw Error('This hardware is missing or already retired.');
  const details=JSON.parse(asset.details||'{}');
  if(db.prepare('SELECT 1 FROM assignments WHERE asset_id=? AND resolved_at IS NULL').get(assetId)||details.custodian?.trim())throw Error('Resolve the current employee or source custody before retiring this asset.');
  if(db.prepare("SELECT 1 FROM borrowing_items i JOIN borrowings b ON b.id=i.borrowing_id WHERE i.asset_id=? AND i.returned_at IS NULL AND b.status IN ('Reserved','Borrowed')").get(assetId))throw Error('Return or cancel the active borrowing before retiring this asset.');
  const services=db.prepare('SELECT * FROM maintenance WHERE asset_id=? AND completed_date IS NULL').all(assetId);
  if(services.some(s=>date<s.opened_date)||(details.purchase_date&&date<details.purchase_date))throw Error('Retirement cannot precede purchase or an open maintenance record.');
  db.prepare("UPDATE maintenance SET completed_date=?,closure_outcome='Retired',work_done=CASE WHEN work_done='' THEN ? ELSE work_done||char(10)||? END WHERE asset_id=? AND completed_date IS NULL").run(date,'Closed — retired: '+reason,'Closed — retired: '+reason,assetId);
  const retirement={date,reason,recorded_by:actor.name||actor.username||actor.id,recorded_at:now};
  db.prepare("UPDATE assets SET state='Retired',details=? WHERE id=?").run(JSON.stringify({...details,retirement}),assetId);
  const message=asset.tag+' retired: '+reason;
  db.prepare('INSERT INTO asset_events(id,asset_id,message,snapshot,created_at) VALUES(?,?,?,?,?)').run(randomUUID(),assetId,message,JSON.stringify({retirement,previous_state:asset.state,maintenance_closed:services.map(s=>s.id),actor_id:actor.id}),now);
  db.exec('COMMIT');return message;
 }catch(e){db.exec('ROLLBACK');throw e;}
}
