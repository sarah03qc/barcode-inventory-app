const { Pool } = require('pg');
const env = require('../../config/env');

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
});

async function testConnection() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT NOW() AS now');
    console.log(`✓ Database connected — server time: ${rows[0].now}`);
  } finally {
    client.release();
  }
}

module.exports = { pool, testConnection };
