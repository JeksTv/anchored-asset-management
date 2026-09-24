import { connection as db } from '@/server/database.mjs';
import {
  checkOrigin,
  requireRole,
  failure,
  HttpError,
} from '@/server/auth.mjs';
import { purchasingData, savePurchasing } from '@/server/purchasing.mjs';
const headers = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  try {
    requireRole(request, ['super_admin', 'admin']);
    const q = new URL(request.url).searchParams;
    if (q.has('history')) {
      const entity = q.get('entity');
      if (!['supplier', 'procurement', 'laptop'].includes(entity || ''))
        throw new HttpError(400, 'Invalid history type.');
      return Response.json(
        {
          history: db
            .prepare(
              'SELECT * FROM purchasing_history WHERE entity=? AND entity_id=? ORDER BY created_at DESC',
            )
            .all(entity, q.get('history')),
        },
        { headers },
      );
    }
    return Response.json(purchasingData(), { headers });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const actor = requireRole(request, ['super_admin', 'admin']);
    const body = await request.text();
    if (body.length > 100000) throw new HttpError(413, 'Request too large.');
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      throw new HttpError(400, 'Invalid request.');
    }
    if (!data || Array.isArray(data) || typeof data !== 'object')
      throw new HttpError(400, 'Invalid request.');
    return Response.json(savePurchasing(data, actor), { headers });
  } catch (e) {
    return failure(e);
  }
}
