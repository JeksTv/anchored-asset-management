import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {connection,dataDir} from '@/server/database.mjs';
import {checkOrigin,currentUser,requireRole,failure,HttpError} from '@/server/auth.mjs';
export async function POST(request:Request){try{
 checkOrigin(request);requireRole(request,['super_admin','admin']);
 if(Number(request.headers.get('content-length')||0)>5*1024*1024)throw new HttpError(400,'Photo must be smaller than 4 MB.');
 const form=await request.formData(),file=form.get('file');
 if(!(file instanceof File)||file.size>4*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw new HttpError(400,'Use JPG, PNG or WebP up to 4 MB.');
 const bytes=Buffer.from(await file.arrayBuffer());
 const valid=file.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
 if(!valid)throw new HttpError(400,'File contents do not match the image type.');
 const id=crypto.randomUUID();await mkdir(join(dataDir,'uploads'),{recursive:true});await writeFile(join(dataDir,'uploads',id),bytes,{flag:'wx'});
 connection.prepare('INSERT INTO form_files(id,name,mime,size,created_at) VALUES(?,?,?,?,?)').run(id,file.name.slice(0,150),file.type,file.size,new Date().toISOString());
 return Response.json({id,name:file.name},{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e)}}
export async function GET(request:Request){try{
 const user=currentUser(request),id=new URL(request.url).searchParams.get('id')||'';
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw new HttpError(404,'Not found.');
 const file=connection.prepare('SELECT f.*,e.employee_id FROM form_files f LEFT JOIN employee_forms e ON e.id=f.form_id WHERE f.id=?').get(id);
 if(!file||(user.role==='user'&&(!user.employee_id||file.employee_id!==user.employee_id)))throw new HttpError(404,'Not found.');
 let bytes;try{bytes=await readFile(join(dataDir,'uploads',id))}catch{throw new HttpError(404,'File is unavailable.');}
 return new Response(bytes,{headers:{'Content-Type':file.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Content-Disposition':'inline'}});
}catch(e){return failure(e)}}
