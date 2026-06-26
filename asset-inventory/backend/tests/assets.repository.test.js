const { pool, runMigrations, truncateAll, seedBatch } = require('./setupTestDb');
const repo = require('../src/modules/assets/assets.repository');

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await pool.end();
});

describe('insertAssets (upsert)', () => {
  test('inserta un activo nuevo correctamente', async () => {
    const batch = await seedBatch();
    await repo.insertAssets([{ asset_number: '111', description: 'Item A' }], batch.id);

    const found = await repo.findByAssetNumberGlobal('111');
    expect(found.description).toBe('Item A');
  });

  test('hace upsert en vez de duplicar cuando el asset_number ya existe', async () => {
    const batch1 = await seedBatch();
    await repo.insertAssets([{ asset_number: '222', description: 'Version vieja' }], batch1.id);

    const batch2 = await seedBatch({ filename: 'segundo.xlsx' });
    await repo.insertAssets([{ asset_number: '222', description: 'Version nueva' }], batch2.id);

    const { rows } = await pool.query('SELECT * FROM assets WHERE asset_number = $1', ['222']);
    expect(rows.length).toBe(1);
    expect(rows[0].description).toBe('Version nueva');
  });

  test('el upsert actualiza upload_batch_id al batch mas reciente', async () => {
    const batch1 = await seedBatch();
    await repo.insertAssets([{ asset_number: '333', description: 'X' }], batch1.id);

    const batch2 = await seedBatch({ filename: 'nuevo.xlsx' });
    await repo.insertAssets([{ asset_number: '333', description: 'X' }], batch2.id);

    const found = await repo.findByAssetNumberGlobal('333');
    expect(found.upload_batch_id).toBe(batch2.id);
  });

  test('el upsert NUNCA sobrescribe las columnas de trazabilidad de escaneo', async () => {
    const batch = await seedBatch();
    await repo.insertAssets([{ asset_number: '444', description: 'Original' }], batch.id);

    const session = await pool.query(
      `INSERT INTO inventory_sessions (location, custodian, upload_batch_id)
       VALUES ('Lugar', 'Custodio Real', $1) RETURNING id`,
      [batch.id]
    );
    const asset = await repo.findByAssetNumberGlobal('444');
    await repo.updateLastScan(asset.id, {
      sessionId: session.rows[0].id,
      custodian: 'Custodio Real',
      location: 'Lugar',
      scannedAt: new Date(),
    });

    // recargar el mismo archivo de nuevo
    await repo.insertAssets([{ asset_number: '444', description: 'Recargado' }], batch.id);

    const after = await repo.findByAssetNumberGlobal('444');
    expect(after.description).toBe('Recargado');
    expect(after.last_scanned_by).toBe('Custodio Real');
  });
});

describe('findByAssetNumberGlobal', () => {
  test('encuentra un activo sin importar el batch', async () => {
    const batch = await seedBatch();
    await repo.insertAssets([{ asset_number: '555', description: 'Item' }], batch.id);
    const found = await repo.findByAssetNumberGlobal('555');
    expect(found).not.toBeNull();
  });

  test('retorna null si el activo no existe', async () => {
    const found = await repo.findByAssetNumberGlobal('no-existe-123');
    expect(found).toBeNull();
  });
});

describe('findActiveBatch', () => {
  test('retorna el batch mas reciente en estado done', async () => {
    await seedBatch({ filename: 'viejo.xlsx', status: 'done' });
    const reciente = await seedBatch({ filename: 'nuevo.xlsx', status: 'done' });

    const active = await repo.findActiveBatch();
    expect(active.id).toBe(reciente.id);
  });

  test('retorna null si no hay ningun batch en estado done', async () => {
    await seedBatch({ status: 'processing' });
    const active = await repo.findActiveBatch();
    expect(active).toBeNull();
  });
});

describe('updateLastScan', () => {
  test('actualiza los 4 campos de trazabilidad', async () => {
    const batch = await seedBatch();
    await repo.insertAssets([{ asset_number: '666', description: 'Item' }], batch.id);
    const asset = await repo.findByAssetNumberGlobal('666');

    const session = await pool.query(
      `INSERT INTO inventory_sessions (location, custodian, upload_batch_id)
       VALUES ('Edificio X', 'Pedro', $1) RETURNING id`,
      [batch.id]
    );

    const scannedAt = new Date();
    const updated = await repo.updateLastScan(asset.id, {
      sessionId: session.rows[0].id,
      custodian: 'Pedro',
      location: 'Edificio X',
      scannedAt,
    });

    expect(updated.last_scanned_by).toBe('Pedro');
    expect(updated.last_scanned_location).toBe('Edificio X');
    expect(updated.last_scan_session_id).toBe(session.rows[0].id);
  });
});