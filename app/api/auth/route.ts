import {connection} from '@/server/database.mjs';
import {audit,checkOrigin,cookie,currentUser,failure,HttpError,logout,passwordHash,passwordRules,publicUser,startSession,throttle,verifyPassword} from '@/server/auth.mjs';
export async function GET(request:Request){try{return Response.json({user:publicUser(currentUser(request,true))},{headers:{'Cache-Control':'no-store'}})}catch(e){return failure(e)}}
export async function POST(request:Request){try{
checkOrigin(request);const b:any=await request.json();
if(b.action==='logout'){logout(request);return Response.json({ok:true},{headers:{'Set-Cookie':cookie('',0),'Cache-Control':'no-store'}})}
if(b.action==='login'){
 const username=String(b.username||'').trim().toLowerCase();if(username.length>64||typeof b.password!=='string'||b.password.length>128)throw new HttpError(400,'Invalid credentials.');throttle(username);
 const user=connection.prepare('SELECT * FROM app_users WHERE username=? COLLATE NOCASE').get(username);
 const dummy='scrypt$0123456789abcdef0123456789abcdef$'+'0'.repeat(128);
 const valid=await verifyPassword(b.password,user?.password_hash||dummy);
 if(!user||!user.active||!valid){audit(null,'login_failed',null);throw new HttpError(401,'Username or password is incorrect.');}
 const token=startSession(user.id);audit(user.id,'login',user.id);return Response.json({user:publicUser(user)},{headers:{'Set-Cookie':cookie(token),'Cache-Control':'no-store'}});
}
if(b.action==='changePassword'){
 const user=currentUser(request,true);throttle('password:'+user.id);passwordRules(b.password);
 if(typeof b.currentPassword!=='string'||b.currentPassword.length>128||!await verifyPassword(b.currentPassword,user.password_hash))throw new HttpError(400,'Current password is incorrect.');
 if(b.password===b.currentPassword)throw new HttpError(400,'Choose a different password.');
 const encoded=await passwordHash(b.password);connection.exec('BEGIN IMMEDIATE');try{connection.prepare('UPDATE app_users SET password_hash=?,must_change_password=0 WHERE id=? AND active=1').run(encoded,user.id);connection.prepare('DELETE FROM app_sessions WHERE user_id=?').run(user.id);audit(user.id,'password_changed',user.id);connection.exec('COMMIT')}catch(e){connection.exec('ROLLBACK');throw e}
 return Response.json({ok:true},{headers:{'Set-Cookie':cookie('',0),'Cache-Control':'no-store'}});
}
throw new HttpError(400,'Unknown action.');
}catch(e){return failure(e)}}
