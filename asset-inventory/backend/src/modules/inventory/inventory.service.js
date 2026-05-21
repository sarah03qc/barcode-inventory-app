const inventoryRepo = require('./inventory.repository');
const assetsRepo = require('../assets/assets.repository');

// Crea una sesion nueva validando que el batch exista y este en estado done
async function createSession({ location, custodian, upload_batch_id }) {
  if (!location || !custodian || !upload_batch_id) {
    throw { status: 400, message: 'location, custodian y upload_batch_id son requeridos' };
  }

  // Valida que el batch exista antes de asociar la sesion
  const batch = await assetsRepo.findBatchById(upload_batch_id);
  if (!batch) {
    throw { status: 404, message: `Batch ${upload_batch_id} no encontrado` };
  }
  if (batch.status !== 'done') {
    throw { status: 409, message: `El batch no esta en estado done (estado actual: ${batch.status})` };
  }

  return inventoryRepo.createSession({ location, custodian, upload_batch_id });
}

// Retorna una sesion o lanza 404 si no existe
async function getSession(sessionId) {
  const session = await inventoryRepo.findSessionById(sessionId);
  if (!session) {
    throw { status: 404, message: `Sesion ${sessionId} no encontrada` };
  }
  return session;
}

// Cierra una sesion activa
async function closeSession(sessionId) {
  const session = await inventoryRepo.findSessionById(sessionId);
  if (!session) {
    throw { status: 404, message: `Sesion ${sessionId} no encontrada` };
  }
  if (session.status === 'closed') {
    throw { status: 409, message: 'La sesion ya esta cerrada' };
  }

  const closed = await inventoryRepo.closeSession(sessionId);
  return closed;
}

// Registra un escaneo aplicando la logica de clasificacion
// Tipos posibles: located (placa encontrada en el batch), external (placa no existe), duplicate (ya escaneada)
async function registerScan(sessionId, scanned_code) {
  if (!scanned_code) {
    throw { status: 400, message: 'scanned_code es requerido' };
  }

  const session = await inventoryRepo.findSessionById(sessionId);
  if (!session) {
    throw { status: 404, message: `Sesion ${sessionId} no encontrada` };
  }
  if (session.status === 'closed') {
    throw { status: 409, message: 'No se puede escanear en una sesion cerrada' };
  }

  // Si el codigo ya fue escaneado en esta sesion se marca como duplicado
  const duplicate = await inventoryRepo.findDuplicateScan(sessionId, scanned_code);
  if (duplicate) {
    const scan = await inventoryRepo.insertScan({
      session_id: sessionId,
      scanned_code,
      asset_id: null,
      scan_type: 'duplicate',
    });
    return { ...scan, message: 'Codigo duplicado en esta sesion' };
  }

  // Busca el activo en el batch asociado a la sesion
  const asset = await assetsRepo.findByAssetNumber(
    scanned_code,
    session.upload_batch_id
  );

  if (asset) {
    // Placa encontrada en el inventario del batch
    const scan = await inventoryRepo.insertScan({
      session_id: sessionId,
      scanned_code,
      asset_id: asset.id,
      scan_type: 'located',
    });
    return { ...scan, asset };
  }

  // Placa no existe en el batch, se registra como externa
  const scan = await inventoryRepo.insertScan({
    session_id: sessionId,
    scanned_code,
    asset_id: null,
    scan_type: 'external',
  });
  return { ...scan, message: 'Codigo no encontrado en el inventario del batch' };
}

module.exports = {
  createSession,
  getSession,
  closeSession,
  registerScan,
};