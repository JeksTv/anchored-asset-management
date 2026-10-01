import {randomUUID} from 'node:crypto';
import {connection as db} from './database.mjs';
import {HttpError} from './auth.mjs';
export function handoverAccounts(employeeId) {
 const rows=db.prepare("SELECT id,provider,username,services,purpose,status,account_role FROM account_requests WHERE employee_id=? AND status IN ('Active','Disabled')").all(employeeId).map(r=>({key:'account:'+r.id,name:r.services||r.provider,identifier:r.username,purpose:r.purpose,designation:r.account_role,status:r.status}));
 for(const r of db.prepare("SELECT x.id,x.identifier,x.resolved_at,a.name,a.tag FROM assignments x JOIN assets a ON a.id=x.asset_id WHERE x.employee_id=? AND a.kind IN ('Account','Software')").all(employeeId)) rows.push({key:'assignment:'+r.id,name:r.name,identifier:r.identifier||r.tag,purpose:'Inventory account or software access',status:r.resolved_at?'Cleared':'Assigned'});
 for(const r of db.prepare("SELECT id,label,state FROM kit_tasks WHERE employee_id=? AND kind!='Accessory' AND assignment_id IS NULL AND account_request_id IS NULL AND state IN ('Provisioned','Cleared')").all(employeeId)) rows.push({key:'kit:'+r.id,name:r.label,identifier:'Kit access',purpose:'Provisioned kit access',status:r.state});
 return rows;
}
export function handoverRows(employeeId) {
 const saved=db.prepare('SELECT h.id,h.source_key,h.account_snapshot,h.decision,h.manager_name,h.approved_on,h.recipient_id,h.instructions,h.evidence_reference,h.evidence_name,h.completed_at,h.completed_by,h.completion_note,h.recorded_by,h.updated_at,h.version,e.name recipient_name FROM manager_handovers h LEFT JOIN employees e ON e.id=h.recipient_id WHERE h.employee_id=?').all(employeeId);
 return handoverAccounts(employeeId).map(account=>{const review=saved.find(r=>r.source_key===account.key)||null;const original=review?JSON.parse(review.account_snapshot):null;const changed=original&&['name','identifier','purpose','designation'].some(k=>(original[k]||'')!==(account[k]||''));return {...account,review,changed:!!changed}});
}
export function handoverBlockers(employeeId) {
 const pending=handoverRows(employeeId).filter(r=>r.changed||!r.review||r.review.decision==='Transfer'&&!r.review.completed_at);
 return pending.length?[`Complete manager account handover clearance for ${pending.length} account/access item(s).`]:[];
}
const field=(b,key,required=false)=>{const v=String(b[key]??'').trim();if(v.length>2000||(required&&!v))throw new HttpError(400,`Enter ${key.replaceAll('_',' ')} (up to 2,000 characters).`);return v};
export function saveHandover(b,actor,file=null) {
 if(!['admin','super_admin'].includes(actor.role))throw new HttpError(403,'IT access required.');
 const employeeId=field(b,'employeeId',true),key=field(b,'source_key',true);
 db.exec('BEGIN IMMEDIATE');try {
  const employee=db.prepare('SELECT status FROM employees WHERE id=?').get(employeeId);
  if(!employee||employee.status!=='Offboarding')throw new HttpError(409,'Start offboarding before recording manager clearance.');
  if(db.prepare("SELECT id FROM departure_documents WHERE employee_id=? AND type='Clearance'").get(employeeId))throw new HttpError(409,'The signed clearance is locked.');
  const account=handoverAccounts(employeeId).find(a=>a.key===key);if(!account)throw new HttpError(404,'Account/access item not found.');
  const old=db.prepare('SELECT * FROM manager_handovers WHERE employee_id=? AND source_key=?').get(employeeId,key);
  if(file&&old?.evidence)throw new HttpError(409,'Existing approval attachments are retained and cannot be replaced.');
  if(Number(b.version||0)!==(old?.version||0))throw new HttpError(409,'This handover changed. Refresh and try again.');
  const now=new Date().toISOString(),id=old?.id||randomUUID();
  if(b.action==='complete') {
   if(handoverRows(employeeId).find(r=>r.key===key)?.changed)throw new HttpError(409,'Account details changed. Review manager approval again.');
   if(!old||old.decision!=='Transfer'||old.completed_at)throw new HttpError(409,'Record manager approval before completing the handover.');
   if(!db.prepare("SELECT id FROM employees WHERE id=? AND status='Active'").get(old.recipient_id))throw new HttpError(409,'The receiving employee is no longer active. Update the approval first.');
   const note=field(b,'completion_note',true);if(b.confirmed!==true&&b.confirmed!=='true')throw new HttpError(400,'Confirm that IT completed the approved transfer.');
   db.prepare('UPDATE manager_handovers SET completed_at=?,completed_by=?,completion_note=?,updated_at=?,version=version+1 WHERE id=?').run(now,actor.name||actor.id,note,now,id);
  } else if(b.action==='review') {
   if(old?.completed_at&&!handoverRows(employeeId).find(r=>r.key===key)?.changed)throw new HttpError(409,'Completed handovers are locked.');
   const decision=field(b,'decision',true),manager=field(b,'manager_name',true),approved=field(b,'approved_on',true),instructions=field(b,'instructions',true),reference=field(b,'evidence_reference');
   if(!['Transfer','No handover'].includes(decision))throw new HttpError(400,'Choose a manager decision.');
   if(!/^\d{4}-\d{2}-\d{2}$/.test(approved)||!Number.isFinite(Date.parse(approved))||new Date(approved).toISOString().slice(0,10)!==approved||approved>new Date(Date.now()+8*3600000).toISOString().slice(0,10))throw new HttpError(400,'Enter a valid approval date no later than today.');
   const recipient=decision==='Transfer'?field(b,'recipient_id',true):null;
   if(recipient&&(recipient===employeeId||!db.prepare("SELECT id FROM employees WHERE id=? AND status='Active'").get(recipient)))throw new HttpError(400,'Choose another active employee to receive the business resources.');
   if(!reference&&!file&&!old?.evidence)throw new HttpError(400,'Attach manager approval or record its approval-email/document reference.');
   db.prepare(`INSERT INTO manager_handovers(id,employee_id,source_key,account_snapshot,decision,manager_name,approved_on,recipient_id,instructions,evidence_reference,evidence_name,evidence_mime,evidence,recorded_by,updated_at,version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(employee_id,source_key) DO UPDATE SET completed_at=NULL,completed_by=NULL,completion_note='',account_snapshot=excluded.account_snapshot,decision=excluded.decision,manager_name=excluded.manager_name,approved_on=excluded.approved_on,recipient_id=excluded.recipient_id,instructions=excluded.instructions,evidence_reference=excluded.evidence_reference,evidence_name=excluded.evidence_name,evidence_mime=excluded.evidence_mime,evidence=excluded.evidence,recorded_by=excluded.recorded_by,updated_at=excluded.updated_at,version=excluded.version`).run(id,employeeId,key,JSON.stringify(account),decision,manager,approved,recipient,instructions,reference,file?.name||old?.evidence_name||'',file?.mime||old?.evidence_mime||'',file?.bytes||old?.evidence||null,actor.name||actor.id,now,(old?.version||0)+1);
  } else throw new HttpError(400,'Unknown handover action.');
  const updated=handoverRows(employeeId).find(r=>r.key===key);
  db.prepare('INSERT INTO manager_handover_events VALUES(?,?,?,?,?,?,?)').run(randomUUID(),id,actor.id,actor.name||actor.id,String(b.action),JSON.stringify(updated),now);
  db.prepare('INSERT INTO events VALUES(?,?,?,?)').run(randomUUID(),employeeId,`Manager account handover ${b.action==='complete'?'completed':'approval recorded'} by IT: ${actor.name||actor.id} (${account.name})`,now);
  db.exec('COMMIT');return {ok:true,id};
 }catch(e){db.exec('ROLLBACK');throw e}
}
