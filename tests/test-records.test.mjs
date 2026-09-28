import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
process.env.DATA_DIR=mkdtempSync(join(tmpdir(),'anchored-test-cleanup-'));
execFileSync(process.execPath,['scripts/migrate.mjs'],{env:process.env});
const {connection:db}=await import('../server/database.mjs');
const {markTestRecord,testCleanupPreview,deleteTestRecord}=await import('../server/test-records.mjs');
const superAdmin={id:'admin',name:'Super Admin',role:'super_admin'};
const admin={id:'limited',name:'Admin',role:'admin'};
const emp=(id,code,isTest=0)=>db.prepare('INSERT INTO employees(id,code,name,email,department,role,start_date,status,is_test) VALUES(?,?,?,?,?,?,?,?,?)').run(id,code,code,`${id}@example.test`,'IT','Tester','2026-01-01','Active',isTest);
const asset=(id,tag,isTest=0)=>db.prepare('INSERT INTO assets(id,tag,name,kind,is_test) VALUES(?,?,?,?,?)').run(id,tag,tag,'Hardware',isTest);
emp('test','TEST-001',1);emp('real','EMP-001');asset('real-asset','HW-001');asset('test-asset','TEST-HW',1);

test('preview requires explicit test label and exact identifier',()=>{
 assert.equal(testCleanupPreview('asset','real-asset',superAdmin).canDelete,false);
 assert.throws(()=>markTestRecord('asset','real-asset','wrong',superAdmin),/exact tag/);
 assert.equal(db.prepare('SELECT is_test FROM assets WHERE id=?').get('real-asset').is_test,0);
});
test('test employee cleanup removes linked login and assignments but keeps real inventory',()=>{
 db.prepare('INSERT INTO assignments(id,employee_id,asset_id,assigned_at) VALUES(?,?,?,?)').run('assign','test','real-asset','2026-01-01');
 db.prepare("INSERT INTO app_users(id,username,name,role,password_hash,created_at,employee_id) VALUES('login','test-login','Tester','user','hash','2026-01-01','test')").run();
 db.prepare("INSERT INTO app_sessions(token_hash,user_id,expires_at) VALUES('token','login',9999999999999)").run();
 assert.equal(testCleanupPreview('employee','test',admin).canDelete,false);
 assert.equal(testCleanupPreview('employee','test',superAdmin).counts.assignments,1);
 assert.throws(()=>deleteTestRecord('employee','test','wrong',superAdmin),/exact employee ID/);
 deleteTestRecord('employee','test','TEST-001',superAdmin);
 assert.equal(db.prepare('SELECT 1 FROM employees WHERE id=?').get('test'),undefined);
 assert.equal(db.prepare('SELECT 1 FROM app_users WHERE id=?').get('login'),undefined);
 assert.equal(db.prepare('SELECT 1 FROM app_sessions WHERE user_id=?').get('login'),undefined);
 assert.equal(db.prepare('SELECT 1 FROM assignments WHERE id=?').get('assign'),undefined);
 assert.ok(db.prepare('SELECT 1 FROM assets WHERE id=?').get('real-asset'));
 assert.ok(db.prepare('SELECT 1 FROM employees WHERE id=?').get('real'));
});
test('test asset deletion blocks real-employee activity and preserves procurement',()=>{
 db.prepare('INSERT INTO assignments(id,employee_id,asset_id,assigned_at) VALUES(?,?,?,?)').run('real-assignment','real','test-asset','2026-01-01');
 assert.match(testCleanupPreview('asset','test-asset',superAdmin).reason,/real employee assignment/);
 assert.throws(()=>deleteTestRecord('asset','test-asset','TEST-HW',superAdmin),/real employee assignment/);
 db.prepare('DELETE FROM assignments WHERE id=?').run('real-assignment');
 assert.equal(testCleanupPreview('asset','test-asset',superAdmin).canDelete,true);
 deleteTestRecord('asset','test-asset','TEST-HW',superAdmin);
 assert.equal(db.prepare('SELECT 1 FROM assets WHERE id=?').get('test-asset'),undefined);
});
test('marking a pre-existing test record requires its exact ID',()=>{
 assert.equal(markTestRecord('asset','real-asset','HW-001',superAdmin).canDelete,true);
 assert.equal(db.prepare('SELECT is_test FROM assets WHERE id=?').get('real-asset').is_test,1);
});

test('signed test departure records can be cleaned only when explicitly labeled',()=>{
 emp('departed','TEST-DEPART',1);
 db.prepare("UPDATE employees SET status='Offboarded' WHERE id='departed'").run();
 db.prepare('INSERT INTO departure_documents(id,employee_id,type,snapshot,signed_by,signer_name,signer_username,signed_at,note,digest) VALUES(?,?,?,?,?,?,?,?,?,?)').run('doc','departed','Turnover','{}','it','IT','it','2026-01-01','test','digest');
 assert.equal(testCleanupPreview('employee','departed',superAdmin).counts.signedDepartureDocuments,1);
 deleteTestRecord('employee','departed','TEST-DEPART',superAdmin);
 assert.equal(db.prepare('SELECT 1 FROM departure_documents WHERE id=?').get('doc'),undefined);
 assert.equal(db.prepare('SELECT 1 FROM employees WHERE id=?').get('departed'),undefined);
});
