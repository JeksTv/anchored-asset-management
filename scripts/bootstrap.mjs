import {randomUUID,randomBytes} from 'node:crypto';
import {connection} from '../server/database.mjs';
import {passwordHash,audit} from '../server/auth.mjs';
const username=process.argv[2]?.trim().toLowerCase();
if(!username||! /^[a-z0-9._-]{3,64}$/.test(username))throw Error('Usage: pnpm bootstrap superadmin (3–64 letters/numbers/._-)');
if(connection.prepare("SELECT id FROM app_users WHERE role='super_admin'").get())throw Error('A Super Admin already exists. Use account management.');
const password=randomBytes(24).toString('base64url'),password_hash=await passwordHash(password),id=randomUUID();
connection.prepare("INSERT INTO app_users(id,username,name,role,password_hash,created_at) VALUES(?,?,?,'super_admin',?,?)").run(id,username,'Super Admin',password_hash,new Date().toISOString());audit(id,'bootstrap',id);
console.log('Super Admin:',username,'\nTemporary password (shown once):',password,'\nChange it at first sign-in. Store it securely; do not commit it.');
