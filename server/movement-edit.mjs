import {connection as db} from './database.mjs';
import {HttpError} from './auth.mjs';
import {randomUUID} from 'node:crypto';
import reasons from '../lib/movement-reasons.json' with {type:'json'};
export function editMovement(b,actor){
 if(!['admin','super_admin'].includes(actor.role))throw new HttpError(403,'IT administrators only.');
 if(!b||typeof b!=='object')throw new HttpError(400,'Invalid request.');
 const date=b.occurred_on;
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>new Date(Date.now()+28800000).toISOString().slice(0,10))throw new HttpError(400,'Enter a valid date no later than today.');
 for(const k of ['reason','notes','allocated_to','correction_reason'])if(typeof b[k]!=='string'||b[k].length>2000)throw new HttpError(400,'Invalid '+k);
 if(!b.correction_reason.trim())throw new HttpError(400,'Explain why this record is being edited.');
 db.exec('BEGIN IMMEDIATE');try{
 const r=db.prepare('SELECT * FROM asset_movements WHERE id=?').get(b.id);
 if(!r)throw new HttpError(404,'Movement not found.');
 if(r.version!==b.version)throw new HttpError(409,'This record changed. Refresh and try again.');
 if(!reasons[r.movement_type]?.includes(b.reason))throw new HttpError(400,'Choose a reason for this movement type.');
 if((b.reason==='Change Laptop'||b.reason.startsWith('Gadget Loan completed'))&&!b.notes.trim())throw new HttpError(400,'Add the replacement explanation or loan completion and three-year eligibility details.');
 db.prepare('UPDATE asset_movements SET occurred_on=?,reason=?,notes=?,allocated_to=?,version=version+1 WHERE id=?').run(date,b.reason,b.notes.trim(),b.allocated_to.trim(),r.id);
 const after=db.prepare('SELECT * FROM asset_movements WHERE id=?').get(r.id);
 db.prepare('INSERT INTO movement_edits VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),r.id,JSON.stringify(r),JSON.stringify(after),b.correction_reason.trim(),actor.id,actor.name||actor.id,new Date().toISOString());
 db.exec('COMMIT');return {row:after};
 }catch(e){db.exec('ROLLBACK');throw e}
}
