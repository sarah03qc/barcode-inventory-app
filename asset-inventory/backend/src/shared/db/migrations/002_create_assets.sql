CREATE TABLE IF NOT EXISTS assets (
  id                 UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_number       TEXT  NOT NULL,
  description        TEXT,
  responsible        TEXT,
  functional_center  TEXT,
  dependency         TEXT,
  metadata           JSONB,
  upload_batch_id    UUID  NOT NULL REFERENCES upload_batches(id) ON DELETE CASCADE,
  UNIQUE (asset_number, upload_batch_id)
);

CREATE INDEX IF NOT EXISTS idx_assets_asset_number     ON assets (asset_number);
CREATE INDEX IF NOT EXISTS idx_assets_upload_batch_id  ON assets (upload_batch_id);
