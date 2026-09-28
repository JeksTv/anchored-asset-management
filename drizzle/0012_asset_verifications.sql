CREATE TABLE asset_verifications (
 id TEXT PRIMARY KEY, asset_id TEXT NOT NULL REFERENCES assets(id),
 expected TEXT NOT NULL, observed TEXT NOT NULL, discrepancies TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('Verified','Open','Resolved')),
 checked_at TEXT NOT NULL, checked_by TEXT NOT NULL, checked_by_name TEXT NOT NULL,
 resolution TEXT NOT NULL DEFAULT '', resolved_at TEXT, resolved_by TEXT
);
CREATE INDEX idx_verification_asset ON asset_verifications(asset_id,checked_at);
