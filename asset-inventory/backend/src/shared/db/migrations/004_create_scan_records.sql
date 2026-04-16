CREATE TABLE IF NOT EXISTS scan_records (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID        NOT NULL REFERENCES inventory_sessions(id) ON DELETE CASCADE,
  scanned_code  TEXT        NOT NULL,
  asset_id      UUID        REFERENCES assets(id) ON DELETE SET NULL,
  scan_type     TEXT        NOT NULL
                            CHECK (scan_type IN ('located', 'external', 'duplicate')),
  scanned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_records_session_id    ON scan_records (session_id);
CREATE INDEX IF NOT EXISTS idx_scan_records_scanned_code  ON scan_records (scanned_code);
