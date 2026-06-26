const { pool, runMigrations, truncateAll, seedBatch, seedAsset, seedSession } = require('./setupTestDb');
const repo = require('../src/modules/inventory/inventory.repository');

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await pool.end();
});

describe('insertScan', () => {
  test('guarda external_reason cuando se provee', async () => {
    const batch = await seedBatch();
    const session = await seedSession(batch.id);

    const scan = await repo.insertScan({
      session_id: session.id,
      scanned_code: '999',
      asset_id: null,
      scan_type: 'external',
      external_reason: 'unknown',
    });

    expect(scan.external_reason).toBe('unknown');
  });

  test('external_reason es null para located por defecto', async () => {
    const batch = await seedBatch();
    const session = await seedSession(batch.id);
    const asset = await seedAsset(batch.id);

    const scan = await repo.insertScan({
      session_id: session.id,
      scanned_code: asset.asset_number,
      asset_id: asset.id,
      scan_type: 'located',
    });

    expect(scan.external_reason).toBeNull();
  });
});

describe('findDuplicateScan', () => {
  test('detecta un codigo ya escaneado en la misma sesion', async () => {
    const batch = await seedBatch();
    const session = await seedSession(batch.id);

    await repo.insertScan({
      session_id: session.id,
      scanned_code: '123',
      asset_id: null,
      scan_type: 'external',
      external_reason: 'unknown',
    });

    const duplicate = await repo.findDuplicateScan(session.id, '123');
    expect(duplicate).not.toBeNull();
  });

  test('NO detecta como duplicado el mismo codigo en una sesion distinta', async () => {
    const batch = await seedBatch();
    const session1 = await seedSession(batch.id);
    const session2 = await seedSession(batch.id);

    await repo.insertScan({
      session_id: session1.id,
      scanned_code: '456',
      asset_id: null,
      scan_type: 'external',
      external_reason: 'unknown',
    });

    const duplicate = await repo.findDuplicateScan(session2.id, '456');
    expect(duplicate).toBeNull();
  });
});

describe('closeSession', () => {
  test('cierra una sesion activa y setea closed_at', async () => {
    const batch = await seedBatch();
    const session = await seedSession(batch.id);

    const closed = await repo.closeSession(session.id);
    expect(closed.status).toBe('closed');
    expect(closed.closed_at).not.toBeNull();
  });

  test('retorna null si la sesion ya estaba cerrada', async () => {
    const batch = await seedBatch();
    const session = await seedSession(batch.id);
    await repo.closeSession(session.id);

    const secondAttempt = await repo.closeSession(session.id);
    expect(secondAttempt).toBeNull();
  });
});