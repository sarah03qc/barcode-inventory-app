const { parse } = require('csv-parse/sync');

const KNOWN_FIELDS = new Set(['asset_number', 'description', 'responsible', 'functional_center', 'dependency']);

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

async function parseCsv(buffer) {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // maneja BOM de Excel al guardar como CSV
  });

  return records.map(record => {
    const asset = {};
    const metadata = {};

    for (const [rawKey, val] of Object.entries(record)) {
      const key = normalizeKey(rawKey);
      if (!key) continue;
      const normalized = val === '' ? null : val;
      if (KNOWN_FIELDS.has(key)) {
        asset[key] = normalized;
      } else {
        metadata[key] = normalized;
      }
    }

    asset.metadata = Object.keys(metadata).length ? metadata : null;
    return asset;
  });
}

module.exports = parseCsv;
