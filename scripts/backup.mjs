import {backup} from 'node:sqlite';
import {mkdir,cp,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {connection,dataDir} from '../server/database.mjs';
const target=resolve('backups',new Date().toISOString().replace(/[:.]/g,'-'));await mkdir(target,{recursive:true});await backup(connection,join(target,'anchored.sqlite'));try{await cp(join(dataDir,'uploads'),join(target,'uploads'),{recursive:true,errorOnExist:true,force:false})}catch(e){if(e.code!=='ENOENT')throw e}
await writeFile(join(target,'README.txt'),'Database backup and uploads. For a consistent restore point, pause application writes during this operation. Contains personal data and login hashes; store encrypted with restricted access.');console.log('Backup saved:',target);
