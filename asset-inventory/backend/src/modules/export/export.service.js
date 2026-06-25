const ExcelJS = require('exceljs');
const exportRepo = require('./export.repository');
const inventoryRepo = require('../inventory/inventory.repository');

// Valida que la sesion exista y retorna su registro completo
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

// Aplica estilo de encabezado consistente a la fila de headers de una hoja
function styleHeaderRow(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E50A0' },
  };
  headerRow.alignment = { vertical: 'middle' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

// Ajusta automaticamente el ancho de cada columna segun su contenido,
// con un limite razonable para no generar columnas muy anchas
// por una sola celda con texto largo
function autoFitColumns(sheet) {
  sheet.columns.forEach((col) => {
    let maxLength = 10;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLength) maxLength = len;
    });
    col.width = Math.min(maxLength + 2, 50);
  });
}

// Construye el workbook completo con tres hojas: Resumen, Ubicados,
// Externos y No Ubicados. Toda la informacion proviene de queries ya
// verificadas en el modulo de reports, aqui solo se da formato y se
// distribuye en hojas separadas.
async function buildSessionWorkbook(sessionId) {
  const session = await getValidSession(sessionId);
  const scans = await exportRepo.findSessionScansForExport(sessionId);
  const missing = await exportRepo.findMissingForExport(sessionId, session.upload_batch_id);

  const located = scans.filter(s => s.scan_type === 'located');
  const external = scans.filter(s => s.scan_type === 'external');
  const duplicate = scans.filter(s => s.scan_type === 'duplicate');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Inventario de Activos';
  workbook.created = new Date();

  // --- Hoja Resumen ---
  const summary = workbook.addWorksheet('Resumen');
  summary.columns = [{ width: 30 }, { width: 30 }];
  summary.addRows([
    ['Sesion', sessionId],
    ['Ubicacion de la sesion', session.location],
    ['Custodio de la sesion', session.custodian],
    ['Estado', session.status],
    ['Iniciada', session.started_at],
    ['Cerrada', session.closed_at ?? 'N/A'],
    [],
    ['Total activos ubicados', located.length],
    ['Total activos no ubicados', missing.length],
    ['Total escaneos externos', external.length],
    ['Total escaneos duplicados', duplicate.length],
  ]);
  summary.getColumn(1).font = { bold: true };

// --- Hoja Ubicados ---
  const locatedSheet = workbook.addWorksheet('Ubicados');
  locatedSheet.columns = [
    { header: 'Placa',                       key: 'asset_number' },
    { header: 'Descripcion',                 key: 'description' },
    { header: 'Responsable (Excel)',         key: 'responsible' },
    { header: 'Centro Funcional',            key: 'functional_center' },
    { header: 'Custodio (esta sesion)',      key: 'session_custodian' },
    { header: 'Ubicacion (esta sesion)',     key: 'session_location' },
    { header: 'Escaneado en esta sesion',    key: 'session_scanned_at' },
    { header: 'Custodio (escaneo anterior)', key: 'previous_custodian' },
    { header: 'Ubicacion (escaneo anterior)',key: 'previous_location' },
    { header: 'Fecha escaneo anterior',      key: 'previous_scanned_at' },
  ];
  located.forEach(row => locatedSheet.addRow({
    ...row,
    previous_custodian: row.previous_custodian ?? 'Sin escaneo anterior',
    previous_location: row.previous_location ?? '—',
    previous_scanned_at: row.previous_scanned_at ?? '—',
  }));
  styleHeaderRow(locatedSheet);
  autoFitColumns(locatedSheet);

  // --- Hoja Externos ---
  const externalSheet = workbook.addWorksheet('Externos');
  externalSheet.columns = [
    { header: 'Codigo escaneado',     key: 'scanned_code' },
    { header: 'Motivo',               key: 'external_reason' },
    { header: 'Placa (si existe)',    key: 'asset_number' },
    { header: 'Descripcion',          key: 'description' },
    { header: 'Centro Funcional',     key: 'functional_center' },
    { header: 'Escaneado en sesion',  key: 'session_scanned_at' },
  ];
  external.forEach(row => externalSheet.addRow({
    ...row,
    external_reason: row.external_reason === 'other_campus'
      ? 'Otra sede'
      : 'Codigo desconocido',
  }));
  styleHeaderRow(externalSheet);
  autoFitColumns(externalSheet);

  // --- Hoja No Ubicados ---
  const missingSheet = workbook.addWorksheet('No Ubicados');
  missingSheet.columns = [
    { header: 'Placa',                    key: 'asset_number' },
    { header: 'Descripcion',              key: 'description' },
    { header: 'Responsable (Excel)',      key: 'responsible' },
    { header: 'Centro Funcional',         key: 'functional_center' },
    { header: 'Custodio (mas reciente)',  key: 'last_scanned_by' },
    { header: 'Ubicacion (mas reciente)', key: 'last_scanned_location' },
    { header: 'Ultimo escaneo real',      key: 'last_scanned_at' },
  ];
  missing.forEach(row => missingSheet.addRow(row));
  styleHeaderRow(missingSheet);
  autoFitColumns(missingSheet);

  return { workbook, session };
}

module.exports = { buildSessionWorkbook };