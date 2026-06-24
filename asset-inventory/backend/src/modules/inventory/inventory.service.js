const inventoryRepo = require('./inventory.repository');
const assetsRepo = require('../assets/assets.repository');
const { isOtherCampus } = require('../../shared/utils/textNormalize');

// Crea una sesion nueva validando que el batch exista y este en estado done
async function createSession({ location, custodian, upload_batch_id }) {
  if (!location || !custodian || !upload_batch_id) {
    throw { status: 400, message: 'location, custodian y upload_batch_id son requeridos' };
  }

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

// Registra un escaneo aplicando la logica de clasificacion real del negocio.
//
// La pertenencia de un activo NUNCA se determina por el batch en el que
// fue cargado. El batch es solo metadata de carga, sin significado para
// el usuario final. La pertenencia real se determina asi:
//
//   1. duplicate                       - el codigo ya fue escaneado antes en esta sesion
//   2. external, reason = unknown      - el codigo no existe en ningun lado de la BD
//   3. external, reason = other_campus - el codigo existe pero su functional_center
//                                        indica una sede distinta a Alajuela
//   4. located                         - el codigo existe y pertenece a Alajuela
//                                        (o no se puede determinar la sede, en cuyo
//                                        caso se asume propio)
//
// Tanto located como external de otra sede actualizan la trazabilidad del
// activo (ultima lectura), porque ambos fueron fisicamente encontrados
// durante el inventario. Solo el codigo completamente desconocido no
// tiene un activo al cual actualizarle nada.
async function registerScan(sessionId, scanned_code) {
  if (!scanned_code) {
    throw { status: 400, message: 'scanned_code es requerido' };
  }

  scanned_code = scanned_code.trim();

  const session = await inventoryRepo.findSessionById(sessionId);
  if (!session) {
    throw { status: 404, message: `Sesion ${sessionId} no encontrada` };
  }
  if (session.status === 'closed') {
    throw { status: 409, message: 'No se puede escanear en una sesion cerrada' };
  }

  // Duplicado: ya fue escaneado en esta misma sesion
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

  // Busqueda GLOBAL del activo, sin filtrar por batch
  const asset = await assetsRepo.findByAssetNumberGlobal(scanned_code);

  // Caso: codigo completamente desconocido, no existe en ningun lado
  if (!asset) {
    const scan = await inventoryRepo.insertScan({
      session_id: sessionId,
      scanned_code,
      asset_id: null,
      scan_type: 'external',
      external_reason: 'unknown',
    });
    return {
      ...scan,
      message: 'Codigo desconocido, no existe ningun activo con ese numero',
    };
  }

  // El activo existe. Determinar si pertenece a otra sede.
  const otherCampus = isOtherCampus(asset.functional_center);
  const scanType = otherCampus ? 'external' : 'located';

  const scan = await inventoryRepo.insertScan({
    session_id: sessionId,
    scanned_code,
    asset_id: asset.id,
    scan_type: scanType,
    external_reason: otherCampus ? 'other_campus' : null,
  });

  // Tanto located como external de otra sede actualizan la trazabilidad,
  // porque en ambos casos el activo fue fisicamente encontrado.
  const updatedAsset = await assetsRepo.updateLastScan(asset.id, {
    sessionId,
    custodian: session.custodian,
    location: session.location,
    scannedAt: scan.scanned_at,
  });

  if (otherCampus) {
    return {
      ...scan,
      asset: updatedAsset,
      message: `Activo de otra sede (${asset.functional_center}), encontrado en Alajuela`,
    };
  }

  return { ...scan, asset: updatedAsset };
}

module.exports = {
  createSession,
  getSession,
  closeSession,
  registerScan,
};