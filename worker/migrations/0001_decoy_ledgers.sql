CREATE TABLE IF NOT EXISTS decoy_ledgers (
  cache_key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  model TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_decoy_ledgers_expires_at
  ON decoy_ledgers (expires_at);
