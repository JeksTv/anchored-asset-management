import {protect} from '@/server/guards';
import {currentUser} from '@/server/auth.mjs';
import {generateReport} from '@/server/audit-reports.mjs';
export const GET=protect(async(request:Request)=>Response.json(generateReport(new URL(request.url).searchParams.get('type')||'inventory',currentUser(request)),{headers:{'Cache-Control':'private, no-store'}}));
