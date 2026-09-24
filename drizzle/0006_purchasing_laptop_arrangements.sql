CREATE TABLE suppliers (
 id TEXT PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE,
 category TEXT NOT NULL DEFAULT '', contact TEXT NOT NULL DEFAULT '',
 email TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
 address TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
 source TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE procurements (
 id TEXT PRIMARY KEY, supplier_id TEXT NOT NULL REFERENCES suppliers(id),
 supplier_name TEXT NOT NULL, reference TEXT NOT NULL COLLATE NOCASE,
 purchase_date TEXT NOT NULL, description TEXT NOT NULL,
 amount_cents INTEGER NOT NULL CHECK(amount_cents>=0), currency TEXT NOT NULL DEFAULT 'PHP',
 status TEXT NOT NULL DEFAULT 'Recorded' CHECK(status IN ('Recorded','Voided')),
 notes TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 UNIQUE(supplier_id,reference)
);
CREATE TABLE procurement_assets (
 procurement_id TEXT NOT NULL REFERENCES procurements(id),
 asset_id TEXT NOT NULL REFERENCES assets(id), PRIMARY KEY(procurement_id,asset_id)
);
CREATE TABLE procurement_invoices (
 id TEXT PRIMARY KEY, procurement_id TEXT NOT NULL REFERENCES procurements(id),
 name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL,
 content BLOB NOT NULL, created_at TEXT NOT NULL, created_by TEXT NOT NULL
);
CREATE INDEX idx_invoice_procurement ON procurement_invoices(procurement_id);
CREATE TABLE employee_laptop_arrangements (
 employee_id TEXT PRIMARY KEY REFERENCES employees(id),
 personal_use TEXT NOT NULL DEFAULT 'Unknown' CHECK(personal_use IN ('Unknown','Yes','No')),
 personal_details TEXT NOT NULL DEFAULT '',
 loan_status TEXT NOT NULL DEFAULT 'Unknown' CHECK(loan_status IN ('Unknown','None','Active','Completed','Cancelled')),
 loan_reference TEXT NOT NULL DEFAULT '', loan_date TEXT NOT NULL DEFAULT '',
 loan_details TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '',
 version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
);
CREATE TABLE purchasing_history (
 id TEXT PRIMARY KEY, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
 action TEXT NOT NULL, actor TEXT NOT NULL, snapshot TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX idx_purchasing_history ON purchasing_history(entity,entity_id,created_at);
