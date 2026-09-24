import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {connection} from '../server/database.mjs';
connection.exec('CREATE TABLE IF NOT EXISTS app_migrations(name TEXT PRIMARY KEY, checksum TEXT NOT NULL)');
for(const name of readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort()){
 const sql=readFileSync('drizzle/'+name,'utf8'),checksum=createHash('sha256').update(sql).digest('hex');const existing=connection.prepare('SELECT checksum FROM app_migrations WHERE name=?').get(name);
 if(existing){if(existing.checksum!==checksum)throw Error('Applied migration changed: '+name);continue;}
 connection.exec('BEGIN IMMEDIATE');try{connection.exec(sql);connection.prepare('INSERT INTO app_migrations VALUES(?,?)').run(name,checksum);connection.exec('COMMIT');console.log('Applied',name)}catch(e){connection.exec('ROLLBACK');throw e;}
}
connection.exec(readFileSync('server/auth-schema.sql','utf8'));
console.log('Database ready.');
