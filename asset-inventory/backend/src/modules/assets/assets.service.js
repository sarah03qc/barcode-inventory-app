const path = require('path');
const parseExcel = require('../../shared/parsers/excelParser');
const parseCsv = require('../../shared/parsers/csvParser');
const repository = require('./assets.repository');

const EXCEL_MIMES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

function detectFormat(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (['.xlsx', '.xls', '.xlsm'].includes(ext)) return 'excel';
  if (ext === '.csv') return 'csv';
  if (EXCEL_MIMES.has(file.mimetype)) return 'excel';
  if (file.mimetype.startsWith('text/')) return 'csv';
  throw Object.assign(new Error('Unsupported file format'), { statusCode: 422 });
}

// orquesta la carga completa: parseo → batch → insert → cierre
async function uploadAssets(file) {
  const format = detectFormat(file);
  const rows = format === 'excel'
    ? await parseExcel(file.buffer)
    : await parseCsv(file.buffer);

  const valid = rows.filter(r => r.asset_number);
  if (!valid.length) {
    throw Object.assign(
      new Error('No valid records found — ensure the file has an "asset_number" column'),
      { statusCode: 422 },
    );
  }

  const batch = await repository.createBatch(file.originalname, valid.length);

  try {
    await repository.insertAssets(valid, batch.id);
    return await repository.updateBatchStatus(batch.id, 'done');
  } catch (err) {
    await repository.updateBatchStatus(batch.id, 'error');
    throw err;
  }
}

// retorna todos los activos de un batch
async function getAssetsByBatch(batchId) {
  return repository.listByBatch(batchId);
}

// retorna el batch activo (ultimo en estado done)
async function getActiveBatch() {
  const batch = await repository.findActiveBatch();
  if (!batch) {
    throw Object.assign(
      new Error('No hay ningun batch activo. Carga un archivo primero.'),
      { statusCode: 404 },
    );
  }
  return batch;
}

// busca un activo por número dentro de un batch, lanza 404 si no existe
async function findAsset(assetNumber, batchId) {
  const asset = await repository.findByAssetNumber(assetNumber, batchId);
  if (!asset) {
    throw Object.assign(
      new Error(`Asset "${assetNumber}" not found in batch ${batchId}`),
      { statusCode: 404 },
    );
  }
  return asset;
}

module.exports = { uploadAssets, getAssetsByBatch, findAsset, getActiveBatch };
