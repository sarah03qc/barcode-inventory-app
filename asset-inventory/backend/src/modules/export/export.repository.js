const { pool } = require('../../shared/db/connection');

// Trae cada scan de la sesion (located/external/duplicate) junto con
// el custodio/ubicacion de ESTA sesion, y por separado el escaneo
// located mas reciente del mismo activo ANTES de esta sesion (si existe).
// Esto permite comparar "quien lo tenia antes" vs "quien lo encontro ahora",
// que es la comparacion realmente util, en vez de comparar el dato actual
// contra si mismo cuando la sesion consultada es la mas reciente.
async function findSessionScansForExport(sessionId) {
  const { rows } = await pool.query(
    `SELECT
       sr.scanned_code,
       sr.scan_type,
       sr.external_reason,
       sr.scanned_at         AS session_scanned_at,
       isess.custodian       AS session_custodian,
       isess.location        AS session_location,
       a.asset_number,
       a.description,
       a.responsible,
       a.functional_center,
       prev.custodian        AS previous_custodian,
       prev.location         AS previous_location,
       prev_scan.scanned_at  AS previous_scanned_at
     FROM scan_records sr
     JOIN inventory_sessions isess ON isess.id = sr.session_id
     LEFT JOIN assets a ON a.id = sr.asset_id
     -- escaneo located mas reciente del mismo activo antes de esta sesion
     LEFT JOIN LATERAL (
       SELECT sr2.scanned_at, sr2.session_id
       FROM scan_records sr2
       WHERE sr2.asset_id = sr.asset_id
         AND sr2.scan_type = 'located'
         AND sr2.scanned_at < sr.scanned_at
       ORDER BY sr2.scanned_at DESC
       LIMIT 1
     ) prev_scan ON sr.asset_id IS NOT NULL
     LEFT JOIN inventory_sessions prev ON prev.id = prev_scan.session_id
     WHERE sr.session_id = $1
     ORDER BY sr.scanned_at`,
    [sessionId]
  );
  return rows;
}

// Activos del batch de la sesion que nunca tuvieron un scan located.
// Se incluye tambien su ultimo escaneo real conocido (puede ser de
// cualquier sesion anterior, o ninguno si nunca fue escaneado).
async function findMissingForExport(sessionId, uploadBatchId) {
  const { rows } = await pool.query(
    `SELECT a.asset_number, a.description, a.responsible,
            a.functional_center, a.last_scanned_at,
            a.last_scanned_by, a.last_scanned_location
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

module.exports = { findSessionScansForExport, findMissingForExport };