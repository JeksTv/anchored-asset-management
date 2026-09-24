ALTER TABLE employees ADD COLUMN departure_reason TEXT NOT NULL DEFAULT '';
CREATE TABLE departure_documents (
 id TEXT PRIMARY KEY NOT NULL,
 employee_id TEXT NOT NULL REFERENCES employees(id),
 type TEXT NOT NULL CHECK(type IN ('Turnover','Clearance')),
 snapshot TEXT NOT NULL,
 signed_by TEXT NOT NULL,
 signer_name TEXT NOT NULL,
 signer_username TEXT NOT NULL,
 signed_at TEXT NOT NULL,
 note TEXT NOT NULL,
 digest TEXT NOT NULL,
 UNIQUE(employee_id,type)
);
CREATE INDEX departure_documents_employee ON departure_documents(employee_id);
