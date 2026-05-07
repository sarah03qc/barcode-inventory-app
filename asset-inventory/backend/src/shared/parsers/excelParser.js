const ExcelJS = require('exceljs');

// campos que van como columnas directas en la tabla assets
const KNOWN_FIELDS = new Set(['asset_number', 'description', 'responsible', 'functional_center', 'dependency']);

// normaliza el header de la columna a snake_case sin acentos
function normalizeKey(raw) {
  if (!raw) return '';
  return String(raw)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

// extrae el valor plano de una celda (maneja fórmulas, rich text, fechas)
function cellValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') {
    if (val instanceof Date) return val.toISOString();
    if (val.result !== undefined) return val.result;       // formula
    if (val.richText) return val.richText.map(r => r.text).join('');
    return String(val);
  }
  return val;
}

async function parseExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('Excel file has no worksheets');

  const rows = [];
  let headers = [];

  sheet.eachRow((row, rowNum) => {
    // row.values es 1-based: el índice 0 es undefined
    const cells = row.values.slice(1).map(cellValue);

    if (rowNum === 1) {
      headers = cells.map(normalizeKey);
      return;
    }

    if (cells.every(c => c === null || c === '')) return; // fila vacía

    const asset = {};
    const metadata = {};

    headers.forEach((key, i) => {
      const val = cells[i] ?? null;
      if (!key) return;
      if (KNOWN_FIELDS.has(key)) {
        asset[key] = val !== null ? String(val) : null;
      } else {
        metadata[key] = val;
      }
    });

    asset.metadata = Object.keys(metadata).length ? metadata : null;
    rows.push(asset);
  });

  return rows;
}

module.exports = parseExcel;
