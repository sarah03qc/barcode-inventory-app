const { pool } = require('../../shared/db/connection');

// inserta un nuevo batch en estado processing y retorna el registro creado
async function createBatch(filename, totalRecords) {
  const { rows } = await pool.query(
    `INSERT INTO upload_batches (filename, total_records, status)
     VALUES ($1, $2, 'processing')
     RETURNING *`,
    [filename, totalRecords],
  );
  return rows[0];
}

// divide un array en sub-arrays de tamaño maximo chunkSize
// necesario porque PostgreSQL tiene un limite de 65535 parametros por query
function chunk(arr, chunkSize) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

// bulk insert por lotes para evitar el limite de parametros de PostgreSQL
// con 7 columnas por fila el maximo seguro es ~9285 filas por lote
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
  const chunkSize = Math.floor(65000 / perRow);

  const batches = chunk(assets, chunkSize);
  const inserted = [];

  for (const batch of batches) {
    const placeholders = batch.map((_, i) =>
      `(${cols.map((_, j) => `$${i * perRow + j + 1}`).join(', ')})`,
    );

    const params = batch.flatMap(asset => [
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

    inserted.push(...rows);
  }

  return inserted;
}

// actualiza el status del batch y retorna el registro actualizado
async function updateBatchStatus(batchId, status) {
  const { rows } = await pool.query(
    `UPDATE upload_batches SET status = $1 WHERE id = $2 RETURNING *`,
    [status, batchId],
  );
  return rows[0];
}

// busca un activo por numero dentro de un batch especifico
async function findByAssetNumber(assetNumber, batchId) {
  const { rows } = await pool.query(
    `SELECT * FROM assets WHERE asset_number = $1 AND upload_batch_id = $2`,
    [assetNumber, batchId],
  );
  return rows[0] || null;
}

// retorna todos los activos de un batch ordenados por numero
async function listByBatch(batchId) {
  const { rows } = await pool.query(
    `SELECT * FROM assets WHERE upload_batch_id = $1 ORDER BY asset_number`,
    [batchId],
  );
  return rows;
}

// busca un batch por ID, usado por inventory.service para validar existencia y estado
async function findBatchById(batchId) {
  const { rows } = await pool.query(
    `SELECT * FROM upload_batches WHERE id = $1`,
    [batchId]
  );
  return rows[0] || null;
}

module.exports = {
  createBatch,
  insertAssets,
  updateBatchStatus,
  findByAssetNumber,
  findBatchById,
  listByBatch,
};