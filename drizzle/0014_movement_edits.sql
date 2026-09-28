ALTER TABLE asset_movements ADD COLUMN notes TEXT NOT NULL DEFAULT '';
ALTER TABLE asset_movements ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE movement_edits(id TEXT PRIMARY KEY,movement_id TEXT NOT NULL REFERENCES asset_movements(id),before_snapshot TEXT NOT NULL,after_snapshot TEXT NOT NULL,reason TEXT NOT NULL,actor_id TEXT NOT NULL,actor_name TEXT NOT NULL,created_at TEXT NOT NULL);
