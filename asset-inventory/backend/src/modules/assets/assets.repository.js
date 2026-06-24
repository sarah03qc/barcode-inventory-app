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

// Upsert por lotes de activos usando asset_number como llave unica global.
//
// Si el asset_number ya existe en la BD (de una carga anterior), se
// actualizan sus datos del Excel (description, responsible, functional_center,
// dependency, metadata, upload_batch_id) con la version mas reciente del
// archivo. El upload_batch_id tambien se actualiza al batch nuevo, porque
// representa cual fue la carga mas reciente que trajo esta informacion.
//
// Los campos de trazabilidad de escaneo real (last_scanned_at, last_scanned_by,
// last_scanned_location, last_scan_session_id) NUNCA se tocan aqui. Esos
// solo se actualizan cuando ocurre un escaneo fisico real con la app,
// nunca por una carga de archivo.
//
// Si el asset_number no existe, se inserta como activo nuevo con los
// campos de trazabilidad en null (todavia no ha sido escaneado).
//
// Con 7 columnas por fila el maximo seguro es ~9285 filas por lote.
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
  const upserted = [];

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
       ON CONFLICT (asset_number) DO UPDATE SET
         description        = EXCLUDED.description,
         responsible        = EXCLUDED.responsible,
         functional_center  = EXCLUDED.functional_center,
         dependency         = EXCLUDED.dependency,
         metadata           = EXCLUDED.metadata,
         upload_batch_id    = EXCLUDED.upload_batch_id
       RETURNING id`,
      params,
    );

    upserted.push(...rows);
  }

  return upserted;
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

// retorna el batch mas reciente en estado done
async function findActiveBatch() {
  const { rows } = await pool.query(
    `SELECT * FROM upload_batches
     WHERE status = 'done'
     ORDER BY uploaded_at DESC
     LIMIT 1`
  );
  return rows[0] || null;
}

// actualiza la trazabilidad de la ultima lectura fisica de un activo.
// se llama unicamente cuando un escaneo resulta en located o external
// de otra sede. Siempre sobrescribe con los datos del escaneo mas
// reciente, sin importar la sesion anterior que pudo haberlo escaneado.
async function updateLastScan(assetId, { sessionId, custodian, location, scannedAt }) {
  const { rows } = await pool.query(
    `UPDATE assets
     SET last_scanned_at = $1,
         last_scanned_by = $2,
         last_scanned_location = $3,
         last_scan_session_id = $4
     WHERE id = $5
     RETURNING *`,
    [scannedAt, custodian, location, sessionId, assetId],
  );
  return rows[0];
}

// busca un activo por numero de placa en TODA la tabla, sin filtrar
// por batch. El batch ya no determina pertenencia ni busqueda real,
// solo sirve como registro historico de cuando se cargo cada archivo.
async function findByAssetNumberGlobal(assetNumber) {
  const { rows } = await pool.query(
    `SELECT * FROM assets WHERE asset_number = $1 LIMIT 1`,
    [assetNumber],
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
  findActiveBatch,
  updateLastScan,
  findByAssetNumberGlobal,
};