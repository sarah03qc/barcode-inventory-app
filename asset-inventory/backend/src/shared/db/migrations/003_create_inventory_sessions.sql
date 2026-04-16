CREATE TABLE IF NOT EXISTS inventory_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  location         TEXT        NOT NULL,
  custodian        TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active', 'closed')),
  upload_batch_id  UUID        NOT NULL REFERENCES upload_batches(id) ON DELETE RESTRICT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at        TIMESTAMPTZ
);
