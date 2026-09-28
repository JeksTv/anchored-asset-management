CREATE TABLE acknowledgement_uploads (
id TEXT PRIMARY KEY, employee_id TEXT NOT NULL REFERENCES employees(id), name TEXT NOT NULL, mime TEXT NOT NULL, content BLOB NOT NULL, size INTEGER NOT NULL, signed_date TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', uploaded_at TEXT NOT NULL, uploaded_by TEXT NOT NULL, uploaded_by_name TEXT NOT NULL);
CREATE INDEX idx_ack_upload_employee ON acknowledgement_uploads(employee_id);
