import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'anchored-borrowing-'));
execFileSync(process.execPath, ['scripts/migrate.mjs'], { env: process.env });
const { connection: db } = await import('../server/database.mjs');
const {
  saveBorrowing,
  borrowingRows,
  loanStatus,
  attachBorrowingFile,
  borrowingForm,
} = await import('../server/borrowing.mjs');
const { blockers } = await import('../server/departures.mjs');
const actor = { id: 'tester', name: 'IT Tester' };
db.prepare(
  'INSERT INTO employees(id,code,name,email,department,role,start_date,status) VALUES(?,?,?,?,?,?,?,?)',
).run(
  'emp',
  'EMP',
  'Test Employee',
  'test@example.test',
  'IT',
  'Tester',
  '2026-01-01',
  'Active',
);
for (const id of ['a', 'b', 'c', 'd'])
  db.prepare('INSERT INTO assets(id,tag,name,kind) VALUES(?,?,?,?)').run(
    id,
    id,
    'Test ' + id,
    'Hardware',
  );
const body = (ids = ['a', 'b']) => ({
  action: 'create',
  employee_id: 'emp',
  purpose: 'Temporary presentation',
  starts_at: new Date(Date.now() - 60000).toISOString(),
  due_at: new Date(Date.now() + 86400000).toISOString(),
  items: ids.map((asset_id) => ({
    asset_id,
    condition_out: 'Good',
    accessories: '1 charger',
  })),
});
const row = (id) => borrowingRows().find((b) => b.id === id);
let id;
test('reservation holds assets against competing loans and assignments', () => {
  id = saveBorrowing(body(), actor).id;
  assert.equal(row(id).status, 'Reserved');
  assert.throws(() => saveBorrowing(body(['a']), actor), /unavailable/);
  assert.equal(borrowingRows().length, 1, 'failed reservation must roll back');
  assert.throws(
    () =>
      db
        .prepare(
          'INSERT INTO assignments(id,employee_id,asset_id,assigned_at) VALUES(?,?,?,?)',
        )
        .run('x', 'emp', 'a', new Date().toISOString()),
    /reserved or borrowed/,
  );
  assert.throws(
    () => db.prepare("UPDATE assets SET state='Retired' WHERE id='a'").run(),
    /Return or cancel/,
  );
  assert.ok(blockers('emp', 'Turnover').some((s) => s.includes('temporary')));
  assert.throws(
    () =>
      db
        .prepare("UPDATE employees SET status='Offboarded' WHERE id='emp'")
        .run(),
    /outstanding borrowings/,
  );
});
test('release validates confirmation, dates and stale versions', () => {
  assert.throws(
    () => saveBorrowing({ action: 'release', id, version: 1 }, actor),
    /Confirm/,
  );
  saveBorrowing({ action: 'release', id, version: 1, confirmed: true }, actor);
  assert.equal(row(id).status, 'Borrowed');
  assert.throws(
    () =>
      saveBorrowing({ action: 'cancel', id, version: 1, note: 'Test' }, actor),
    /changed/,
  );
  assert.throws(
    () =>
      saveBorrowing({ action: 'cancel', id, version: 2, note: 'Test' }, actor),
    /Only reservations/,
  );
});
test('partial return, damaged inspection and final return', () => {
  const first = row(id).items[0];
  saveBorrowing(
    {
      action: 'return',
      id,
      version: 2,
      item_id: first.id,
      condition_in: 'Damaged',
      note: 'Cracked display',
      confirmed: true,
    },
    actor,
  );
  assert.equal(row(id).status, 'Borrowed');
  assert.equal(
    db.prepare('SELECT state FROM assets WHERE id=?').get(first.asset_id).state,
    'Maintenance',
  );
  assert.equal(
    db
      .prepare('SELECT COUNT(*) n FROM maintenance WHERE asset_id=?')
      .get(first.asset_id).n,
    1,
  );
  assert.throws(
    () =>
      saveBorrowing(
        {
          action: 'return',
          id,
          version: 3,
          item_id: first.id,
          condition_in: 'Good',
          note: '',
          confirmed: true,
        },
        actor,
      ),
    /already returned/,
  );
  const second = row(id).items.find((i) => !i.returned_at);
  saveBorrowing(
    {
      action: 'return',
      id,
      version: 3,
      item_id: second.id,
      condition_in: 'Good',
      note: 'All accessories checked',
      confirmed: true,
    },
    actor,
  );
  assert.equal(row(id).status, 'Returned');
  assert.ok(!blockers('emp', 'Turnover').some((s) => s.includes('temporary')));
  assert.equal(row(id).items.filter((i) => i.returned_at).length, 2);
});
test('cancel frees reservation and retains history', () => {
  const x = saveBorrowing(body(['c']), actor).id;
  saveBorrowing(
    { action: 'cancel', id: x, version: 1, note: 'Meeting cancelled' },
    actor,
  );
  assert.equal(row(x).status, 'Cancelled');
  saveBorrowing(body(['c']), actor);
  assert.equal(row(x).history.length, 2);
});
test('dates, assigned hardware and employee status validation', () => {
  assert.throws(
    () => saveBorrowing({ ...body(['d']), due_at: 'invalid' }, actor),
    /date and time/,
  );
  assert.throws(
    () =>
      saveBorrowing(
        { ...body(['d']), due_at: new Date(Date.now() - 999999).toISOString() },
        actor,
      ),
    /Return time/,
  );
  db.prepare(
    'INSERT INTO assignments(id,employee_id,asset_id,assigned_at) VALUES(?,?,?,?)',
  ).run('permanent', 'emp', 'd', new Date().toISOString());
  assert.throws(() => saveBorrowing(body(['d']), actor), /unavailable/);
  db.prepare("UPDATE employees SET status='Offboarding' WHERE id='emp'").run();
  assert.throws(() => saveBorrowing(body(['d']), actor), /active employee/);
});
test('overdue and due-today status are computed; cancelled loans stay cancelled', () => {
  const now = new Date('2026-09-24T08:00:00.000Z');
  assert.equal(
    loanStatus({ status: 'Borrowed', due_at: '2026-09-24T07:59:00.000Z' }, now),
    'Overdue',
  );
  assert.equal(
    loanStatus({ status: 'Borrowed', due_at: '2026-09-24T09:00:00.000Z' }, now),
    'Due today',
  );
  assert.equal(
    loanStatus(
      { status: 'Cancelled', due_at: '2026-09-20T09:00:00.000Z' },
      now,
    ),
    'Cancelled',
  );
});
test('signed files enforce size and format; form escapes untrusted text', () => {
  assert.throws(
    () =>
      attachBorrowingFile(
        id,
        'Return',
        { name: 'bad.html' },
        Buffer.from('<html>bad</html>'),
        actor,
      ),
    /PDF/,
  );
  assert.throws(
    () =>
      attachBorrowingFile(
        id,
        'Return',
        { name: 'big.pdf' },
        Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(5 * 1024 * 1024)]),
        actor,
      ),
    /5 MB/,
  );
  attachBorrowingFile(
    id,
    'Return',
    { name: 'signed.pdf' },
    Buffer.from('%PDF-1.7\nfixture'),
    actor,
  );
  assert.equal(row(id).files.length, 1);
  const html = borrowingForm({
    ...row(id),
    purpose: '<script>alert(1)</script>',
  });
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>alert'));
  assert.equal(borrowingRows('someone-else').length, 0);
  assert.equal(borrowingRows('', 'a').length, 1);
});
