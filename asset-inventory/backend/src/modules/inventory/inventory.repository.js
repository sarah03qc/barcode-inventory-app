const { pool } = require('../../shared/db/connection');

// Crea una nueva sesion de inventario y la retorna completa
async function createSession({ location, custodian, upload_batch_id }) {
  const { rows } = await pool.query(
    `INSERT INTO inventory_sessions (location, custodian, upload_batch_id)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [location, custodian, upload_batch_id]
  );
  return rows[0];
}

// Busca una sesion por su ID
async function findSessionById(sessionId) {
  const { rows } = await pool.query(
    `SELECT * FROM inventory_sessions WHERE id = $1`,
    [sessionId]
  );
  return rows[0] || null;
}

// Cierra una sesion activa registrando la hora de cierre
async function closeSession(sessionId) {
  const { rows } = await pool.query(
    `UPDATE inventory_sessions
     SET status = 'closed', closed_at = NOW()
     WHERE id = $1 AND status = 'active'
     RETURNING *`,
    [sessionId]
  );
  return rows[0] || null;
}

// Inserta un registro de escaneo y retorna la fila creada.
// external_reason solo aplica cuando scan_type = 'external', distingue
// entre codigo desconocido ('unknown') y activo de otra sede ('other_campus').
// Para located y duplicate se pasa null.
async function insertScan({ session_id, scanned_code, asset_id, scan_type, external_reason = null }) {
  const { rows } = await pool.query(
    `INSERT INTO scan_records (session_id, scanned_code, asset_id, scan_type, external_reason)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [session_id, scanned_code, asset_id, scan_type, external_reason]
  );
  return rows[0];
}

// Verifica si un codigo ya fue escaneado en la sesion activa
async function findDuplicateScan(session_id, scanned_code) {
  const { rows } = await pool.query(
    `SELECT id FROM scan_records
     WHERE session_id = $1 AND scanned_code = $2
     LIMIT 1`,
    [session_id, scanned_code]
  );
  return rows[0] || null;
}

module.exports = {
  createSession,
  findSessionById,
  closeSession,
  insertScan,
  findDuplicateScan,
};