const env = require('./src/config/env');
const { testConnection } = require('./src/shared/db/connection');

async function start() {
  await testConnection();
  console.log(`✓ Server running on port ${env.PORT}`);
}

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
