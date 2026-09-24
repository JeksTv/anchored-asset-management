import {randomBytes,randomUUID} from 'node:crypto';
import {connection} from '@/server/database.mjs';
import {audit,checkOrigin,failure,HttpError,passwordHash,requireRole} from '@/server/auth.mjs';
function validateLink(id:unknown){if(id&&!connection.prepare("SELECT id FROM employees WHERE id=? AND status IN ('Onboarding','Active')").get(id))throw new HttpError(409,'New or re-enabled access must link to an active or onboarding employee.');}
export async function GET(request:Request){try{const actor=requireRole(request,['super_admin','admin']);const all=actor.role==='super_admin';return Response.json({users:connection.prepare('SELECT id,username,email,name,role,employee_id,active,must_change_password,created_at FROM app_users'+(all?'':" WHERE role='user'")+' ORDER BY name').all(),employees:connection.prepare('SELECT id,code,name,email FROM employees ORDER BY name').all(),audit:all?connection.prepare('SELECT s.*,u.username actor_username FROM security_events s LEFT JOIN app_users u ON u.id=s.actor_id ORDER BY s.created_at DESC LIMIT 100').all():[]},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
export async function POST(request:Request){try{
 checkOrigin(request);const actor=requireRole(request,['super_admin','admin']);const b:any=await request.json();
 if(b.action==='create'){
 const name=String(b.name||'').trim(),username=String(b.username||'').trim().toLowerCase(),email=String(b.email||'').trim().toLowerCase(),role=String(b.role),employeeId=b.employee_id||null;
 if(!name||name.length>200||! /^[a-z0-9._-]{3,64}$/.test(username)||email.length>200||(email&&!/^\S+@\S+\.\S+$/.test(email))||!['super_admin','admin','user'].includes(role))throw new HttpError(400,'Enter name, username (3–64 letters/numbers/._-), valid optional email and role.');
 if(actor.role==='admin'&&role!=='user')throw new HttpError(403,'Admins may create User logins only.');
 validateLink(employeeId);
 const temporaryPassword=randomBytes(24).toString('base64url'),encoded=await passwordHash(temporaryPassword),id=randomUUID();
 connection.exec('BEGIN IMMEDIATE');try{validateLink(employeeId);const fresh=requireRole(request,['super_admin','admin']);if(fresh.role==='admin'&&role!=='user')throw new HttpError(403,'Only Super Admin can create administrators.');connection.prepare('INSERT INTO app_users(id,username,email,name,role,employee_id,password_hash,created_at) VALUES(?,?,?,?,?,?,?,?)').run(id,username,email,name,role,employeeId,encoded,new Date().toISOString());audit(actor.id,'account_created:'+role,id);connection.exec('COMMIT')}catch(e){connection.exec('ROLLBACK');if(String(e).includes('UNIQUE'))throw new HttpError(409,'Username or linked employee already has an account.');throw e}
 return Response.json({id,temporaryPassword},{headers:{'Cache-Control':'no-store'}});
 }
 const target=connection.prepare('SELECT * FROM app_users WHERE id=?').get(String(b.id||''));if(!target)throw new HttpError(404,'Account not found.');
 if(actor.role==='admin'&&target.role!=='user')throw new HttpError(403,'Admins cannot manage administrator logins.');
 if(b.action==='edit'){
 const name=String(b.name||'').trim(),username=String(b.username||'').trim().toLowerCase(),email=String(b.email||'').trim().toLowerCase();
 if(!name||name.length>200||!/^[a-z0-9._-]{3,64}$/.test(username)||email.length>200||(email&&!/^\S+@\S+\.\S+$/.test(email)))throw new HttpError(400,'Enter valid name, username and optional email.');
 connection.exec('BEGIN IMMEDIATE');try{connection.prepare('UPDATE app_users SET name=?,username=?,email=? WHERE id=?').run(name,username,email,target.id);connection.prepare('DELETE FROM app_sessions WHERE user_id=?').run(target.id);audit(actor.id,'account_identity_updated',target.id);connection.exec('COMMIT')}catch(e){connection.exec('ROLLBACK');if(String(e).includes('UNIQUE'))throw new HttpError(409,'Username already exists.');throw e}return Response.json({ok:true});
 }
 if(b.action==='delete'){
 if(target.id===actor.id)throw new HttpError(400,'You cannot delete your own login.');
 connection.exec('BEGIN IMMEDIATE');try{if(target.role==='super_admin'&&target.active&&Number(connection.prepare("SELECT COUNT(*) n FROM app_users WHERE role='super_admin' AND active=1").get().n)<=1)throw new HttpError(409,'Keep an active Super Admin.');connection.prepare('DELETE FROM app_sessions WHERE user_id=?').run(target.id);connection.prepare('DELETE FROM app_users WHERE id=?').run(target.id);audit(actor.id,'account_deleted:'+target.username,target.id);connection.exec('COMMIT')}catch(e){connection.exec('ROLLBACK');throw e}return Response.json({ok:true});
 }
 if(b.action==='setEmail'){const email=String(b.email||'').trim().toLowerCase();if(email.length>200||(email&&!/^\S+@\S+\.\S+$/.test(email)))throw new HttpError(400,'Enter a valid email.');connection.prepare('UPDATE app_users SET email=? WHERE id=?').run(email,target.id);audit(actor.id,'email_updated',target.id);return Response.json({ok:true});}
 if(b.action==='setEmployee'){
 const employeeId=b.employee_id||null;validateLink(employeeId);
 connection.exec('BEGIN IMMEDIATE');try{connection.prepare('UPDATE app_users SET employee_id=? WHERE id=?').run(employeeId,target.id);connection.prepare('DELETE FROM app_sessions WHERE user_id=?').run(target.id);audit(actor.id,'employee_link_updated',target.id);connection.exec('COMMIT')}catch(e){connection.exec('ROLLBACK');if(String(e).includes('UNIQUE'))throw new HttpError(409,'Employee already linked to another login.');throw e}return Response.json({ok:true});
 }
 if(b.action==='resetPassword'){
 const temporaryPassword=randomBytes(24).toString('base64url'),encoded=await passwordHash(temporaryPassword);
 connection.exec('BEGIN IMMEDIATE');try{const fresh=requireRole(request,['super_admin','admin']);const updated=connection.prepare('SELECT role FROM app_users WHERE id=?').get(target.id);if(!updated||(fresh.role==='admin'&&updated.role!=='user'))throw new HttpError(403,'Account role changed. Refresh and try again.');connection.prepare('UPDATE app_users SET password_hash=?,must_change_password=1 WHERE id=?').run(encoded,target.id);connection.prepare('DELETE FROM app_sessions WHERE user_id=?').run(target.id);audit(actor.id,'password_reset',target.id);connection.exec('COMMIT')}catch(e){connection.exec('ROLLBACK');throw e}
 return Response.json({temporaryPassword},{headers:{'Cache-Control':'no-store'}});
 }
 if(b.action==='update'){
 if(b.active===true&&!target.active)validateLink(target.employee_id);
 if(actor.role==='admin'&&b.role!=='user')throw new HttpError(403,'Admins cannot promote users.');
 if(target.id===actor.id)throw new HttpError(400,'Another Super Admin must change your role or access.');
 if(!['super_admin','admin','user'].includes(b.role)||typeof b.active!=='boolean')throw new HttpError(400,'Invalid account settings.');
 connection.exec('BEGIN IMMEDIATE');try{requireRole(request,['super_admin','admin']);if(target.role==='super_admin'&&target.active&&(!b.active||b.role!=='super_admin')&&Number(connection.prepare("SELECT COUNT(*) n FROM app_users WHERE role='super_admin' AND active=1").get().n)<=1)throw new HttpError(400,'Keep at least one active Super Admin.');connection.prepare('UPDATE app_users SET role=?,active=? WHERE id=?').run(b.role,b.active?1:0,target.id);connection.prepare('DELETE FROM app_sessions WHERE user_id=?').run(target.id);audit(actor.id,'account_updated:'+b.role+':'+b.active,target.id);connection.exec('COMMIT')}catch(e){connection.exec('ROLLBACK');throw e}
 return Response.json({ok:true});
 }
 throw new HttpError(400,'Unknown action.');
}catch(e){return failure(e)}}
