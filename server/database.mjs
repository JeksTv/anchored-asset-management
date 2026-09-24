import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
export const dataDir=resolve(process.env.DATA_DIR||'data');
const path=resolve(dataDir,'anchored.sqlite');
mkdirSync(dirname(path),{recursive:true});
globalThis.__anchoredDatabases??=new Map();
if(!globalThis.__anchoredDatabases.has(path)){
 const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 globalThis.__anchoredDatabases.set(path,db);
}
export const connection=globalThis.__anchoredDatabases.get(path);
function statement(sql,values=[]){return {
 bind(...args){return statement(sql,args)},
 async first(column){const r=connection.prepare(sql).get(...values);return r?(column?r[column]:{...r}):null},
 async all(){return {results:connection.prepare(sql).all(...values).map(r=>({...r})),success:true}},
 execute(){const s=connection.prepare(sql);if(s.columns().length)return {results:s.all(...values).map(r=>({...r})),success:true,meta:{changes:0}};const r=s.run(...values);return {results:[],success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}}},
 async run(){return this.execute()}
}}
export const adapter={prepare:sql=>statement(sql),async batch(statements){connection.exec('BEGIN IMMEDIATE');try{const r=statements.map(s=>s.execute());connection.exec('COMMIT');return r}catch(e){connection.exec('ROLLBACK');throw e}}};
