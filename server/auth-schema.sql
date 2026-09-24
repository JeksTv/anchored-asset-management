CREATE TABLE IF NOT EXISTS app_users(id TEXT PRIMARY KEY NOT NULL,username TEXT NOT NULL UNIQUE COLLATE NOCASE,email TEXT NOT NULL DEFAULT '',name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('super_admin','admin','user')),employee_id TEXT UNIQUE REFERENCES employees(id),password_hash TEXT NOT NULL,active INTEGER NOT NULL DEFAULT 1,must_change_password INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS app_sessions(token_hash TEXT PRIMARY KEY NOT NULL,user_id TEXT NOT NULL REFERENCES app_users(id),expires_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS app_sessions_user ON app_sessions(user_id);
CREATE TABLE IF NOT EXISTS auth_limits(key TEXT PRIMARY KEY NOT NULL,window_start INTEGER NOT NULL,attempts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS security_events(id TEXT PRIMARY KEY NOT NULL,actor_id TEXT,action TEXT NOT NULL,target_id TEXT,created_at TEXT NOT NULL);
