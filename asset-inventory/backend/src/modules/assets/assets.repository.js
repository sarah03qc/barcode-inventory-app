const { pool } = require('../../shared/db/connection');

// inserta un nuevo batch en estado 'processing' y retorna el registro creado
async function createBatch(filename, totalRecords) {
  const { rows } = await pool.query(
    `INSERT INTO upload_batches (filename, total_records, status)
     VALUES ($1, $2, 'processing')
     RETURNING *`,
    [filename, totalRecords],
  );
  return rows[0];
}

// bulk insert de todos los activos en una sola query parametrizada
async function insertAssets(assets, batchId) {
  if (!assets.length) return [];

  const cols = [
    'asset_number',
    'description',
    'responsible',
    'functional_center',
    'dependency',
    'metadata',
    'upload_batch_id',
  ];
  const perRow = cols.length;

  // construye ($1,$2,...,$7), ($8,...,$14), ...
  const placeholders = assets.map((_, i) =>
    `(${cols.map((_, j) => `$${i * perRow + j + 1}`).join(', ')})`,
  );

  const params = assets.flatMap(asset => [
    asset.asset_number,
    asset.description ?? null,
    asset.responsible ?? null,
    asset.functional_center ?? null,
    asset.dependency ?? null,
    asset.metadata ? JSON.stringify(asset.metadata) : null,
    batchId,
  ]);

  const { rows } = await pool.query(
    `INSERT INTO assets (${cols.join(', ')})
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (asset_number, upload_batch_id) DO NOTHING
     RETURNING id`,
    params,
  );
  return rows;
}

// actualiza el status del batch y retorna el registro actualizado
async function updateBatchStatus(batchId, status) {
  const { rows } = await pool.query(
    `UPDATE upload_batches SET status = $1 WHERE id = $2 RETURNING *`,
    [status, batchId],
  );
  return rows[0];
}

// busca un activo por número dentro de un batch específico
async function findByAssetNumber(assetNumber, batchId) {
  const { rows } = await pool.query(
    `SELECT * FROM assets WHERE asset_number = $1 AND upload_batch_id = $2`,
    [assetNumber, batchId],
  );
  return rows[0] || null;
}

// retorna todos los activos de un batch ordenados por número
async function listByBatch(batchId) {
  const { rows } = await pool.query(
    `SELECT * FROM assets WHERE upload_batch_id = $1 ORDER BY asset_number`,
    [batchId],
  );
  return rows;
}

module.exports = { createBatch, insertAssets, updateBatchStatus, findByAssetNumber, listByBatch };
