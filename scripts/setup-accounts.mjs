import {randomUUID,randomBytes} from 'node:crypto';
import {writeFileSync,existsSync,unlinkSync} from 'node:fs';
import {connection} from '../server/database.mjs';
import {passwordHash,audit} from '../server/auth.mjs';
if(existsSync('LOCAL-CREDENTIALS.txt'))throw Error('Credential file already exists. Move it to secure storage first.');
if(Number(connection.prepare('SELECT COUNT(*) n FROM app_users').get().n))throw Error('Accounts already exist. Use Manage access.');
const rows=[];
for(const [username,role,name] of [['superadmin','super_admin','Super Admin'],['admin','admin','IT Admin'],['user','user','Employee User']]){const password=randomBytes(24).toString('base64url');rows.push({username,role,name,password,hash:await passwordHash(password),id:randomUUID()})}
const text='AnchorEd initial local accounts\n\n'+rows.map(r=>`${r.role}: ${r.username}\nTemporary password: ${r.password}`).join('\n\n')+'\n\nAll accounts require a password change at first sign-in. User is intentionally unlinked. Super Admin must select the correct employee before User can see records. Generate fresh credentials on the company server; do not share this file or commit it.\n';
writeFileSync('LOCAL-CREDENTIALS.txt',text,{flag:'wx',mode:0o600});
connection.exec('BEGIN IMMEDIATE');try{for(const r of rows){connection.prepare('INSERT INTO app_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,?,?,?)').run(r.id,r.username,r.name,r.role,r.hash,new Date().toISOString());audit(r.id,'initial_account_created',r.id)}connection.exec('COMMIT')}catch(e){connection.exec('ROLLBACK');unlinkSync('LOCAL-CREDENTIALS.txt');throw e}
console.log('Created three accounts. Temporary passwords saved in LOCAL-CREDENTIALS.txt.');
