CREATE TABLE asset_movements (
 id TEXT PRIMARY KEY,
 asset_id TEXT REFERENCES assets(id), employee_id TEXT REFERENCES employees(id),
 movement_type TEXT NOT NULL CHECK(movement_type IN ('Deployment','Return')),
 occurred_on TEXT NOT NULL DEFAULT '', source_date TEXT NOT NULL DEFAULT '',
 source_tag TEXT NOT NULL DEFAULT '', source_serial TEXT NOT NULL DEFAULT '', source_employee TEXT NOT NULL DEFAULT '',
 reason TEXT NOT NULL DEFAULT '', allocated_to TEXT NOT NULL DEFAULT '',
 source_sheet TEXT NOT NULL, source_row INTEGER NOT NULL, source_payload TEXT NOT NULL,
 review_note TEXT NOT NULL DEFAULT '', imported_at TEXT NOT NULL
);
CREATE INDEX asset_movements_asset ON asset_movements(asset_id,occurred_on);
CREATE INDEX asset_movements_employee ON asset_movements(employee_id,occurred_on);
