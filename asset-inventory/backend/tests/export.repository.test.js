const { pool, runMigrations, truncateAll, seedBatch, seedAsset, seedSession } = require('./setupTestDb');
const inventoryRepo = require('../src/modules/inventory/inventory.repository');
const repo = require('../src/modules/export/export.repository');

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await pool.end();
});

describe('findSessionScansForExport', () => {
  test('trae el escaneo located anterior correcto, excluyendo la sesion actual', async () => {
    const batch = await seedBatch();
    const asset = await seedAsset(batch.id, { asset_number: '1' });

    const oldSession = await seedSession(batch.id, { custodian: 'Custodio Viejo', location: 'Lugar Viejo' });
    await inventoryRepo.insertScan({ session_id: oldSession.id, scanned_code: '1', asset_id: asset.id, scan_type: 'located' });

    await new Promise(r => setTimeout(r, 10));

    const newSession = await seedSession(batch.id, { custodian: 'Custodio Nuevo', location: 'Lugar Nuevo' });
    await inventoryRepo.insertScan({ session_id: newSession.id, scanned_code: '1', asset_id: asset.id, scan_type: 'located' });

    const rows = await repo.findSessionScansForExport(newSession.id);
    expect(rows[0].previous_custodian).toBe('Custodio Viejo');
    expect(rows[0].session_custodian).toBe('Custodio Nuevo');
  });

  test('sin escaneo anterior, previous_custodian es null', async () => {
    const batch = await seedBatch();
    const asset = await seedAsset(batch.id, { asset_number: '2' });
    const session = await seedSession(batch.id);

    await inventoryRepo.insertScan({ session_id: session.id, scanned_code: '2', asset_id: asset.id, scan_type: 'located' });

    const rows = await repo.findSessionScansForExport(session.id);
    expect(rows[0].previous_custodian).toBeNull();
  });
});

describe('findMissingForExport', () => {
  test('solo trae activos del batch sin located en esa sesion', async () => {
    const batch = await seedBatch();
    const session = await seedSession(batch.id);
    await seedAsset(batch.id, { asset_number: 'missing-1' });

    const rows = await repo.findMissingForExport(session.id, batch.id);
    expect(rows.length).toBe(1);
    expect(rows[0].asset_number).toBe('missing-1');
  });
});