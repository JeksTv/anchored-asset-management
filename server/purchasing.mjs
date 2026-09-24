import { randomUUID } from 'node:crypto';
import { connection as db } from './database.mjs';
import { HttpError, audit } from './auth.mjs';

export function text(b, key, required = false, max = 2000) {
  const value = b[key] ?? '';
  if (typeof value !== 'string' || value.length > max)
    throw new HttpError(400, `${key}: enter text up to ${max} characters.`);
  const result = value.trim();
  if (required && !result) throw new HttpError(400, `${key} is required.`);
  return result;
}
function date(b, key, required = false) {
  const value = text(b, key, required, 10);
  if (
    value &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value)
  )
    throw new HttpError(400, `Enter a valid ${key}.`);
  return value;
}
export function excludedCategory(category) {
  return /fire\s*(?:and|&)\s*safety|document\s+management/i.test(category);
}
function history(entity, id, action, actor, snapshot) {
  db.prepare('INSERT INTO purchasing_history VALUES(?,?,?,?,?,?,?)').run(
    randomUUID(),
    entity,
    id,
    action,
    actor.name,
    JSON.stringify(snapshot),
    new Date().toISOString(),
  );
  audit(actor.id, `${entity}:${action}`, id);
}
function revision(row, b) {
  if (!row) throw new HttpError(404, 'Record not found.');
  if (row.version !== b.version)
    throw new HttpError(
      409,
      'This record changed. Close the form and refresh before editing.',
    );
}
export function savePurchasing(b, actor) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const now = new Date().toISOString();
    let id = text(b, 'id', false, 100) || randomUUID();
    if (b.action === 'supplier') {
      const previous = b.id
        ? db.prepare('SELECT * FROM suppliers WHERE id=?').get(id)
        : null;
      if (b.id) revision(previous, b);
      const name = text(b, 'name', true, 200),
        category = text(b, 'category', false, 200),
        contact = text(b, 'contact', false, 300),
        email = text(b, 'email', false, 500),
        phone = text(b, 'phone', false, 300),
        address = text(b, 'address'),
        notes = text(b, 'notes');
      if (excludedCategory(category))
        throw new HttpError(
          400,
          'Fire and Safety Services and Document Management are excluded from this supplier list.',
        );
      if (previous) {
        db.prepare(
          'UPDATE suppliers SET name=?,category=?,contact=?,email=?,phone=?,address=?,notes=?,version=version+1,updated_at=? WHERE id=?',
        ).run(name, category, contact, email, phone, address, notes, now, id);
      } else
        db.prepare(
          'INSERT INTO suppliers(id,name,category,contact,email,phone,address,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)',
        ).run(
          id,
          name,
          category,
          contact,
          email,
          phone,
          address,
          notes,
          now,
          now,
        );
      history(
        'supplier',
        id,
        previous ? 'Updated' : 'Created',
        actor,
        db.prepare('SELECT * FROM suppliers WHERE id=?').get(id),
      );
    } else if (b.action === 'supplierStatus') {
      const row = db.prepare('SELECT * FROM suppliers WHERE id=?').get(id);
      revision(row, b);
      if (typeof b.active !== 'boolean')
        throw new HttpError(400, 'Select an active status.');
      db.prepare(
        'UPDATE suppliers SET active=?,version=version+1,updated_at=? WHERE id=?',
      ).run(b.active ? 1 : 0, now, id);
      history('supplier', id, b.active ? 'Reactivated' : 'Archived', actor, {
        name: row.name,
      });
    } else if (b.action === 'procurement') {
      const previous = b.id
        ? db.prepare('SELECT * FROM procurements WHERE id=?').get(id)
        : null;
      if (b.id) revision(previous, b);
      if (previous?.status === 'Voided')
        throw new HttpError(
          409,
          'Voided procurement records are retained and cannot be edited.',
        );
      const supplierId = text(b, 'supplier_id', true, 100),
        supplier = db
          .prepare('SELECT * FROM suppliers WHERE id=?')
          .get(supplierId);
      if (
        !supplier ||
        (!supplier.active && previous?.supplier_id !== supplierId)
      )
        throw new HttpError(400, 'Choose an active supplier.');
      const reference = text(b, 'reference', true, 200),
        purchaseDate = date(b, 'purchase_date', true),
        description = text(b, 'description', true),
        notes = text(b, 'notes');
      const amount = text(b, 'amount', true, 20),
        currency = text(b, 'currency', true, 3).toUpperCase();
      if (
        !/^\d{1,10}(\.\d{1,2})?$/.test(amount) ||
        !/^[A-Z]{3}$/.test(currency)
      )
        throw new HttpError(
          400,
          'Enter a non-negative amount with up to two decimal places and a three-letter currency.',
        );
      const cents = Math.round(Number(amount) * 100);
      if (
        !Array.isArray(b.asset_ids) ||
        b.asset_ids.length > 500 ||
        b.asset_ids.some((a) => typeof a !== 'string')
      )
        throw new HttpError(400, 'Select valid assets.');
      const assets = [...new Set(b.asset_ids)];
      for (const asset of assets)
        if (
          !db
            .prepare("SELECT id FROM assets WHERE id=? AND kind!='Account'")
            .get(asset)
        )
          throw new HttpError(400, 'A linked asset no longer exists.');
      if (previous)
        db.prepare(
          'UPDATE procurements SET supplier_id=?,supplier_name=?,reference=?,purchase_date=?,description=?,amount_cents=?,currency=?,notes=?,version=version+1,updated_at=? WHERE id=?',
        ).run(
          supplierId,
          supplier.name,
          reference,
          purchaseDate,
          description,
          cents,
          currency,
          notes,
          now,
          id,
        );
      else
        db.prepare(
          'INSERT INTO procurements(id,supplier_id,supplier_name,reference,purchase_date,description,amount_cents,currency,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
        ).run(
          id,
          supplierId,
          supplier.name,
          reference,
          purchaseDate,
          description,
          cents,
          currency,
          notes,
          now,
          now,
        );
      db.prepare('DELETE FROM procurement_assets WHERE procurement_id=?').run(
        id,
      );
      for (const asset of assets)
        db.prepare('INSERT INTO procurement_assets VALUES(?,?)').run(id, asset);
      history('procurement', id, previous ? 'Updated' : 'Recorded', actor, {
        ...db.prepare('SELECT * FROM procurements WHERE id=?').get(id),
        asset_ids: assets,
      });
    } else if (b.action === 'voidProcurement') {
      const row = db.prepare('SELECT * FROM procurements WHERE id=?').get(id);
      revision(row, b);
      if (row.status === 'Voided') throw new HttpError(409, 'Already voided.');
      const reason = text(b, 'reason', true);
      db.prepare(
        "UPDATE procurements SET status='Voided',version=version+1,updated_at=? WHERE id=?",
      ).run(now, id);
      history('procurement', id, 'Voided', actor, { reason });
    } else if (b.action === 'laptopArrangement') {
      id = text(b, 'employee_id', true, 100);
      if (!db.prepare('SELECT id FROM employees WHERE id=?').get(id))
        throw new HttpError(404, 'Employee not found.');
      const previous = db
        .prepare(
          'SELECT * FROM employee_laptop_arrangements WHERE employee_id=?',
        )
        .get(id);
      if (previous) revision(previous, b);
      else if (b.version !== 0)
        throw new HttpError(409, 'Refresh employee records.');
      const personal = text(b, 'personal_use', true),
        loan = text(b, 'loan_status', true),
        loanDate = date(b, 'loan_date');
      if (
        !['Unknown', 'Yes', 'No'].includes(personal) ||
        !['Unknown', 'None', 'Active', 'Completed', 'Cancelled'].includes(loan)
      )
        throw new HttpError(400, 'Choose a valid laptop arrangement.');
      const values = [
        personal,
        text(b, 'personal_details'),
        loan,
        text(b, 'loan_reference', false, 200),
        loanDate,
        text(b, 'loan_details'),
        text(b, 'notes'),
        now,
      ];
      if (previous)
        db.prepare(
          'UPDATE employee_laptop_arrangements SET personal_use=?,personal_details=?,loan_status=?,loan_reference=?,loan_date=?,loan_details=?,notes=?,updated_at=?,version=version+1 WHERE employee_id=?',
        ).run(...values, id);
      else
        db.prepare(
          'INSERT INTO employee_laptop_arrangements(personal_use,personal_details,loan_status,loan_reference,loan_date,loan_details,notes,updated_at,employee_id) VALUES(?,?,?,?,?,?,?,?,?)',
        ).run(...values, id);
      history(
        'laptop',
        id,
        'Arrangement recorded',
        actor,
        db
          .prepare(
            'SELECT * FROM employee_laptop_arrangements WHERE employee_id=?',
          )
          .get(id),
      );
      db.prepare('INSERT INTO events VALUES(?,?,?,?)').run(
        randomUUID(),
        id,
        'Laptop arrangement updated by ' + actor.name,
        now,
      );
    } else throw new HttpError(400, 'Unknown purchasing action.');
    db.exec('COMMIT');
    return { id };
  } catch (e) {
    db.exec('ROLLBACK');
    if (String(e).includes('UNIQUE constraint'))
      throw new HttpError(
        409,
        'This supplier name or supplier invoice/PO reference already exists.',
      );
    throw e;
  }
}
export function purchasingData() {
  return {
    suppliers: db.prepare('SELECT * FROM suppliers ORDER BY name').all(),
    procurements: db
      .prepare(
        'SELECT * FROM procurements ORDER BY purchase_date DESC,created_at DESC',
      )
      .all(),
    links: db.prepare('SELECT * FROM procurement_assets').all(),
    invoices: db
      .prepare(
        'SELECT id,procurement_id,name,mime,size,created_at FROM procurement_invoices ORDER BY created_at DESC',
      )
      .all(),
    arrangements: db
      .prepare('SELECT * FROM employee_laptop_arrangements')
      .all(),
  };
}
export function recordInvoice(procurementId, file, bytes, actor) {
  if (!['application/pdf', 'image/png', 'image/jpeg'].includes(file.type))
    throw new HttpError(400, 'Use PDF, PNG or JPEG.');
  const valid =
    file.type === 'application/pdf'
      ? bytes.subarray(0, 5).toString() === '%PDF-'
      : file.type === 'image/png'
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!valid)
    throw new HttpError(400, 'File contents do not match the selected format.');
  if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024)
    throw new HttpError(400, 'Invoices must be between 1 byte and 10 MB.');
  db.exec('BEGIN IMMEDIATE');
  try {
    const row = db
      .prepare('SELECT * FROM procurements WHERE id=?')
      .get(procurementId);
    if (!row || row.status === 'Voided')
      throw new HttpError(
        409,
        'Choose a recorded procurement before attaching an invoice.',
      );
    const id = randomUUID(),
      name = file.name.replace(/[\r\n\\/]/g, '_').slice(0, 150) || 'invoice';
    db.prepare('INSERT INTO procurement_invoices VALUES(?,?,?,?,?,?,?,?)').run(
      id,
      procurementId,
      name,
      file.type,
      bytes.length,
      bytes,
      new Date().toISOString(),
      actor.id,
    );
    history('procurement', procurementId, 'Invoice attached', actor, {
      id,
      name,
      size: bytes.length,
    });
    db.exec('COMMIT');
    return { id };
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
