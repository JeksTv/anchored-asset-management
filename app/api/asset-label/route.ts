import {protect} from '@/server/guards';
import {expectedAsset} from '@/server/asset-verification.mjs';
// @ts-ignore QRCode provides the server-side SVG encoder.
import QRCode from 'qrcode';
const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const GET=protect(async(request:Request)=>{
 const u=new URL(request.url),id=u.searchParams.get('assetId')||'',a=expectedAsset(id);
 const link=new URL('/',u.origin);link.searchParams.set('inspect',id);
 const svg=await QRCode.toString(link.href,{type:'svg',margin:4,errorCorrectionLevel:'M'});
 return new Response(`<!doctype html><html><head><title>Asset label</title><style>body{font-family:Arial;color:#0b103e;padding:24px}.label{border:1px solid #aaa;width:85mm;padding:5mm;text-align:center}svg{width:38mm;height:38mm}h2,p{margin:5px;overflow-wrap:anywhere}@media print{.instructions,button{display:none}body{padding:0}}</style></head><body><p class="instructions">Print this page using your browser. Phone scanning requires the app to be reachable at ${escape(u.origin)}. IT sign-in is required.</p><div class="label"><strong>AnchorEd · Asset Management</strong>${svg}<h2>${escape(a.tag)}</h2><p>${escape(a.name)}</p><p>Serial: ${escape(a.serial||'Not recorded')}</p></div></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'"}});
});
