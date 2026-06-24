const { pool } = require('../../shared/db/connection');

// Activos escaneados y encontrados durante la sesion.
// Hace JOIN con assets para traer la descripcion completa del activo,
// y se queda solo con el escaneo mas reciente por activo (en caso de
// que se haya escaneado el mismo activo located varias veces)
async function findLocated(sessionId) {
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (sr.asset_id)
            sr.id, sr.scanned_code, sr.scanned_at,
            a.id AS asset_id, a.asset_number, a.description,
            a.responsible, a.functional_center, a.dependency, a.metadata
     FROM scan_records sr
     JOIN assets a ON a.id = sr.asset_id
     WHERE sr.session_id = $1 AND sr.scan_type = 'located'
     ORDER BY sr.asset_id, sr.scanned_at DESC`,
    [sessionId]
  );
  return rows;
}

// Activos que pertenecen al batch de la sesion pero que NUNCA
// fueron escaneados como located. Usa LEFT JOIN + WHERE IS NULL
// para encontrar los activos sin contraparte en scan_records
async function findMissing(sessionId, uploadBatchId) {
  const { rows } = await pool.query(
    `SELECT a.id, a.asset_number, a.description,
            a.responsible, a.functional_center, a.dependency, a.metadata
     FROM assets a
     LEFT JOIN scan_records sr
       ON sr.asset_id = a.id
       AND sr.session_id = $1
       AND sr.scan_type = 'located'
     WHERE a.upload_batch_id = $2
       AND sr.id IS NULL
     ORDER BY a.asset_number`,
    [sessionId, uploadBatchId]
  );
  return rows;
}

// Codigos escaneados que no pertenecen al batch de la sesion
// No requiere JOIN porque external nunca tiene asset_id asociado
async function findExternal(sessionId) {
  const { rows } = await pool.query(
    `SELECT id, scanned_code, scanned_at
     FROM scan_records
     WHERE session_id = $1 AND scan_type = 'external'
     ORDER BY scanned_at DESC`,
    [sessionId]
  );
  return rows;
}

// Cuenta total de activos en el batch asociado a la sesion
// Necesario para calcular el porcentaje de avance del inventario
async function countTotalInBatch(uploadBatchId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM assets WHERE upload_batch_id = $1`,
    [uploadBatchId]
  );
  return rows[0].total;
}

// Cuenta de activos distintos escaneados como located en la sesion
// Usa DISTINCT sobre asset_id porque un mismo activo puede tener
// multiples scan_records located si fue escaneado mas de una vez
// antes de ser detectado como duplicate
async function countLocated(sessionId) {
  const { rows } = await pool.query(
    `SELECT COUNT(DISTINCT asset_id)::int AS total
     FROM scan_records
     WHERE session_id = $1 AND scan_type = 'located'`,
    [sessionId]
  );
  return rows[0].total;
}

// Cuenta de escaneos external y duplicate (estos si se cuentan
// por registro, no por activo distinto, porque cada escaneo
// externo es un evento independiente que importa reportar)
async function countByType(sessionId, scanType) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM scan_records
     WHERE session_id = $1 AND scan_type = $2`,
    [sessionId, scanType]
  );
  return rows[0].total;
}

module.exports = {
  findLocated,
  findMissing,
  findExternal,
  countTotalInBatch,
  countLocated,
  countByType,
};