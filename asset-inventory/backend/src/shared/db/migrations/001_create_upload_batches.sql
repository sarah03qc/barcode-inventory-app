CREATE TABLE IF NOT EXISTS upload_batches (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  filename       TEXT        NOT NULL,
  total_records  INTEGER     NOT NULL DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'processing', 'done', 'error')),
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
