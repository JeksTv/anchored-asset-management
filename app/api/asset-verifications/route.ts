import {protect} from '@/server/guards';
import {requireRole,HttpError} from '@/server/auth.mjs';
import {connection as db} from '@/server/database.mjs';
import {expectedAsset,saveVerification} from '@/server/asset-verification.mjs';
export const GET=protect(async(request:Request)=>{
 const id=new URL(request.url).searchParams.get('assetId')||'';
 return Response.json({expected:expectedAsset(id),rows:db.prepare('SELECT * FROM asset_verifications WHERE asset_id=? ORDER BY checked_at DESC').all(id)});
});
export const POST=protect(async(request:Request)=>{
 const raw=await request.text();if(raw.length>16000)throw new HttpError(413,'Request too large.');
 let body;try{body=JSON.parse(raw)}catch{throw new HttpError(400,'Invalid request.')}
 if(!body||Array.isArray(body)||typeof body!=='object')throw new HttpError(400,'Invalid request.');
 return Response.json(saveVerification(body,requireRole(request,['admin','super_admin'])));
});
