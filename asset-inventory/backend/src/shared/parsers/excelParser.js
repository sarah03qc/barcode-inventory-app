const ExcelJS = require('exceljs');

const COLUMN_MAP = {
  placa:                    'asset_number',
  descripcion:              'description',
  responsable:              'responsible',
  centro_funcional_sistema: 'functional_center',
};

const KNOWN_FIELDS = new Set(Object.values(COLUMN_MAP));

function normalizeKey(raw) {
  if (raw === null || raw === undefined) return '';
  return String(raw)
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function cellValue(val) {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'object') {
    if (val.result !== undefined) return val.result;
    if (val.richText) return val.richText.map(r => r.text).join('');
    return String(val);
  }
  return val;
}

function cleanAssetNumber(val) {
  if (!val) return null;
  return String(val).replace(/^'+/, '').trim();
}

function isSubheaderRow(cells, headers) {
  return cells.some(c => normalizeKey(String(c || '')) === 'placa');
}

async function parseExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('El archivo Excel no tiene hojas de cálculo');

  let headerRowIndex = -1;
  let headers = [];

  sheet.eachRow((row, rowNum) => {
    if (headerRowIndex !== -1) return;

    // Leer celda por celda para no perderse columnas que row.values omite
    const cells = [];
    for (let col = 1; col <= 20; col++) {
      cells.push(cellValue(row.getCell(col).value));
    }
    const normalized = cells.map(normalizeKey);

    // "placa" debe estar en la segunda columna (índice 1 = columna B)
    if (normalized[1] === 'placa' && normalized[3] === 'responsable')  {
      headerRowIndex = rowNum;
      headers = normalized;

      // LOG TEMPORAL — diagnóstico de headers
      console.log('=== HEADERS ENCONTRADOS ===');
      console.log('Fila:', rowNum);
      console.log('Raw values:', cells);
      console.log('Normalizados:', normalized);
      console.log('===========================');
    }
  });

  if (headerRowIndex === -1) {
    throw new Error('No se encontró la columna PLACA en el archivo. Verificar el formato.');
  }

  const assets = [];

  sheet.eachRow((row, rowNum) => {
    if (rowNum <= headerRowIndex) return;

    // Leer celda por celda igual que en fase 1
    const cells = [];
    for (let col = 1; col <= 20; col++) {
      cells.push(cellValue(row.getCell(col).value));
    }

    if (cells.every(c => c === null || c === '')) return;

    if (isSubheaderRow(cells, headers)) return;

    const asset = {};
    const metadata = {};

    headers.forEach((normalizedHeader, i) => {
      if (!normalizedHeader) return;

      const rawVal = cells[i] ?? null;
      const val = rawVal !== null && rawVal !== '' ? rawVal : null;

      const mappedField = COLUMN_MAP[normalizedHeader];
      if (mappedField) {
        asset[mappedField] = val !== null ? String(val).trim() : null;
      } else {
        metadata[normalizedHeader] = val;
      }
    });

    if (asset.asset_number) {
      asset.asset_number = cleanAssetNumber(asset.asset_number);
    }

    if (!asset.asset_number) return;

    asset.metadata = Object.keys(metadata).length ? metadata : null;
    assets.push(asset);
  });

  return assets;
}

module.exports = parseExcel;