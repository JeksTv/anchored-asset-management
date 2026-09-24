import { connection as db } from '@/server/database.mjs';
import {
  checkOrigin,
  requireRole,
  failure,
  HttpError,
} from '@/server/auth.mjs';
import { recordInvoice } from '@/server/purchasing.mjs';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const actor = requireRole(request, ['super_admin', 'admin']);
    const limit = 11 * 1024 * 1024;
    if (Number(request.headers.get('content-length') || 0) > limit)
      throw new HttpError(413, 'Invoice must be at most 10 MB.');
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, 'Select an invoice.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError(413, 'Invoice must be at most 10 MB.');
      }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { 'Content-Type': request.headers.get('content-type') || '' },
    }).formData();
    const file = form.get('file'),
      id = form.get('procurement_id');
    if (!(file instanceof File) || typeof id !== 'string')
      throw new HttpError(400, 'Select a file and procurement record.');
    return Response.json(
      recordInvoice(id, file, Buffer.from(await file.arrayBuffer()), actor),
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function GET(request: Request) {
  try {
    requireRole(request, ['super_admin', 'admin']);
    const id = new URL(request.url).searchParams.get('id');
    const row = db
      .prepare('SELECT * FROM procurement_invoices WHERE id=?')
      .get(id || '');
    if (!row) throw new HttpError(404, 'Invoice not found.');
    return new Response(row.content, {
      headers: {
        'Content-Type': row.mime,
        'Content-Disposition': `attachment; filename="invoice"; filename*=UTF-8''${encodeURIComponent(row.name)}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
