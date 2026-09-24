import {readFileSync} from 'node:fs';
import {connection} from '../server/database.mjs';
const path=process.argv[2];if(!path)throw Error('Usage: pnpm import:snapshot path/to/snapshot.json');
const tables=JSON.parse(readFileSync(path,'utf8')).tables;
const order=['employees','assets','assignments','events','maintenance','asset_events','kit_templates','employee_kits','account_requests','kit_tasks','employee_forms','form_applications','form_asset_links','form_files'];
if(!tables||order.some(t=>!Array.isArray(tables[t])))throw Error('Snapshot is missing required tables.');
for(const t of order)if(Number(connection.prepare(`SELECT COUNT(*) n FROM "${t}"`).get().n))throw Error('Import requires empty business tables: '+t);
connection.exec('BEGIN IMMEDIATE');try{
 for(const t of order){const allowed=new Set(connection.prepare(`PRAGMA table_info("${t}")`).all().map(c=>c.name));for(const row of tables[t]){const columns=Object.keys(row);if(columns.some(c=>!allowed.has(c)))throw Error('Unknown column in '+t);connection.prepare(`INSERT INTO "${t}" (${columns.map(c=>'"'+c+'"').join(',')}) VALUES (${columns.map(()=>'?').join(',')})`).run(...columns.map(c=>row[c]));}}
 const violations=connection.prepare('PRAGMA foreign_key_check').all();if(violations.length)throw Error('Foreign key validation failed');connection.exec('COMMIT');
}catch(e){connection.exec('ROLLBACK');throw e}
console.log('Imported',Object.fromEntries(order.map(t=>[t,tables[t].length])));
