import { randomUUID } from 'node:crypto';
import { connection as db } from './database.mjs';
import { HttpError, audit } from './auth.mjs';
const text = (b, k, required = true, max = 2000) => {
  const v = b?.[k] ?? '';
  if (typeof v !== 'string' || v.length > max || (required && !v.trim()))
    throw new HttpError(400, `Enter a valid ${k}.`);
  return v.trim();
};
const stamp = (b, k) => {
  const v = text(b, k, true, 40);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) ||
    !Number.isFinite(Date.parse(v)) ||
    new Date(v).toISOString() !== v
  )
    throw new HttpError(400, 'Enter a valid date and time.');
  return v;
};
export function loanStatus(row, now = new Date()) {
  if (row.status !== 'Borrowed') return row.status;
  if (Date.parse(row.due_at) < now.getTime()) return 'Overdue';
  return new Date(row.due_at).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila',
  }) === now.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' })
    ? 'Due today'
    : 'Borrowed';
}
export function borrowingRows(employeeId = '', assetId = '') {
  const rows = db
    .prepare(
      `SELECT b.*,e.name,e.code FROM borrowings b JOIN employees e ON e.id=b.employee_id WHERE (?='' OR b.employee_id=?) AND (?='' OR EXISTS(SELECT 1 FROM borrowing_items WHERE borrowing_id=b.id AND asset_id=?)) ORDER BY b.created_at DESC`,
    )
    .all(employeeId, employeeId, assetId, assetId);
  return rows.map((b) => ({
    ...b,
    display_status: loanStatus(b),
    items: db
      .prepare('SELECT * FROM borrowing_items WHERE borrowing_id=?')
      .all(b.id)
      .map((i) => ({ ...i, asset: JSON.parse(i.asset_snapshot) })),
    files: db
      .prepare(
        'SELECT id,kind,name,uploaded_by,created_at FROM borrowing_files WHERE borrowing_id=? ORDER BY created_at',
      )
      .all(b.id),
    history: db
      .prepare(
        'SELECT action,actor,created_at FROM borrowing_history WHERE borrowing_id=? ORDER BY created_at',
      )
      .all(b.id),
  }));
}
export function activeBorrowingAssets() {
  return db
    .prepare(
      "SELECT i.asset_id,b.status,b.employee_id FROM borrowing_items i JOIN borrowings b ON b.id=i.borrowing_id WHERE i.returned_at IS NULL AND b.status IN ('Reserved','Borrowed')",
    )
    .all();
}
function history(id, action, actor) {
  const row = borrowingRows().find((b) => b.id === id);
  db.prepare('INSERT INTO borrowing_history VALUES(?,?,?,?,?,?)').run(
    randomUUID(),
    id,
    action,
    actor.name,
    new Date().toISOString(),
    JSON.stringify(row),
  );
  audit(actor.id, 'borrowing:' + action, id);
  db.prepare('INSERT INTO events VALUES(?,?,?,?)').run(
    randomUUID(),
    row.employee_id,
    `Temporary borrowing: ${action} · ${actor.name}`,
    new Date().toISOString(),
  );
}
export function saveBorrowing(b, actor) {
  if (!b || typeof b !== 'object' || Array.isArray(b))
    throw new HttpError(400, 'Invalid borrowing request.');
  db.exec('BEGIN IMMEDIATE');
  try {
    let id;
    if (b.action === 'create') {
      id = randomUUID();
      const employeeId = text(b, 'employee_id'),
        employee = db
          .prepare('SELECT * FROM employees WHERE id=?')
          .get(employeeId);
      if (
        !employee ||
        !['Active', 'Onboarding'].includes(employee.status) ||
        db
          .prepare('SELECT 1 FROM departure_documents WHERE employee_id=?')
          .get(employeeId)
      )
        throw new HttpError(
          409,
          'Choose an active employee without signed clearance.',
        );
      const start = stamp(b, 'starts_at'),
        due = stamp(b, 'due_at');
      if (due <= start || Date.parse(due) <= Date.now())
        throw new HttpError(
          400,
          'Return time must be after the borrowing time and in the future.',
        );
      if (
        !Array.isArray(b.items) ||
        b.items.length < 1 ||
        b.items.length > 30 ||
        new Set(b.items.map((i) => i?.asset_id)).size !== b.items.length
      )
        throw new HttpError(400, 'Choose 1–30 different hardware items.');
      db.prepare(
        'INSERT INTO borrowings(id,employee_id,purpose,starts_at,due_at,status,created_at,created_by,employee_snapshot) VALUES(?,?,?,?,?,?,?,?,?)',
      ).run(
        id,
        employeeId,
        text(b, 'purpose'),
        start,
        due,
        'Reserved',
        new Date().toISOString(),
        actor.name,
        JSON.stringify(employee),
      );
      for (const item of b.items) {
        const asset = db
          .prepare('SELECT id,name,tag,serial FROM assets WHERE id=?')
          .get(text(item, 'asset_id'));
        if (!asset) throw new HttpError(404, 'Hardware not found.');
        db.prepare(
          'INSERT INTO borrowing_items(id,borrowing_id,asset_id,asset_snapshot,condition_out,accessories) VALUES(?,?,?,?,?,?)',
        ).run(
          randomUUID(),
          id,
          asset.id,
          JSON.stringify(asset),
          text(item, 'condition_out'),
          text(item, 'accessories', false),
        );
      }
      history(id, 'Reserved', actor);
    } else {
      id = text(b, 'id');
      const row = db.prepare('SELECT * FROM borrowings WHERE id=?').get(id);
      if (!row) throw new HttpError(404, 'Borrowing not found.');
      if (row.version !== b.version)
        throw new HttpError(409, 'Record changed. Refresh and try again.');
      if (b.action === 'release') {
        if (row.status !== 'Reserved' || b.confirmed !== true)
          throw new HttpError(409, 'Confirm handover of a reserved loan.');
        const e = db
          .prepare('SELECT status FROM employees WHERE id=?')
          .get(row.employee_id);
        if (
          !['Active', 'Onboarding'].includes(e.status) ||
          db
            .prepare('SELECT 1 FROM departure_documents WHERE employee_id=?')
            .get(row.employee_id)
        )
          throw new HttpError(
            409,
            'This employee is leaving. Cancel the reservation.',
          );
        if (
          Date.parse(row.starts_at) > Date.now() ||
          Date.parse(row.due_at) <= Date.now()
        )
          throw new HttpError(
            409,
            'Release must be within the requested borrowing period.',
          );
        db.prepare(
          "UPDATE borrowings SET status='Borrowed',released_at=? WHERE id=?",
        ).run(new Date().toISOString(), id);
      } else if (b.action === 'cancel') {
        if (row.status !== 'Reserved')
          throw new HttpError(
            409,
            'Only reservations can be cancelled. Return released items instead.',
          );
        text(b, 'note');
        db.prepare("UPDATE borrowings SET status='Cancelled' WHERE id=?").run(
          id,
        );
      } else if (b.action === 'return') {
        if (row.status !== 'Borrowed' || b.confirmed !== true)
          throw new HttpError(409, 'Confirm item and accessory receipt by IT.');
        const item = db
          .prepare(
            'SELECT * FROM borrowing_items WHERE id=? AND borrowing_id=? AND returned_at IS NULL',
          )
          .get(text(b, 'item_id'), id);
        if (!item)
          throw new HttpError(409, 'Item is missing or already returned.');
        const condition = text(b, 'condition_in');
        if (!['Good', 'Fair', 'Damaged'].includes(condition))
          throw new HttpError(400, 'Choose the return condition.');
        const note = text(b, 'note', condition === 'Damaged');
        const now = new Date().toISOString();
        db.prepare(
          'UPDATE borrowing_items SET returned_at=?,condition_in=?,return_note=?,received_by=? WHERE id=?',
        ).run(now, condition, note, actor.name, item.id);
        db.prepare("UPDATE assets SET details=json_set(details,'$.condition',?) WHERE id=?").run(condition,item.asset_id);
        db.prepare('INSERT INTO asset_events(id,asset_id,message,snapshot,created_at) VALUES(?,?,?,?,?)').run(randomUUID(),item.asset_id,'Temporary borrowing returned to IT: '+actor.name,JSON.stringify({borrowing_id:id,condition,note}),now);
        if (condition === 'Damaged') {
          db.prepare(
            "INSERT INTO maintenance(id,asset_id,type,issue,provider,opened_date,work_done,cost,currency,created_at) VALUES(?,?,'Inspection',?,'',?,'','','PHP',?)",
          ).run(randomUUID(), item.asset_id, note, now.slice(0, 10), now);
          db.prepare("UPDATE assets SET state='Maintenance' WHERE id=?").run(
            item.asset_id,
          );
        }
        if (
          !db
            .prepare(
              'SELECT 1 FROM borrowing_items WHERE borrowing_id=? AND returned_at IS NULL',
            )
            .get(id)
        )
          db.prepare("UPDATE borrowings SET status='Returned' WHERE id=?").run(
            id,
          );
      } else throw new HttpError(400, 'Unknown borrowing action.');
      db.prepare('UPDATE borrowings SET version=version+1 WHERE id=?').run(id);
      history(id, b.action + (b.note ? ': ' + text(b, 'note') : ''), actor);
    }
    db.exec('COMMIT');
    return { ok: true, id };
  } catch (e) {
    db.exec('ROLLBACK');
    if (/Hardware is|borrowing before/.test(e.message))
      throw new HttpError(409, e.message);
    throw e;
  }
}
export function attachBorrowingFile(id, kind, file, bytes, actor) {
  if (!['Borrowing', 'Return'].includes(kind))
    throw new HttpError(400, 'Choose a form type.');
  const row = db.prepare('SELECT * FROM borrowings WHERE id=?').get(id);
  if (!row) throw new HttpError(404, 'Borrowing not found.');
  if (
    kind === 'Return' &&
    !db
      .prepare(
        'SELECT 1 FROM borrowing_items WHERE borrowing_id=? AND returned_at IS NOT NULL',
      )
      .get(id)
  )
    throw new HttpError(409, 'Record a return before attaching its form.');
  const mime =
    bytes.subarray(0, 5).toString() === '%PDF-'
      ? 'application/pdf'
      : bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? 'image/png'
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          ? 'image/jpeg'
          : '';
  if (!mime || bytes.length > 5 * 1024 * 1024 || !bytes.length)
    throw new HttpError(400, 'Use a PDF, PNG or JPEG up to 5 MB.');
  db.exec('BEGIN IMMEDIATE');
  try {
    const fid = randomUUID();
    db.prepare('INSERT INTO borrowing_files VALUES(?,?,?,?,?,?,?,?)').run(
      fid,
      id,
      kind,
      String(file.name).slice(0, 200),
      mime,
      bytes,
      actor.name,
      new Date().toISOString(),
    );
    history(id, `Attached signed ${kind} form`, actor);
    db.exec('COMMIT');
    return { ok: true, id: fid };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
export function borrowingForm(row) {
  const e = JSON.parse(row.employee_snapshot);
  return `<!doctype html><html><head><meta charset="utf-8"><title>Borrowing and Return Form</title><style>body{font:14px Arial;max-width:1000px;margin:30px auto;padding:20px;color:#193641}table{width:100%;border-collapse:collapse}th,td{border:1px solid #aaa;padding:8px;text-align:left;overflow-wrap:anywhere}.signatures{margin-top:45px;line-height:3}@media print{button{display:none}body{margin:0}tr{break-inside:avoid}}</style></head><body><button onclick="window.print()">Print / Save as PDF</button><h1>AnchorEd · Borrowing and Return Form</h1><p>Reference: ${esc(row.id)}</p><p>Employee: ${esc(e.name)} · ${esc(e.code)} · ${esc(e.department)}</p><p>Purpose: ${esc(row.purpose)}</p><p>From: ${esc(new Date(row.starts_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }))}<br>Due: ${esc(new Date(row.due_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' }))} (Philippine time)</p><p>Status: ${esc(row.display_status)} · Released: ${esc(row.released_at || 'Not released')}</p><table><thead><tr><th>Item / tag / serial</th><th>Condition at issue / accessories</th><th>Return record</th></tr></thead><tbody>${row.items.map((i) => `<tr><td>${esc(i.asset.name)}<br>${esc(i.asset.tag)} / ${esc(i.asset.serial)}</td><td>${esc(i.condition_out)}<br>${esc(i.accessories)}</td><td>${esc(i.returned_at || (row.released_at?'Outstanding':'Not issued'))}<br>${esc(i.condition_in)} · ${esc(i.return_note)}<br>Received by: ${esc(i.received_by)}</td></tr>`).join('')}</tbody></table><p>I acknowledge receipt of the listed items and accessories, and agree to return them by the due date and report loss or damage to IT.</p><div class="signatures">Borrower signature / date: __________________________<br>IT release signature / date: _________________________<br>IT return acknowledgement signature / date: _________________________</div><p>This printable form is not signed until completed. Attach the signed copy to the borrowing record. A partial return acknowledges only the items marked returned above.</p></body></html>`;
}
