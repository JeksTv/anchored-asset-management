CREATE TABLE manager_handovers (
 id TEXT PRIMARY KEY, employee_id TEXT NOT NULL REFERENCES employees(id), source_key TEXT NOT NULL,
 account_snapshot TEXT NOT NULL, decision TEXT NOT NULL CHECK(decision IN ('Transfer','No handover')),
 manager_name TEXT NOT NULL, approved_on TEXT NOT NULL, recipient_id TEXT REFERENCES employees(id),
 instructions TEXT NOT NULL, evidence_reference TEXT NOT NULL DEFAULT '', evidence_name TEXT NOT NULL DEFAULT '',
 evidence_mime TEXT NOT NULL DEFAULT '', evidence BLOB, completed_at TEXT, completed_by TEXT,
 completion_note TEXT NOT NULL DEFAULT '', recorded_by TEXT NOT NULL, updated_at TEXT NOT NULL,
 version INTEGER NOT NULL DEFAULT 1, UNIQUE(employee_id,source_key)
);
CREATE TABLE manager_handover_events (
 id TEXT PRIMARY KEY, handover_id TEXT NOT NULL REFERENCES manager_handovers(id), actor_id TEXT NOT NULL,
 actor_name TEXT NOT NULL, action TEXT NOT NULL, snapshot TEXT NOT NULL, created_at TEXT NOT NULL
);
