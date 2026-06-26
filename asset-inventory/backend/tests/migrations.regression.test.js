const fs = require('fs');
const path = require('path');
const { pool, runMigrations, truncateAll, seedBatch, seedAsset, seedSession } = require('./setupTestDb');
const inventoryRepo = require('../src/modules/inventory/inventory.repository');
const assetsRepo = require('../src/modules/assets/assets.repository');

beforeAll(async () => {
  await runMigrations();
});

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await pool.end();
});

// Test de regresion del bug real: la migracion 005 pisaba la trazabilidad
// de escaneo real con datos viejos del Excel cada vez que se corria
// npm run migrate. Este test garantiza que esto nunca vuelva a pasar.
describe('migracion 005 - proteccion de trazabilidad real', () => {
  test('correr la migracion de nuevo NO sobrescribe un activo ya escaneado', async () => {
    const batch = await seedBatch();
    const asset = await seedAsset(batch.id, {
      asset_number: 'REGR-1',
      metadata: null,
    });

    // simular metadata historica del Excel con datos de lectura viejos
    await pool.query(
      `UPDATE assets SET metadata = $1 WHERE id = $2`,
      [JSON.stringify({ responsable_lectura: 'NOMBRE VIEJO DEL EXCEL', ubicacion_fisica: 'LUGAR VIEJO' }), asset.id]
    );

    // simular un escaneo real con la app
    const session = await seedSession(batch.id, { custodian: 'Custodio Real', location: 'Lugar Real' });
    await inventoryRepo.insertScan({
      session_id: session.id, scanned_code: 'REGR-1', asset_id: asset.id, scan_type: 'located',
    });
    await assetsRepo.updateLastScan(asset.id, {
      sessionId: session.id, custodian: 'Custodio Real', location: 'Lugar Real', scannedAt: new Date(),
    });

    // re-correr la migracion 005 especificamente
    const sql = fs.readFileSync(
      path.join(__dirname, '../src/shared/db/migrations/005_add_last_scan_to_assets.sql'),
      'utf8'
    );
    await pool.query(sql);

    const after = await assetsRepo.findByAssetNumberGlobal('REGR-1');
    expect(after.last_scanned_by).toBe('Custodio Real');
    expect(after.last_scanned_location).toBe('Lugar Real');
  });

  test('la migracion SI puebla activos que nunca han sido escaneados realmente', async () => {
    const batch = await seedBatch();
    const asset = await seedAsset(batch.id, { asset_number: 'REGR-2' });
    await pool.query(
      `UPDATE assets SET metadata = $1 WHERE id = $2`,
      [JSON.stringify({ responsable_lectura: 'HISTORICO EXCEL' }), asset.id]
    );

    const sql = fs.readFileSync(
      path.join(__dirname, '../src/shared/db/migrations/005_add_last_scan_to_assets.sql'),
      'utf8'
    );
    await pool.query(sql);

    const after = await assetsRepo.findByAssetNumberGlobal('REGR-2');
    expect(after.last_scanned_by).toBe('HISTORICO EXCEL');
  });
});