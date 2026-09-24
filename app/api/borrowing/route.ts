import { connection as db } from '@/server/database.mjs';
import {
  currentUser,
  checkOrigin,
  requireRole,
  failure,
  HttpError,
} from '@/server/auth.mjs';
import {
  borrowingRows,
  saveBorrowing,
  attachBorrowingFile,
  borrowingForm,
} from '@/server/borrowing.mjs';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: Request) {
  try {
    const actor = currentUser(request),
      q = new URL(request.url).searchParams;
    const own = actor.role === 'user';
    if (own && !actor.employee_id)
      throw new HttpError(403, 'Your login is not linked to an employee.');
    if (q.has('file')) {
      const f = db
        .prepare(
          'SELECT f.*,b.employee_id FROM borrowing_files f JOIN borrowings b ON b.id=f.borrowing_id WHERE f.id=?',
        )
        .get(q.get('file'));
      if (!f || (own && f.employee_id !== actor.employee_id))
        throw new HttpError(404, 'File not found.');
      return new Response(f.content, {
        headers: {
          ...headers,
          'Content-Type': f.mime,
          'Content-Disposition': `attachment; filename="signed-form"; filename*=UTF-8''${encodeURIComponent(f.name)}`,
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; sandbox",
        },
      });
    }
    const rows = borrowingRows(
      own ? actor.employee_id : q.get('employeeId') || '',
      q.get('assetId') || '',
    );
    if (q.has('print')) {
      const row = rows.find((b: any) => b.id === q.get('print'));
      if (!row) throw new HttpError(404, 'Borrowing not found.');
      return new Response(borrowingForm(row), {
        headers: {
          ...headers,
          'Content-Type': 'text/html; charset=utf-8',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    return Response.json({ rows, canEdit: !own }, { headers });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const actor = requireRole(request, ['super_admin', 'admin']);
    const limit = 6 * 1024 * 1024,
      reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, 'Request body required.');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError(413, 'Request too large. Use files up to 5 MB.');
      }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    if (
      request.headers.get('content-type')?.startsWith('multipart/form-data')
    ) {
      const form = await new Response(bytes, {
        headers: { 'Content-Type': request.headers.get('content-type')! },
      }).formData();
      const f = form.get('file');
      if (!(f instanceof File))
        throw new HttpError(400, 'Select a signed form.');
      return Response.json(
        attachBorrowingFile(
          String(form.get('id') || ''),
          String(form.get('kind') || ''),
          f,
          Buffer.from(await f.arrayBuffer()),
          actor,
        ),
        { headers },
      );
    }
    if (size > 100000) throw new HttpError(413, 'Request too large.');
    return Response.json(saveBorrowing(JSON.parse(bytes.toString()), actor), {
      headers,
    });
  } catch (e) {
    return failure(e);
  }
}
