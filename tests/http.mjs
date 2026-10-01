import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
process.env.DATA_DIR=mkdtempSync(join(tmpdir(),'anchored-http-'));
process.env.APP_ORIGIN='https://localhost:3197';process.env.NODE_ENV='production';
execFileSync(process.execPath,['scripts/migrate.mjs'],{env:process.env});
const {connection:db}=await import('../server/database.mjs');
const {passwordHash}=await import('../server/auth.mjs');
const password='Disposable-test-password-42';const hash=await passwordHash(password);
for(const id of ['one','two'])db.prepare('INSERT INTO employees(id,code,name,email,department,role,start_date) VALUES(?,?,?,?,?,?,?)').run(id,id,id,id+'@example.test','IT','Employee','2026-01-01');
for(const [id,role,employee] of [['super','super_admin',null],['admin','admin',null],['user','user','one']])db.prepare('INSERT INTO app_users(id,username,name,role,employee_id,password_hash,must_change_password,created_at) VALUES(?,?,?,?,?,?,0,?)').run(id,id,id,role,employee,hash,new Date().toISOString());
mkdirSync(join(process.env.DATA_DIR,'uploads'));
for(const id of ['one','two']){db.prepare('INSERT INTO employee_forms(id,employee_id,type,payload,submitted_by,submitted_at) VALUES(?,?,?,?,?,?)').run(id,id,'Incident','{}','IT',new Date().toISOString());db.prepare('INSERT INTO form_files(id,form_id,name,mime,size,created_at) VALUES(?,?,?,?,?,?)').run(id,id,id+'.png','image/png',8,new Date().toISOString());writeFileSync(join(process.env.DATA_DIR,'uploads',id),Buffer.from([137,80,78,71,13,10,26,10]));}
const server=spawn(process.execPath,['node_modules/vinext/dist/cli.js','start','--hostname','127.0.0.1','--port','3197'],{env:process.env,stdio:['ignore','pipe','pipe'],windowsHide:true});
let logs='';server.stdout.on('data',b=>logs+=b);server.stderr.on('data',b=>logs+=b);
const base='http://localhost:3197';
async function request(path,token='',body,origin=process.env.APP_ORIGIN){return fetch(base+path,{method:body?'POST':'GET',headers:{...(token?{Cookie:token}:{}),...(body?{'Content-Type':'application/json',Origin:origin}:{})},body:body?JSON.stringify(body):undefined})}
async function login(username){const r=await request('/api/auth','',{action:'login',username,password});if(r.status!==200)throw Error(`Login ${username} failed (${r.status}): ${await r.text()}\n${logs.slice(-2000)}`);assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/SameSite=Strict/);return r.headers.get('set-cookie').split(';')[0]}
let checks=0;const status=async(p,t,b,s)=>{assert.equal((await request(p,t,b)).status,s,p);checks++};
try{
 let ready=false;for(let i=0;i<90;i++){try{if((await fetch(base+'/api/auth')).status===401){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Server failed to start: '+logs.slice(-2000));
 await status('/api/workspace','',undefined,401);await status('/api/users','',undefined,401);await status('/api/me','',undefined,401);await status('/api/form-files?id=one','',undefined,401);await status('/api/import','',{},401);
 const s=await login('super'),a=await login('admin'),u=await login('user');

 // Borrowing authorization, ownership, CSRF, attachments and inventory visibility.
 await status('/api/borrowing','',undefined,401);
 await status('/api/borrowing',u,{action:'create'},403);
 assert.equal((await request('/api/borrowing',a,{action:'create'},'https://wrong.example')).status,403);checks++;
 for(const asset of ['borrow-one','borrow-two'])db.prepare('INSERT INTO assets(id,tag,name,kind) VALUES(?,?,?,?)').run(asset,asset,asset,'Hardware');
 const makeLoan=async(employee,asset)=>{const r=await request('/api/borrowing',a,{action:'create',employee_id:employee,purpose:'HTTP test',starts_at:new Date(Date.now()-60000).toISOString(),due_at:new Date(Date.now()+86400000).toISOString(),items:[{asset_id:asset,condition_out:'Good',accessories:'Charger'}]});assert.equal(r.status,200);checks++;return (await r.json()).id};
 const loanOne=await makeLoan('one','borrow-one'),loanTwo=await makeLoan('two','borrow-two');
 const mine=await (await request('/api/borrowing?employeeId=two',u)).json();assert.equal(mine.rows.length,1);assert.equal(mine.rows[0].id,loanOne);assert.equal(mine.canEdit,false);checks++;
 await status('/api/borrowing?print='+loanOne,u,undefined,200);await status('/api/borrowing?print='+loanTwo,u,undefined,404);
 const workspaceLoans=await (await request('/api/workspace',a)).json();assert.equal(workspaceLoans.assets.find(x=>x.id==='borrow-one').borrow_status,'Reserved');checks++;
 const loanSigned=new FormData();loanSigned.set('id',loanTwo);loanSigned.set('kind','Borrowing');loanSigned.set('file',new Blob(['%PDF-1.7 test'],{type:'application/pdf'}),'signed.pdf');
 const signedResult=await fetch(base+'/api/borrowing',{method:'POST',headers:{Cookie:a,Origin:process.env.APP_ORIGIN},body:loanSigned});assert.equal(signedResult.status,200);const signedId=(await signedResult.json()).id;checks++;
 await status('/api/borrowing?file='+signedId,u,undefined,404);await status('/api/borrowing?file='+signedId,a,undefined,200);
 await status('/api/borrowing',a,{action:'cancel',id:loanOne,version:1,note:'Test complete'},200);await status('/api/borrowing',s,{action:'cancel',id:loanTwo,version:1,note:'Test complete'},200);
 // Purchasing, invoices and laptop arrangements are restricted to IT administrators.
 await status('/api/purchasing','',undefined,401);
 await status('/api/purchasing',u,undefined,403);
 await status('/api/invoices?id=missing',u,undefined,403);
 await status('/api/purchasing',u,{action:'supplier',name:'Denied'},403);
 assert.equal((await request('/api/purchasing',a,{action:'supplier',name:'Blocked'},'https://wrong.example')).status,403);checks++;
 await status('/api/purchasing',a,{action:'supplier',name:'Excluded',category:'Fire & Safety Services'},400);
 await status('/api/purchasing',a,{action:'supplier',name:'Excluded',category:'Document Management'},400);
 const supplierResult=await request('/api/purchasing',a,{action:'supplier',name:'HTTP supplier',category:'Laptop'});assert.equal(supplierResult.status,200);const supplierId=(await supplierResult.json()).id;checks++;
 const purchaseResult=await request('/api/purchasing',a,{action:'procurement',supplier_id:supplierId,reference:'HTTP-INV',purchase_date:'2026-09-23',amount:'50000.00',currency:'PHP',description:'Laptop purchase',asset_ids:[]});assert.equal(purchaseResult.status,200);const purchaseId=(await purchaseResult.json()).id;checks++;
 const upload=async(token,bytes,mime,origin=process.env.APP_ORIGIN)=>{const form=new FormData();form.set('procurement_id',purchaseId);form.set('file',new Blob([bytes],{type:mime}),'invoice.pdf');return fetch(base+'/api/invoices',{method:'POST',headers:{Cookie:token,Origin:origin},body:form});};
 const pdf='%PDF-1.4\nHTTP test invoice';
 assert.equal((await upload(u,pdf,'application/pdf')).status,403);checks++;
 assert.equal((await upload(a,pdf,'application/pdf','https://wrong.example')).status,403);checks++;
 assert.equal((await upload(a,'invalid','application/pdf')).status,400);checks++;
 assert.equal((await upload(a,'<html>bad</html>','text/html')).status,400);checks++;
 assert.equal((await upload(a,new Uint8Array(10*1024*1024+1),'application/pdf')).status,400);checks++;
 const attached=await upload(a,pdf,'application/pdf');assert.equal(attached.status,200);const invoiceId=(await attached.json()).id;checks++;
 const downloaded=await request('/api/invoices?id='+invoiceId,a);assert.equal(downloaded.status,200);assert.match(downloaded.headers.get('content-disposition'),/^attachment/);assert.equal(await downloaded.text(),pdf);checks++;
 await status('/api/invoices?id='+invoiceId,u,undefined,403);
 await status('/api/invoices?id='+invoiceId,'',undefined,401);
 await status('/api/purchasing?entity=procurement&history='+purchaseId,a,undefined,200);
 const arrangement={action:'laptopArrangement',employee_id:'two',version:0,personal_use:'Yes',loan_status:'Active',loan_reference:'HTTP-LOAN',loan_date:'2026-09-01'};
 await status('/api/purchasing',a,arrangement,200);
 await status('/api/purchasing',a,arrangement,409);
 const purchasing=await (await request('/api/purchasing',a)).json();assert.equal(purchasing.arrangements.find(r=>r.employee_id==='two').personal_use,'Yes');assert.equal(purchasing.procurements[0].amount_cents,5000000);assert(!('content' in purchasing.invoices[0]));checks++;
 await status('/api/records',a,{action:'deleteEmployee',id:'two'},409);
 await status('/api/purchasing',s,{action:'voidProcurement',id:purchaseId,version:1,reason:'Test complete'},200);
 assert.equal((await upload(a,pdf,'application/pdf')).status,409);checks++;
 await status('/api/invoices?id='+invoiceId,a,undefined,200);
 await status('/api/workspace',a,undefined,200);await status('/api/users',a,undefined,200);await status('/api/import',a,{},403);await status('/api/workspace',u,undefined,403);await status('/api/users',u,undefined,403);
 const adminList=await (await request('/api/users',a)).json();assert(adminList.users.every(x=>x.role==='user'));checks++;
 for(const action of ['edit','delete','setEmail','setEmployee','resetPassword','update'])await status('/api/users',a,{action,id:'super',name:'No',username:'hijack',email:'',employee_id:null,role:'user',active:false},403);
 await status('/api/users',a,{action:'create',name:'No',username:'noadmin',email:'',role:'admin'},403);
 await status('/api/users',a,{action:'update',id:'user',role:'super_admin',active:true},403);
 const accountResponse=await request('/api/users',a,{action:'create',name:'TEST login',username:'testlogin',email:'',role:'user'});assert.equal(accountResponse.status,200);const account=await accountResponse.json();checks++;
 await status('/api/users',a,{action:'edit',id:account.id,name:'TEST edited',username:'testedited',email:'test@example.test'},200);
 await status('/api/users',a,{action:'resetPassword',id:account.id},200);
 await status('/api/users',a,{action:'delete',id:account.id},200);
 await status('/api/users',a,{action:'delete',id:account.id},404);
 const me=await (await request('/api/me?employee_id=two',u)).json();assert.equal(me.employee.id,'one');assert(me.forms.every(f=>f.id==='one'));checks++;
 await status('/api/form-files?id=one',u,undefined,200);await status('/api/form-files?id=two',u,undefined,404);await status('/api/form-files?id=two',a,undefined,200);
 assert.equal((await request('/api/users',s,{action:'setEmail',id:'user',email:'user@example.test'},'https://wrong.example')).status,403);checks++;
 await status('/api/users',s,{action:'setEmail',id:'user',email:'user@example.test'},200);
 const created=await request('/api/users',s,{action:'create',name:'New User',username:'newuser',role:'user',email:''});assert.equal(created.status,200);const fresh=await created.json();assert(fresh.temporaryPassword.length>=24);checks++;
 const tempLogin=await request('/api/auth','',{action:'login',username:'newuser',password:fresh.temporaryPassword});assert.equal(tempLogin.status,200);const temp=tempLogin.headers.get('set-cookie').split(';')[0];await status('/api/me',temp,undefined,403);
 await status('/api/auth',temp,{action:'changePassword',currentPassword:fresh.temporaryPassword,password:'Another-disposable-password-99'},200);await status('/api/auth',temp,undefined,401);
 // CRUD and a complete IT-signed departure run only in this disposable database.
 await status('/api/records',u,{action:'deleteEmployee',id:'two'},403);
 await status('/api/departures',u,undefined,403);
 await status('/api/departures','',undefined,401);
 async function createRecord(body){const r=await request('/api/workspace',a,body);const b=await r.json();assert.equal(r.status,200,JSON.stringify(b));checks++;return b.id}
 const emp=await createRecord({action:'employee',name:'TEST employee',code:'TEST-EMP',email:'testemp@example.test',department:'IT',role:'Tester',startDate:'2026-01-01',employment_type:'Probationary'});
 await status('/api/records',a,{action:'editEmployee',id:emp,name:'TEST edited',code:'TEST-EMP',email:'testemp@example.test',department:'IT',role:'QA',start_date:'2026-02-01'},200);

 // HR employment type is separate from the employee workflow status.
 assert.equal(db.prepare('SELECT employment_type FROM employees WHERE id=?').get(emp).employment_type,'Probationary');checks++;
 const employeeEdit={action:'editEmployee',id:emp,name:'TEST edited',code:'TEST-EMP',email:'testemp@example.test',department:'IT',role:'QA',start_date:'2026-02-01'};
 await status('/api/records',a,{...employeeEdit,employment_type:'Consultant'},200);
 assert.equal(db.prepare('SELECT employment_type FROM employees WHERE id=?').get(emp).employment_type,'Consultant');checks++;
 await status('/api/records',a,employeeEdit,200);
 assert.equal(db.prepare('SELECT employment_type FROM employees WHERE id=?').get(emp).employment_type,'Consultant');checks++;
 assert.equal(db.prepare('SELECT status FROM employees WHERE id=?').get(emp).status,'Onboarding');checks++;
 await status('/api/records',a,{...employeeEdit,employment_type:'Invalid type'},400);
 await status('/api/workspace',a,{action:'employee',name:'Invalid employment type',code:'INVALID-TYPE',email:'invalidtype@example.test',department:'IT',role:'QA',startDate:'2026-01-01',employment_type:'Invalid type'},400);

 await status('/api/records',a,{...employeeEdit,brand:'AnchorEd'},200);
 assert.equal(db.prepare('SELECT brand FROM employees WHERE id=?').get(emp).brand,'AnchorEd');checks++;
 await status('/api/records',a,employeeEdit,200);
 assert.equal(db.prepare('SELECT brand FROM employees WHERE id=?').get(emp).brand,'AnchorEd');checks++;
 await status('/api/records',a,{...employeeEdit,brand:'Invalid brand'},400);
 await status('/api/workspace',a,{action:'employee',name:'Invalid brand',code:'INVALID-BRAND',email:'invalidbrand@example.test',department:'IT',role:'QA',startDate:'2026-01-01',brand:'Invalid brand'},400);
 await status('/api/records?kind=employee&id='+emp,u,undefined,403);
 await status('/api/records',u,{action:'markTestRecord',kind:'employee',id:emp,identifier:'TEST-EMP'},403);
 await status('/api/records',s,{action:'markTestRecord',kind:'employee',id:emp,identifier:'wrong'},400);
 await status('/api/records',s,{action:'markTestRecord',kind:'employee',id:emp,identifier:'TEST-EMP'},200);
 const cleanupPreview=await (await request('/api/records?kind=employee&id='+emp,s)).json();assert.equal(cleanupPreview.canDelete,true);checks++;
 await status('/api/records',s,{action:'deleteTestRecord',kind:'employee',id:emp,identifier:'TEST-EMP'},200);
 const unused=await createRecord({action:'asset',name:'TEST unused',tag:'TEST-UNUSED',kind:'Hardware'});
 await status('/api/workspace',a,{action:'editAsset',assetId:unused,name:'TEST edited asset',tag:'TEST-UNUSED',serial:'TEST-123',kind:'Hardware'},200);
 await status('/api/records',a,{action:'deleteAsset',id:unused},200);
 const flagged=await createRecord({action:'asset',name:'Disposable asset',tag:'TEST-FLAGGED',kind:'Hardware',testRecord:true});
 const flaggedPreview=await (await request('/api/records?kind=asset&id='+flagged,a)).json();assert.equal(flaggedPreview.canDelete,true);checks++;
 await status('/api/records',a,{action:'deleteTestRecord',kind:'asset',id:flagged,identifier:'TEST-FLAGGED'},200);
 const issued=await createRecord({action:'asset',name:'TEST assigned laptop',tag:'TEST-ISSUED',kind:'Hardware'});
 const assignment=await createRecord({action:'assign',employeeId:'one',assetId:issued});
 await status('/api/records',a,{action:'deleteAsset',id:issued},409);
 await status('/api/records',a,{action:'deleteEmployee',id:'one'},409);
 await status('/api/workspace',a,{action:'offboard',employeeId:'one',endDate:'2026-09-20',departureReason:'Resignation'},200);
 const signBody={action:'sign',employeeId:'one',type:'Turnover',note:'<script>unsafe</script> Returned to IT.',password,confirmed:true};
 await status('/api/departures',u,signBody,403);
 await status('/api/departures',a,signBody,409);
 await status('/api/workspace',a,{action:'complete',employeeId:'one'},400);
 await status('/api/workspace',a,{action:'resolve',employeeId:'one',assignmentId:assignment},200);
 await status('/api/departures',a,{...signBody,password:'wrong password'},403);
 const signedResponse=await request('/api/departures',a,{...signBody,signer_name:'FORGED'});assert.equal(signedResponse.status,200);const signed=await signedResponse.json();checks++;
 assert.equal(db.prepare('SELECT signer_name FROM departure_documents WHERE id=?').get(signed.id).signer_name,'admin');checks++;
 const doc=await request('/api/departures?document='+signed.id,u);assert.equal(doc.status,200);const html=await doc.text();assert(html.includes('&lt;script&gt;unsafe&lt;/script&gt;'));assert(!html.includes('<script>unsafe'));checks++;
 await status('/api/departures',a,signBody,409);
 await status('/api/departures',a,{...signBody,type:'Clearance'},409);
 await status('/api/users',a,{action:'update',id:'user',role:'user',active:false},200);
 await status('/api/departures?document='+signed.id,u,undefined,401);
 await status('/api/departures',s,{...signBody,type:'Clearance'},200);
 await status('/api/workspace',a,{action:'complete',employeeId:'one'},200);
 const departed=await (await request('/api/departures',a)).json();assert(departed.employees.some(e=>e.id==='one'&&e.status==='Offboarded'&&e.departure_reason==='Resignation'&&e.documents.length===2));checks++;
 await status('/api/records',a,{action:'deleteEmployee',id:'one'},409);
 await status('/api/records',a,{action:'deleteAsset',id:issued},409);
 await status('/api/users',a,{action:'update',id:'user',role:'user',active:true},409);
 await status('/api/users',s,{action:'setEmployee',id:'user',employee_id:'two'},200);await status('/api/me',u,undefined,401);
 await status('/api/users',a,{action:'update',id:'user',role:'user',active:true},200);
 const u2=await login('user');assert.equal((await (await request('/api/me',u2)).json()).employee.id,'two');checks++;
 await status('/api/departures?document='+signed.id,u2,undefined,404);
 await status('/api/departures?employeeId=one',u2,undefined,403);

 // Regression coverage for signed acknowledgement uploads and lifecycle history.
 const uploadEmployee=await createRecord({action:'employee',name:'Upload QA',code:'UPLOAD-QA',email:'upload@example.test',department:'IT',role:'QA',startDate:'2026-01-01'});
 async function uploadAcknowledgement(token,bytes='%PDF-1.4\n%%EOF',date='2026-01-02'){
  const form=new FormData();form.set('employeeId',uploadEmployee);form.set('signed_date',date);form.set('file',new Blob([bytes],{type:'application/pdf'}),'acknowledgement.pdf');
  return fetch(base+'/api/acknowledgement-uploads',{method:'POST',headers:{Cookie:token,Origin:process.env.APP_ORIGIN},body:form});
 }
 assert.equal((await uploadAcknowledgement(u2)).status,403);checks++;
 assert.equal((await uploadAcknowledgement(a,'not a PDF')).status,400);checks++;
 assert.equal((await uploadAcknowledgement(a,undefined,'2026-02-30')).status,400);checks++;
 const uploaded=await uploadAcknowledgement(a);assert.equal(uploaded.status,200);const uploadId=(await uploaded.json()).id;checks++;
 const uploadList=await (await request('/api/acknowledgement-uploads?employeeId='+uploadEmployee,a)).json();assert.equal(uploadList.rows.length,1);checks++;
 const download=await request('/api/acknowledgement-uploads?id='+uploadId,a);assert.equal(await download.text(),'%PDF-1.4\n%%EOF');assert.equal(download.headers.get('x-content-type-options'),'nosniff');checks++;
 await status('/api/acknowledgement-uploads?id='+uploadId,u2,undefined,403);
 await status('/api/records',a,{action:'deleteEmployee',id:uploadEmployee},409);
 const onboardingAsset=await createRecord({action:'asset',name:'Lifecycle QA laptop',tag:'LIFECYCLE-QA',kind:'Hardware'});
 await createRecord({action:'assign',employeeId:uploadEmployee,assetId:onboardingAsset});
 await status('/api/workspace',a,{action:'activate',employeeId:uploadEmployee},200);
 const history=await (await request('/api/workspace',a)).json();
 assert(history.events.some(e=>e.employee_id===uploadEmployee&&e.message.endsWith(' completed onboarding')));checks++;
 assert(history.events.some(e=>e.employee_id==='one'&&e.message.endsWith(' completed offboarding')));checks++;
 await status('/api/users',s,{action:'delete',id:'super'},400);
 await status('/api/users',s,{action:'update',id:'admin',role:'admin',active:false},200);await status('/api/workspace',a,undefined,401);
 await status('/api/users',s,{action:'update',id:'super',role:'user',active:false},400);
 await status('/api/auth',s,{action:'logout'},200);await status('/api/users',s,undefined,401);
 console.log(`PASS: ${checks} HTTP authorization, ownership, account administration and session checks.`);
}finally{server.kill();server.stdout.destroy();server.stderr.destroy();db.close()}


