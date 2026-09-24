import {connection as db} from './database.mjs';
import {HttpError} from './auth.mjs';
export function departureSnapshot(id){
 const employee=db.prepare('SELECT id,code,name,email,department,role,start_date,end_date,departure_reason FROM employees WHERE id=?').get(id);
 if(!employee)throw new HttpError(404,'Employee not found.');
 return {employee,items:db.prepare('SELECT x.id,a.name,a.tag,a.serial,a.kind,x.assigned_at,x.resolved_at,x.resolution FROM assignments x JOIN assets a ON a.id=x.asset_id WHERE x.employee_id=? ORDER BY x.assigned_at,x.id').all(id),accounts:db.prepare('SELECT provider,username,status FROM account_requests WHERE employee_id=? ORDER BY id').all(id),accessories:db.prepare('SELECT label,kind,quantity,state,cleared_at FROM kit_tasks WHERE employee_id=? AND assignment_id IS NULL AND account_request_id IS NULL ORDER BY id').all(id)};
}
export function blockers(id,kind='Clearance'){
 const snapshot=departureSnapshot(id),result=[];
 if(db.prepare("SELECT 1 FROM borrowings WHERE employee_id=? AND status IN ('Reserved','Borrowed')").get(id))result.push('Return temporary borrowings or cancel reservations before IT sign-off.');
 if(snapshot.items.some(i=>!i.resolved_at&&(kind==='Clearance'||i.kind==='Hardware')))result.push('Return outstanding equipment'+(kind==='Clearance'?' and revoke software assignments':'')+'.');
 if(snapshot.accessories.some(i=>i.state==='Provisioned'&&(kind==='Clearance'||i.kind==='Accessory')))result.push('Clear provisioned accessories or kit tasks.');
 if(kind==='Clearance'){
  if(snapshot.accounts.some(a=>['Submitted','Approved','Active'].includes(a.status)))result.push('Resolve pending requests and deactivate external accounts.');
  if(db.prepare('SELECT 1 FROM app_users WHERE employee_id=? AND active=1').get(id))result.push('Disable the employee’s application login in Manage access.');
  if(!db.prepare("SELECT id FROM departure_documents WHERE employee_id=? AND type='Turnover'").get(id))result.push('Obtain IT sign-off on the turnover form first.');
 }
 return result;
}
export function requireSignedClearance(id){
 const pending=blockers(id);if(pending.length)throw new HttpError(409,pending.join(' '));
 if(!db.prepare("SELECT id FROM departure_documents WHERE employee_id=? AND type='Clearance'").get(id))throw new HttpError(409,'IT must sign the clearance form before completing offboarding.');
}
