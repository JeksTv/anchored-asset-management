CREATE TABLE borrowings (
 id TEXT PRIMARY KEY, employee_id TEXT NOT NULL REFERENCES employees(id), purpose TEXT NOT NULL,
 starts_at TEXT NOT NULL, due_at TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Reserved','Borrowed','Returned','Cancelled')),
 released_at TEXT, created_at TEXT NOT NULL, created_by TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
 employee_snapshot TEXT NOT NULL
);
CREATE TABLE borrowing_items (
 id TEXT PRIMARY KEY, borrowing_id TEXT NOT NULL REFERENCES borrowings(id), asset_id TEXT NOT NULL REFERENCES assets(id),
 asset_snapshot TEXT NOT NULL, condition_out TEXT NOT NULL, accessories TEXT NOT NULL DEFAULT '',
 returned_at TEXT, condition_in TEXT, return_note TEXT, received_by TEXT,
 UNIQUE(borrowing_id,asset_id)
);
CREATE INDEX borrowing_employee ON borrowings(employee_id);
CREATE INDEX borrowing_asset ON borrowing_items(asset_id);
CREATE TABLE borrowing_history (id TEXT PRIMARY KEY, borrowing_id TEXT NOT NULL REFERENCES borrowings(id), action TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL, snapshot TEXT NOT NULL);
CREATE TABLE borrowing_files (id TEXT PRIMARY KEY, borrowing_id TEXT NOT NULL REFERENCES borrowings(id), kind TEXT NOT NULL CHECK(kind IN ('Borrowing','Return')), name TEXT NOT NULL, mime TEXT NOT NULL, content BLOB NOT NULL, uploaded_by TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TRIGGER borrowing_asset_lock BEFORE INSERT ON borrowing_items BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM borrowing_items i JOIN borrowings b ON b.id=i.borrowing_id WHERE i.asset_id=NEW.asset_id AND i.returned_at IS NULL AND b.status IN ('Reserved','Borrowed')) OR EXISTS(SELECT 1 FROM assignments WHERE asset_id=NEW.asset_id AND resolved_at IS NULL) OR NOT EXISTS(SELECT 1 FROM assets WHERE id=NEW.asset_id AND kind='Hardware' AND state='Ready' AND COALESCE(json_extract(details,'$.custodian'),'')='') THEN RAISE(ABORT,'Hardware is unavailable for borrowing') END;
END;
CREATE TRIGGER borrowing_assignment_lock BEFORE INSERT ON assignments WHEN NEW.resolved_at IS NULL BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM borrowing_items i JOIN borrowings b ON b.id=i.borrowing_id WHERE i.asset_id=NEW.asset_id AND i.returned_at IS NULL AND b.status IN ('Reserved','Borrowed')) THEN RAISE(ABORT,'Hardware is reserved or borrowed; return or cancel the loan first') END;
END;
CREATE TRIGGER borrowing_assignment_update_lock BEFORE UPDATE OF asset_id,resolved_at ON assignments WHEN NEW.resolved_at IS NULL BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM borrowing_items i JOIN borrowings b ON b.id=i.borrowing_id WHERE i.asset_id=NEW.asset_id AND i.returned_at IS NULL AND b.status IN ('Reserved','Borrowed')) THEN RAISE(ABORT,'Hardware is reserved or borrowed') END;
END;
CREATE TRIGGER borrowing_state_lock BEFORE UPDATE OF state ON assets WHEN NEW.state!='Ready' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM borrowing_items i JOIN borrowings b ON b.id=i.borrowing_id WHERE i.asset_id=NEW.id AND i.returned_at IS NULL AND b.status IN ('Reserved','Borrowed')) THEN RAISE(ABORT,'Return or cancel the borrowing before changing hardware state') END;
END;
CREATE TRIGGER borrowing_clearance_lock BEFORE UPDATE OF status ON employees WHEN NEW.status='Offboarded' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM borrowings WHERE employee_id=NEW.id AND status IN ('Reserved','Borrowed')) THEN RAISE(ABORT,'Resolve outstanding borrowings before completing clearance') END;
END;
