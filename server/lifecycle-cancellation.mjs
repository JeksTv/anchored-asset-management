import {randomUUID} from 'node:crypto';
import {connection as db} from './database.mjs';
export function cancelLifecycle(body,actor){
 if(!['admin','super_admin'].includes(actor?.role))throw Error('Only IT administrators can cancel workflows.');
 const reason=String(body.reason||'').trim();if(!reason||reason.length>1000)throw Error('Enter a cancellation reason (up to 1000 characters).');
 if(body.confirmed!==true)throw Error('Confirm that completed provisioning actions will remain unchanged.');
 const kind=body.kind;if(!['Onboarding','Offboarding'].includes(kind))throw Error('Choose a valid workflow.');
 const target=body.restoreStatus||'Active';if(!['Active',...(kind==='Offboarding'?['Onboarding']:[])].includes(target))throw Error('Choose a valid restored status.');
 db.exec('BEGIN IMMEDIATE');try{
 const e=db.prepare('SELECT * FROM employees WHERE id=?').get(body.employeeId);if(!e||e.status!==kind)throw Error('The workflow is no longer in progress. Refresh the employee.');
 if(db.prepare('SELECT 1 FROM departure_documents WHERE employee_id=?').get(e.id))throw Error('Signed departure documents exist. Cancellation requires review of signed records and cannot be performed here.');
 const now=new Date().toISOString();
 db.prepare("UPDATE employees SET status=?,end_date=NULL,departure_reason='' WHERE id=?").run(target,e.id);
 const message=`${kind} cancelled for ${e.name} by ${actor.name||actor.id}. Restored to ${target}. Reason: ${reason}. Previous departure: ${e.end_date||'none'} / ${e.departure_reason||'none'}. Completed asset and account actions retained.`;
 db.prepare('INSERT INTO events(id,employee_id,message,created_at) VALUES(?,?,?,?)').run(randomUUID(),e.id,message,now);
 db.prepare('INSERT INTO security_events(id,actor_id,action,target_id,created_at) VALUES(?,?,?,?,?)').run(randomUUID(),actor.id,kind.toLowerCase()+'_cancelled',e.id,now);
 db.exec('COMMIT');return {ok:true,message};
 }catch(e){db.exec('ROLLBACK');throw e}
}

