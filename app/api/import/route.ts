import {protect} from '@/server/guards';
import {database} from '@/db';
const json=(v:unknown,s=200)=>Response.json(v,{status:s,headers:{'Cache-Control':'no-store'}});
const str=(v:any,max=500)=>{if(typeof v!=='string'||v.length>max)throw Error('Invalid import field.');return v.trim()};
async function key(s:string){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return 'migration-'+Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('');}
async function originalPOST(request:Request){
if(request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Cross-site request denied'},403);
try{
const body:any=await request.json();if(!['employees','laptops'].includes(body.kind)||!Array.isArray(body.rows)||body.rows.length<1||body.rows.length>20)throw Error('Import 1–20 records per batch.');
const db=database(),now=new Date().toISOString(),results:any[]=[],queries:any[]=[];
for(const row of body.rows){
if(body.kind==='employees'){
const code=str(row.employee_id,100),email=str(row.email,200).toLowerCase(),name=str(row.name,200);if(!code||!name||!/^\S+@\S+\.\S+$/.test(email))throw Error('Employee ID, name and valid email required.');
const byCode:any=await db.prepare('SELECT * FROM employees WHERE lower(code)=lower(?)').bind(code).first();const byEmail:any=await db.prepare('SELECT * FROM employees WHERE lower(email)=?').bind(email).first();
if(byCode&&byCode.email.toLowerCase()!==email)throw Error(`Employee ID conflict: ${code}`);
if(byCode&&byEmail&&byCode.id!==byEmail.id)throw Error(`Employee identity conflict: ${code}`);
const existing=byEmail||byCode,id=existing?.id||await key('employee:'+code);results.push({code,id,action:existing?'matched':'created'});
if(!existing)queries.push(db.prepare(`INSERT INTO employees(id,code,name,email,department,role,start_date,status) VALUES(?,?,?,?,?,?,'','Active')`).bind(id,code,name,email,str(row.department,200),str(row.position,200)));
const eventId=await key('hr-2026-08-20:'+code);queries.push(db.prepare('INSERT OR IGNORE INTO events(id,employee_id,message,created_at) VALUES(?,?,?,?)').bind(eventId,id,`Imported HR snapshot: active as of 2026-08-20; HR ID ${code}; company ${str(row.company)}; employment type ${str(row.employment_type)}; supervisor ${str(row.supervisor)}; work setup ${str(row.work_setup)}. ${existing?'Existing profile and hire date preserved.':'Hire date not supplied.'}`,now));
}else{
const tag=str(row.tag,100),email=str(row.email,200).toLowerCase(),serial=str(row.serial,200),name=str(row.name,200),assignedAt=str(row.assigned_at,30);if(!tag||!name||!/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/.test(assignedAt)||!Number.isFinite(Date.parse(assignedAt)))throw Error('Invalid laptop or issuance date.');
const employee:any=await db.prepare('SELECT * FROM employees WHERE lower(email)=?').bind(email).first();if(!employee||!['Active','Onboarding'].includes(employee.status))throw Error(`Employee missing or departing for ${tag}`);
const asset:any=await db.prepare('SELECT * FROM assets WHERE lower(tag)=lower(?)').bind(tag).first();if(asset&&(asset.kind!=='Hardware'||asset.serial.toLowerCase()!==serial.toLowerCase()||asset.state!=='Ready'))throw Error(`Asset conflict: ${tag}`);
if(!asset&&serial&&!['na','n/a','-'].includes(serial.toLowerCase())){const duplicate=await db.prepare('SELECT id FROM assets WHERE lower(serial)=lower(?)').bind(serial).first();if(duplicate)throw Error(`Serial already exists under another tag: ${tag}`);}
const assetId=asset?.id||await key('asset:'+tag);const assigned:any=asset?await db.prepare('SELECT * FROM assignments WHERE asset_id=? AND resolved_at IS NULL').bind(assetId).first():null;
if(assigned&&assigned.employee_id!==employee.id)throw Error(`Laptop already assigned to someone else: ${tag}`);
const assignmentId=await key('assignment-2026-08-20:'+tag);
const old=await db.prepare('SELECT id FROM assignments WHERE id=?').bind(assignmentId).first();if(old&&!assigned)throw Error(`Previously imported assignment has changed: ${tag}`);
if(typeof row.details!=='object'||!row.details||JSON.stringify(row.details).length>20000)throw Error('Invalid hardware details.');
if(!asset)queries.push(db.prepare(`INSERT INTO assets(id,tag,name,kind,serial,seats,state,details) VALUES(?,?,?,'Hardware',?,1,'Ready',?)`).bind(assetId,tag,name,serial,JSON.stringify(row.details)));
if(!assigned)queries.push(db.prepare('INSERT INTO assignments(id,employee_id,asset_id,identifier,assigned_at) VALUES(?,?,?,?,?)').bind(assignmentId,employee.id,assetId,'Migrated from reviewed LAPTOPS tracker; existing custody, not a new handover.',assignedAt));
queries.push(db.prepare('INSERT OR IGNORE INTO asset_events(id,asset_id,message,snapshot,created_at) VALUES(?,?,?,?,?)').bind(await key('asset-import:'+tag),assetId,'Imported from reviewed LAPTOPS tracker. Historical form checkbox is not a new signed acknowledgement.',JSON.stringify(row.source),now));
queries.push(db.prepare('INSERT OR IGNORE INTO events(id,employee_id,message,created_at) VALUES(?,?,?,?)').bind(await key('assignment-event:'+tag),employee.id,`${tag} imported with confirmed employee match; historical issue date ${assignedAt.slice(0,10)}.`,now));
results.push({tag,id:assetId,employee_id:employee.id,action:assigned?'matched':'assigned'});
}
}
if(body.apply===true&&queries.length)await db.batch(queries);
return json({applied:body.apply===true,results});
}catch(e){return json({error:e instanceof Error?e.message:'Import failed'},400)}
}
export const POST=protect(originalPOST,['super_admin']);
