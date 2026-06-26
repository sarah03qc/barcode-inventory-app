const { pool, runMigrations, truncateAll, seedBatch, seedAsset, seedSession } = require('./setupTestDb');
const inventoryRepo = require('../src/modules/inventory/inventory.repository');
const repo = require('../src/modules/reports/reports.repository');

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await pool.end();
});

describe('findLocated', () => {
  test('solo trae scans located de la sesion especificada', async () => {
    const batch = await seedBatch();
    const session = await seedSession(batch.id);
    const otherSession = await seedSession(batch.id);
    const asset = await seedAsset(batch.id, { asset_number: '1' });
    const otherAsset = await seedAsset(batch.id, { asset_number: '2' });

    await inventoryRepo.insertScan({ session_id: session.id, scanned_code: '1', asset_id: asset.id, scan_type: 'located' });
    await inventoryRepo.insertScan({ session_id: otherSession.id, scanned_code: '2', asset_id: otherAsset.id, scan_type: 'located' });

    const located = await repo.findLocated(session.id);
    expect(located.length).toBe(1);
    expect(located[0].asset_number).toBe('1');
  });

  test('con multiples located del mismo activo, retorna solo el mas reciente', async () => {
    const batch = await seedBatch();
    const session = await seedSession(batch.id);
    const asset = await seedAsset(batch.id, { asset_number: '5' });

    await inventoryRepo.insertScan({ session_id: session.id, scanned_code: '5', asset_id: asset.id, scan_type: 'located' });
    await new Promise(r => setTimeout(r, 10));
    await inventoryRepo.insertScan({ session_id: session.id, scanned_code: '5', asset_id: asset.id, scan_type: 'located' });

    const located = await repo.findLocated(session.id);
    expect(located.length).toBe(1);
  });
});

describe('findMissing', () => {
  test('excluye activos ya ubicados, solo del batch correcto', async () => {
    const batch = await seedBatch();
    const session = await seedSession(batch.id);
    const located = await seedAsset(batch.id, { asset_number: 'A' });
    const missing = await seedAsset(batch.id, { asset_number: 'B' });

    await inventoryRepo.insertScan({ session_id: session.id, scanned_code: 'A', asset_id: located.id, scan_type: 'located' });

    const result = await repo.findMissing(session.id, batch.id);
    expect(result.map(r => r.asset_number)).toEqual(['B']);
  });
});

describe('findExternal', () => {
  test('trae todos los external sin importar external_reason', async () => {
    const batch = await seedBatch();
    const session = await seedSession(batch.id);

    await inventoryRepo.insertScan({ session_id: session.id, scanned_code: 'X', asset_id: null, scan_type: 'external', external_reason: 'unknown' });
    await inventoryRepo.insertScan({ session_id: session.id, scanned_code: 'Y', asset_id: null, scan_type: 'external', external_reason: 'other_campus' });

    const result = await repo.findExternal(session.id);
    expect(result.length).toBe(2);
  });
});

describe('countLocated', () => {
  test('cuenta activos distintos, no registros duplicados', async () => {
    const batch = await seedBatch();
    const session = await seedSession(batch.id);
    const asset = await seedAsset(batch.id, { asset_number: 'Z' });

    await inventoryRepo.insertScan({ session_id: session.id, scanned_code: 'Z', asset_id: asset.id, scan_type: 'located' });

    const count = await repo.countLocated(session.id);
    expect(count).toBe(1);
  });
});

describe('countTotalInBatch', () => {
  test('cuenta correctamente por upload_batch_id', async () => {
    const batch = await seedBatch();
    await seedAsset(batch.id, { asset_number: '1' });
    await seedAsset(batch.id, { asset_number: '2' });

    const count = await repo.countTotalInBatch(batch.id);
    expect(count).toBe(2);
  });
});