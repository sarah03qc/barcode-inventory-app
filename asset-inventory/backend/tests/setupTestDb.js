// Utilidades compartidas para tests que requieren una base de datos real.
// Usa una base de datos separada (inventory_db_test) para nunca tocar
// los datos reales de desarrollo o produccion.

require('dotenv').config({ path: '.env.test' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Corre todas las migraciones reales del proyecto contra la BD de test,
// garantizando que el esquema de test sea identico al de produccion.
async function runMigrations() {
  const migrationsDir = path.join(__dirname, '../src/shared/db/migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
  }
}

// Limpia todas las tablas entre tests para garantizar aislamiento.
// El orden respeta las foreign keys (hijos antes que padres).
async function truncateAll() {
  await pool.query(
    'TRUNCATE scan_records, inventory_sessions, assets, upload_batches RESTART IDENTITY CASCADE'
  );
}

// Inserta un batch de prueba en estado done y retorna su id.
async function seedBatch(overrides = {}) {
  const { rows } = await pool.query(
    `INSERT INTO upload_batches (filename, total_records, status)
     VALUES ($1, $2, $3) RETURNING *`,
    [
      overrides.filename ?? 'test-batch.xlsx',
      overrides.total_records ?? 1,
      overrides.status ?? 'done',
    ]
  );
  return rows[0];
}

// Inserta un activo de prueba y retorna el registro completo.
async function seedAsset(batchId, overrides = {}) {
  const { rows } = await pool.query(
    `INSERT INTO assets (asset_number, description, responsible, functional_center, upload_batch_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      overrides.asset_number ?? '99999',
      overrides.description ?? 'Activo de prueba',
      overrides.responsible ?? 'Responsable Test',
      overrides.functional_center ?? 'CENTRO ACADEMICO DE ALAJUELA',
      batchId,
    ]
  );
  return rows[0];
}

// Inserta una sesion de inventario de prueba.
async function seedSession(batchId, overrides = {}) {
  const { rows } = await pool.query(
    `INSERT INTO inventory_sessions (location, custodian, upload_batch_id, status)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [
      overrides.location ?? 'Ubicacion Test',
      overrides.custodian ?? 'Custodio Test',
      batchId,
      overrides.status ?? 'active',
    ]
  );
  return rows[0];
}

module.exports = { pool, runMigrations, truncateAll, seedBatch, seedAsset, seedSession };