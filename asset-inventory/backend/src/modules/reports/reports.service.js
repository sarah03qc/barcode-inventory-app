const reportsRepo   = require('./reports.repository');
const inventoryRepo = require('../inventory/inventory.repository');

// Valida que la sesion exista y retorna su registro completo
// Todos los reportes necesitan el upload_batch_id de la sesion
// para saber contra que batch comparar
async function getValidSession(sessionId) {
  const session = await inventoryRepo.findSessionById(sessionId);
  if (!session) {
    throw Object.assign(
      new Error(`Sesion ${sessionId} no encontrada`),
      { statusCode: 404 },
    );
  }
  return session;
}

// Reporte de activos ubicados durante la sesion
async function getLocatedReport(sessionId) {
  await getValidSession(sessionId);
  return reportsRepo.findLocated(sessionId);
}

// Reporte de activos del batch que no fueron escaneados
async function getMissingReport(sessionId) {
  const session = await getValidSession(sessionId);
  return reportsRepo.findMissing(sessionId, session.upload_batch_id);
}

// Reporte de codigos escaneados que no pertenecen al batch
async function getExternalReport(sessionId) {
  await getValidSession(sessionId);
  return reportsRepo.findExternal(sessionId);
}

// Estadisticas generales: totales y porcentaje de avance del inventario
async function getStats(sessionId) {
  const session = await getValidSession(sessionId);

  const [totalInBatch, located, external, duplicate] = await Promise.all([
    reportsRepo.countTotalInBatch(session.upload_batch_id),
    reportsRepo.countLocated(sessionId),
    reportsRepo.countByType(sessionId, 'external'),
    reportsRepo.countByType(sessionId, 'duplicate'),
  ]);

  const missing = totalInBatch - located;

  // porcentaje de avance del inventario, redondeado a 2 decimales
  // se protege contra division por cero si el batch no tiene activos
  const progressPercent = totalInBatch > 0
    ? Math.round((located / totalInBatch) * 10000) / 100
    : 0;

  return {
    session_id: sessionId,
    session_status: session.status,
    total_in_batch: totalInBatch,
    located,
    missing,
    external,
    duplicate,
    progress_percent: progressPercent,
  };
}

module.exports = {
  getLocatedReport,
  getMissingReport,
  getExternalReport,
  getStats,
};