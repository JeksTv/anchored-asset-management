import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'anchored-purchasing-'));
execFileSync(process.execPath, ['scripts/migrate.mjs'], { env: process.env });
const { connection: db } = await import('../server/database.mjs');
const { savePurchasing, recordInvoice, purchasingData } =
  await import('../server/purchasing.mjs');
const actor = { id: 'tester', name: 'IT tester' };
db.prepare(
  'INSERT INTO employees(id,code,name,email,department,role,start_date) VALUES(?,?,?,?,?,?,?)',
).run(
  'employee',
  'EMP',
  'Test Employee',
  'test@example.test',
  'IT',
  'Tester',
  '2026-01-01',
);
db.prepare('INSERT INTO assets(id,tag,name,kind) VALUES(?,?,?,?)').run(
  'asset',
  'TEST-LAP',
  'Laptop',
  'Hardware',
);
test('supplier lifecycle, exclusions, unique names and stale edits', () => {
  for (const category of [
    'Fire & Safety Services',
    'Fire and Safety Services',
    'Document Management',
  ])
    assert.throws(
      () =>
        savePurchasing(
          { action: 'supplier', name: 'Excluded', category },
          actor,
        ),
      (e) => e.status === 400,
    );
  const { id } = savePurchasing(
    { action: 'supplier', name: 'TEST supplier', category: 'Laptop' },
    actor,
  );
  assert.throws(
    () => savePurchasing({ action: 'supplier', name: 'test SUPPLIER' }, actor),
    (e) => e.status === 409,
  );
  savePurchasing(
    { action: 'supplier', id, version: 1, name: 'TEST supplier edited' },
    actor,
  );
  assert.throws(
    () =>
      savePurchasing(
        { action: 'supplier', id, version: 1, name: 'stale' },
        actor,
      ),
    (e) => e.status === 409,
  );
  savePurchasing(
    { action: 'supplierStatus', id, version: 2, active: false },
    actor,
  );
  assert.equal(
    db.prepare('SELECT active FROM suppliers WHERE id=?').get(id).active,
    0,
  );
});
test('procurement validation, links, revision history, invoice retention and void', () => {
  const supplier = savePurchasing(
    { action: 'supplier', name: 'TEST purchase supplier' },
    actor,
  ).id;
  const b = {
    action: 'procurement',
    supplier_id: supplier,
    reference: 'INV-1',
    purchase_date: '2026-09-23',
    amount: '123.45',
    currency: 'PHP',
    description: 'Laptop purchase',
    asset_ids: ['asset'],
  };
  for (const invalid of [
    { amount: '-1' },
    { purchase_date: '2026-02-30' },
    { asset_ids: ['missing'] },
    { amount: '1.999' },
  ])
    assert.throws(
      () => savePurchasing({ ...b, ...invalid }, actor),
      (e) => e.status === 400,
    );
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM procurements').get().n, 0);
  const { id } = savePurchasing(b, actor);
  assert.equal(
    db.prepare('SELECT amount_cents FROM procurements WHERE id=?').get(id)
      .amount_cents,
    12345,
  );
  assert.throws(
    () => savePurchasing(b, actor),
    (e) => e.status === 409,
  );
  const file = { name: 'invoice.pdf', type: 'application/pdf' },
    bytes = Buffer.from('%PDF-1.4\nTest document');
  assert.throws(
    () => recordInvoice(id, file, Buffer.from('fake PDF'), actor),
    (e) => e.status === 400,
  );
  const invoice = recordInvoice(id, file, bytes, actor);
  assert.equal(
    db
      .prepare('SELECT size FROM procurement_invoices WHERE id=?')
      .get(invoice.id).size,
    bytes.length,
  );
  savePurchasing({ ...b, id, version: 1, amount: '150.00' }, actor);
  assert.throws(
    () => savePurchasing({ ...b, id, version: 1 }, actor),
    (e) => e.status === 409,
  );
  savePurchasing(
    { action: 'voidProcurement', id, version: 2, reason: 'Duplicate billing' },
    actor,
  );
  assert.throws(
    () => recordInvoice(id, file, bytes, actor),
    (e) => e.status === 409,
  );
  assert.throws(
    () => savePurchasing({ ...b, id, version: 3 }, actor),
    (e) => e.status === 409,
  );
  assert.equal(purchasingData().invoices.length, 1);
  assert(!('content' in purchasingData().invoices[0]));
  assert.equal(
    db
      .prepare(
        "SELECT COUNT(*) AS n FROM purchasing_history WHERE entity='procurement' AND entity_id=?",
      )
      .get(id).n,
    4,
  );
  assert.throws(
    () => db.prepare("DELETE FROM assets WHERE id='asset'").run(),
    /FOREIGN KEY/,
  );
});
test('loan and personal use coexist without manufacturing a company asset', () => {
  const before = db.prepare('SELECT COUNT(*) AS n FROM assets').get().n;
  const b = {
    action: 'laptopArrangement',
    employee_id: 'employee',
    version: 0,
    personal_use: 'Yes',
    loan_status: 'Active',
    loan_reference: 'LOAN-1',
    loan_date: '2026-09-01',
    personal_details: 'Personal laptop',
  };
  savePurchasing(b, actor);
  assert.throws(
    () => savePurchasing(b, actor),
    (e) => e.status === 409,
  );
  savePurchasing({ ...b, version: 1, loan_status: 'Completed' }, actor);
  const row = purchasingData().arrangements[0];
  assert.equal(row.personal_use, 'Yes');
  assert.equal(row.loan_status, 'Completed');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM assets').get().n, before);
  assert.throws(
    () => savePurchasing({ ...b, version: 2, personal_use: 'Invalid' }, actor),
    (e) => e.status === 400,
  );
  assert.throws(
    () => db.prepare("DELETE FROM employees WHERE id='employee'").run(),
    /FOREIGN KEY/,
  );
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
});
