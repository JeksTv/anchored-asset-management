import {editMovement} from '@/server/movement-edit.mjs';
import {requireRole,HttpError} from '@/server/auth.mjs';
import {connection as db} from '@/server/database.mjs';
import {protect} from '@/server/guards';
export const GET=protect(async(request:Request)=>{
 const q=new URL(request.url).searchParams;
 const rows=db.prepare(`SELECT m.*,a.tag AS matched_tag,e.name AS matched_employee FROM asset_movements m LEFT JOIN assets a ON a.id=m.asset_id LEFT JOIN employees e ON e.id=m.employee_id WHERE (?='' OR m.asset_id=?) AND (?='' OR m.employee_id=?) ORDER BY m.occurred_on DESC,m.source_sheet,m.source_row`).all(q.get('assetId')||'',q.get('assetId')||'',q.get('employeeId')||'',q.get('employeeId')||'');
 return Response.json({rows},{headers:{'Cache-Control':'no-store'}});
});

export const POST=protect(async(request:Request)=>{
 const raw=await request.text();if(raw.length>12000)throw new HttpError(413,'Request too large.');
 let b;try{b=JSON.parse(raw)}catch{throw new HttpError(400,'Invalid request.')}
 return Response.json(editMovement(b,requireRole(request,['admin','super_admin'])));
});
