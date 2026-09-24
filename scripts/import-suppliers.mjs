import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { backup } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { connection as db } from '../server/database.mjs';
import { excludedCategory } from '../server/purchasing.mjs';
const path =
  process.argv.find((a) => a.startsWith('--input='))?.slice(8) ||
  'migration-data/supplier-import.json';
const manifest = JSON.parse(readFileSync(path, 'utf8'));
const candidates = manifest.suppliers;
if (!Array.isArray(candidates)) throw Error('Invalid supplier manifest.');
for (const row of candidates)
  if (
    !row.name?.trim() ||
    excludedCategory(row.category) ||
    row.rows.some((r) => excludedCategory(r.sheet))
  )
    throw Error('Empty or excluded supplier in manifest.');
const pending = candidates.filter(
  (r) =>
    !db
      .prepare('SELECT id FROM suppliers WHERE name=? COLLATE NOCASE')
      .get(r.name),
);
console.log(
  `${candidates.length} suppliers; ${pending.length} new; ${candidates.length - pending.length} already present. Excluded: ${manifest.excluded.join(', ')}`,
);
if (process.argv.includes('--apply') && pending.length) {
  const target = resolve(
    'backups',
    new Date().toISOString().replace(/[:.]/g, '-') + '-suppliers',
  );
  mkdirSync(target, { recursive: true });
  await backup(db, join(target, 'anchored.sqlite'));
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const r of pending) {
      const id = randomUUID(),
        now = new Date().toISOString();
      db.prepare(
        'INSERT INTO suppliers(id,name,category,contact,email,phone,address,notes,source,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)',
      ).run(
        id,
        r.name,
        r.category,
        r.contact,
        r.email,
        r.phone,
        r.address,
        r.notes,
        r.source,
        now,
        now,
      );
      db.prepare('INSERT INTO purchasing_history VALUES(?,?,?,?,?,?,?)').run(
        randomUUID(),
        'supplier',
        id,
        'Imported',
        'Local supplier migration',
        JSON.stringify({ source: manifest.source, rows: r.rows }),
        now,
      );
    }
    db.exec('COMMIT');
    console.log(`Imported ${pending.length}. Backup: ${target}`);
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
} else
  console.log(
    process.argv.includes('--apply')
      ? 'No changes required.'
      : 'Preview only. Add --apply to import.',
  );
