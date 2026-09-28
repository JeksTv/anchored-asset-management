import { connection as db, dataDir } from './database.mjs';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { HttpError, audit } from './auth.mjs';

const scopes = {
  employee: { table: 'employees', label: 'code' },
  asset: { table: 'assets', label: 'tag' },
};
const one = (sql, id) => db.prepare(sql).get(id);
const count = (sql, id) => Number(one(sql, id)?.n || 0);
function countMap(queries, id) {
  return Object.fromEntries(Object.entries(queries).map(([key, sql]) => [key, count(sql, id)]));
}
const employeeQueries = {
  assignments: 'SELECT COUNT(*) n FROM assignments WHERE employee_id=?',
  accountRequests: 'SELECT COUNT(*) n FROM account_requests WHERE employee_id=?',
  kits: 'SELECT COUNT(*) n FROM employee_kits WHERE employee_id=?',
  kitTasks: 'SELECT COUNT(*) n FROM kit_tasks WHERE employee_id=?',
  forms: 'SELECT COUNT(*) n FROM employee_forms WHERE employee_id=?',
  formAttachments: 'SELECT COUNT(*) n FROM form_files f JOIN employee_forms e ON e.id=f.form_id WHERE e.employee_id=?',
  formAssetLinks: 'SELECT COUNT(*) n FROM form_asset_links l JOIN employee_forms e ON e.id=l.form_id WHERE e.employee_id=?',
  events: 'SELECT COUNT(*) n FROM events WHERE employee_id=?',
  borrowingItems: 'SELECT COUNT(*) n FROM borrowing_items i JOIN borrowings b ON b.id=i.borrowing_id WHERE b.employee_id=?',
  borrowingAttachments: 'SELECT COUNT(*) n FROM borrowing_files f JOIN borrowings b ON b.id=f.borrowing_id WHERE b.employee_id=?',
  signedDepartureDocuments: 'SELECT COUNT(*) n FROM departure_documents WHERE employee_id=?',
  logins: 'SELECT COUNT(*) n FROM app_users WHERE employee_id=?',
  laptopArrangements: 'SELECT COUNT(*) n FROM employee_laptop_arrangements WHERE employee_id=?',
  borrowings: 'SELECT COUNT(*) n FROM borrowings WHERE employee_id=?',
};
const assetQueries = {
  assignments: 'SELECT COUNT(*) n FROM assignments WHERE asset_id=?',
  maintenance: 'SELECT COUNT(*) n FROM maintenance WHERE asset_id=?',
  assetEvents: 'SELECT COUNT(*) n FROM asset_events WHERE asset_id=?',
  linkedKitTasks: 'SELECT COUNT(*) n FROM kit_tasks WHERE assignment_id IN (SELECT id FROM assignments WHERE asset_id=?)',
  formLinks: 'SELECT COUNT(*) n FROM form_asset_links WHERE asset_id=?',
  borrowingItems: 'SELECT COUNT(*) n FROM borrowing_items WHERE asset_id=?',
  procurementLinks: 'SELECT COUNT(*) n FROM procurement_assets WHERE asset_id=?',
};
export function testCleanupPreview(kind, id, actor) {
  const scope = scopes[kind];
  if (!scope) throw new HttpError(400, 'Choose an employee or asset.');
  const record = one(`SELECT * FROM ${scope.table} WHERE id=?`, id);
  if (!record) throw new HttpError(404, 'Record not found.');
  const identifier = record[scope.label];
  if (!record.is_test) return { kind, id, identifier, canDelete: false, reason: 'Mark this record as a test record first.', counts: {} };
  const counts = countMap(kind === 'employee' ? employeeQueries : assetQueries, id);
  const reasons = [];
  if (kind === 'employee') {
    if (one("SELECT 1 FROM app_users WHERE employee_id=? AND role!='user'", id)) reasons.push('An Admin or Super Admin login is linked to this employee.');
    if (actor.role !== 'super_admin' && counts.logins) reasons.push('Only a Super Admin can delete a test employee with a linked login.');
    if (one("SELECT 1 FROM borrowing_items i JOIN borrowings b ON b.id=i.borrowing_id WHERE b.employee_id=? AND b.status IN ('Reserved','Borrowed')", id)) reasons.push('Return or cancel active borrowing first.');
  } else {
    if (counts.procurementLinks) reasons.push('Procurement and invoice links must be retained.');
    if (one('SELECT 1 FROM assignments x JOIN employees e ON e.id=x.employee_id WHERE x.asset_id=? AND e.is_test=0', id)) reasons.push('This asset has a real employee assignment.');
    if (one('SELECT 1 FROM form_asset_links l JOIN employee_forms f ON f.id=l.form_id JOIN employees e ON e.id=f.employee_id WHERE l.asset_id=? AND e.is_test=0', id)) reasons.push('A real employee form references this asset.');
    if (one("SELECT 1 FROM borrowing_items i JOIN borrowings b ON b.id=i.borrowing_id WHERE i.asset_id=? AND b.status IN ('Reserved','Borrowed')", id)) reasons.push('Return or cancel active borrowing first.');
    if (one('SELECT 1 FROM borrowing_items i JOIN borrowings b ON b.id=i.borrowing_id JOIN employees e ON e.id=b.employee_id WHERE i.asset_id=? AND e.is_test=0', id)) reasons.push('A real employee borrowing references this asset.');
    if (one('SELECT 1 FROM borrowing_items i WHERE i.asset_id=? AND (SELECT COUNT(*) FROM borrowing_items WHERE borrowing_id=i.borrowing_id)>1',id)) reasons.push('A borrowing includes other assets.');
    if (one('SELECT 1 FROM employee_forms WHERE instr(payload,?)>0 LIMIT 1', JSON.stringify(record.tag))) reasons.push('A submitted form may reference this asset tag.');
  }
  return { kind, id, identifier, name: record.name, canDelete: !reasons.length, reason: reasons.join(' '), counts, linkedAssetsPreserved: kind === 'employee' };
}
export function markTestRecord(kind, id, identifier, actor) {
  if (!scopes[kind]) throw new HttpError(400, 'Choose an employee or asset.');
  db.exec('BEGIN IMMEDIATE');
  try {
    const scope = scopes[kind];
    const record = one(`SELECT * FROM ${scope.table} WHERE id=?`, id);
    if (!record) throw new HttpError(404, 'Record not found.');
    if (identifier !== record[scope.label]) throw new HttpError(400, `Type the exact ${scope.label} to mark this as test data.`);
    if (kind === 'employee' && (['Offboarding','Offboarded'].includes(record.status) || count(employeeQueries.signedDepartureDocuments,id)) && !/^TEST[-_]/i.test(record.code)) throw new HttpError(409, 'Departed or signed-clearance employees can be marked as test only with a TEST- employee ID.');
    db.prepare(`UPDATE ${scope.table} SET is_test=1 WHERE id=?`).run(id);
    audit(actor.id, `${kind}_marked_test`, id);
    db.exec('COMMIT');
    return testCleanupPreview(kind,id,actor);
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}
export function deleteTestRecord(kind,id,identifier,actor) {
  const uploadIds=[];
  db.exec('BEGIN IMMEDIATE');
  try {
    const preview = testCleanupPreview(kind,id,actor);
    if (!preview.canDelete) throw new HttpError(409, preview.reason);
    if (identifier !== preview.identifier) throw new HttpError(400, `Type the exact ${kind==='employee'?'employee ID':'asset tag'} to confirm deletion.`);
    if (kind === 'employee') {
      const formIds=db.prepare('SELECT id FROM employee_forms WHERE employee_id=?').all(id).map(x=>x.id);
      for(const formId of formIds){
        uploadIds.push(...db.prepare('SELECT id FROM form_files WHERE form_id=?').all(formId).map(x=>x.id));
        db.prepare('DELETE FROM form_asset_links WHERE form_id=?').run(formId);
        db.prepare('DELETE FROM form_applications WHERE form_id=?').run(formId);
        db.prepare('DELETE FROM form_files WHERE form_id=?').run(formId);
      }
      db.prepare('DELETE FROM employee_forms WHERE employee_id=?').run(id);
      db.prepare('DELETE FROM account_requests WHERE employee_id=?').run(id);
      db.prepare('DELETE FROM kit_tasks WHERE employee_id=?').run(id);
      db.prepare('DELETE FROM employee_kits WHERE employee_id=?').run(id);
      for(const loanId of db.prepare('SELECT id FROM borrowings WHERE employee_id=?').all(id).map(x=>x.id)){
        db.prepare('DELETE FROM borrowing_files WHERE borrowing_id=?').run(loanId);
        db.prepare('DELETE FROM borrowing_history WHERE borrowing_id=?').run(loanId);
        db.prepare('DELETE FROM borrowing_items WHERE borrowing_id=?').run(loanId);
        db.prepare('DELETE FROM borrowings WHERE id=?').run(loanId);
      }
      db.prepare('DELETE FROM departure_documents WHERE employee_id=?').run(id);
      db.prepare('DELETE FROM employee_laptop_arrangements WHERE employee_id=?').run(id);
      for(const uid of db.prepare('SELECT id FROM app_users WHERE employee_id=?').all(id).map(x=>x.id)){
        db.prepare('DELETE FROM app_sessions WHERE user_id=?').run(uid);
        db.prepare('DELETE FROM app_users WHERE id=?').run(uid);
      }
      db.prepare('DELETE FROM assignments WHERE employee_id=?').run(id);
      db.prepare('DELETE FROM events WHERE employee_id=?').run(id);
      db.prepare('DELETE FROM employees WHERE id=?').run(id);
    } else {
      const loans=db.prepare('SELECT DISTINCT borrowing_id id FROM borrowing_items WHERE asset_id=?').all(id);
      for(const loan of loans){
        const itemCount=count('SELECT COUNT(*) n FROM borrowing_items WHERE borrowing_id=?',loan.id);
        if(itemCount!==1)throw new HttpError(409,'A borrowing includes other assets. Remove the test employee or retain this history.');
        db.prepare('DELETE FROM borrowing_files WHERE borrowing_id=?').run(loan.id);
        db.prepare('DELETE FROM borrowing_history WHERE borrowing_id=?').run(loan.id);
        db.prepare('DELETE FROM borrowing_items WHERE borrowing_id=?').run(loan.id);
        db.prepare('DELETE FROM borrowings WHERE id=?').run(loan.id);
      }
      db.prepare('DELETE FROM kit_tasks WHERE assignment_id IN (SELECT id FROM assignments WHERE asset_id=?)').run(id);
      db.prepare('DELETE FROM assignments WHERE asset_id=?').run(id);
      db.prepare('DELETE FROM form_asset_links WHERE asset_id=?').run(id);
      db.prepare('DELETE FROM maintenance WHERE asset_id=?').run(id);
      db.prepare('DELETE FROM asset_events WHERE asset_id=?').run(id);
      db.prepare('DELETE FROM assets WHERE id=?').run(id);
    }
    audit(actor.id,`${kind}_test_deleted:${JSON.stringify({identifier:preview.identifier,name:preview.name,counts:preview.counts})}`,id);
    db.exec('COMMIT');
    for(const fileId of uploadIds){try{unlinkSync(join(dataDir,'uploads',fileId))}catch(e){if(e.code!=='ENOENT')console.error('Unable to remove test upload',fileId,e.message)}}
    return {ok:true};
  } catch(e){db.exec('ROLLBACK');throw e;}
}
